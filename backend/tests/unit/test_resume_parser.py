"""Unit tests for resume parsing service"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import io

from app.services.resume_parser import ResumeParser
from app.schemas.resume import ParsedResumeData, ContactInfo, WorkExperience, Education


class TestResumeParserPDF:
    """Test PDF resume parsing"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    @pytest.fixture
    def mock_pdf_file(self):
        """Create a mock PDF file"""
        return io.BytesIO(b"%PDF-1.4 mock pdf content")

    def test_extract_text_from_pdf(self, parser, mock_pdf_file):
        """Test extracting text from PDF"""
        with patch("pdfplumber.open") as mock_pdfplumber:
            mock_page = Mock()
            mock_page.extract_text.return_value = "John Doe\njohn@example.com"
            mock_pdf = Mock()
            mock_pdf.pages = [mock_page]
            mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

            text = parser.extract_text_from_pdf(mock_pdf_file)

            assert "John Doe" in text
            assert "john@example.com" in text
            mock_pdfplumber.assert_called_once()

    def test_extract_text_from_corrupted_pdf(self, parser):
        """Test handling corrupted PDF"""
        corrupted_file = io.BytesIO(b"not a valid pdf")

        with pytest.raises(Exception):
            parser.extract_text_from_pdf(corrupted_file)


class TestResumeParserDOCX:
    """Test DOCX resume parsing"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_text_from_docx(self, parser):
        """Test extracting text from DOCX"""
        mock_file = io.BytesIO()

        with patch("docx.Document") as mock_doc:
            mock_paragraph1 = Mock()
            mock_paragraph1.text = "Jane Smith"
            mock_paragraph2 = Mock()
            mock_paragraph2.text = "jane@example.com"
            mock_doc.return_value.paragraphs = [mock_paragraph1, mock_paragraph2]

            text = parser.extract_text_from_docx(mock_file)

            assert "Jane Smith" in text
            assert "jane@example.com" in text

    def test_extract_text_from_corrupted_docx(self, parser):
        """Test handling corrupted DOCX"""
        corrupted_file = io.BytesIO(b"not a valid docx")

        with pytest.raises(Exception):
            parser.extract_text_from_docx(corrupted_file)


class TestContactInfoExtraction:
    """Test contact information extraction"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_email(self, parser):
        """Test email extraction"""
        text = "Contact me at john.doe@example.com for more information"
        contact_info = parser.extract_contact_info(text)

        assert contact_info.email == "john.doe@example.com"

    def test_extract_multiple_emails(self, parser):
        """Test extracting first email when multiple exist"""
        text = "Email: john@example.com or jane@example.com"
        contact_info = parser.extract_contact_info(text)

        assert contact_info.email in ["john@example.com", "jane@example.com"]

    def test_extract_phone(self, parser):
        """Test phone number extraction"""
        text = "Phone: (555) 123-4567"
        contact_info = parser.extract_contact_info(text)

        assert contact_info.phone is not None
        assert "555" in contact_info.phone

    def test_extract_linkedin(self, parser):
        """Test LinkedIn URL extraction"""
        text = "LinkedIn: https://www.linkedin.com/in/johndoe"
        contact_info = parser.extract_contact_info(text)

        assert contact_info.linkedin_url == "https://www.linkedin.com/in/johndoe"

    def test_extract_name(self, parser):
        """Test name extraction"""
        text = "John Doe\nSoftware Engineer\njohn@example.com"
        contact_info = parser.extract_contact_info(text)

        assert contact_info.full_name is not None

    def test_extract_location(self, parser):
        """Test location extraction"""
        text = "John Doe\nNew York, NY\njohn@example.com"
        contact_info = parser.extract_contact_info(text)

        assert "New York" in str(contact_info.location or "")


class TestWorkExperienceExtraction:
    """Test work experience extraction"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_work_experience(self, parser):
        """Test extracting work experience"""
        text = """
        EXPERIENCE
        Software Engineer, Google LLC
        January 2020 - Present
        • Developed scalable web applications
        • Collaborated with cross-functional teams
        """
        work_experience = parser.extract_work_experience(text)

        assert len(work_experience) > 0
        assert any("Google" in exp.company for exp in work_experience)

    def test_extract_multiple_jobs(self, parser):
        """Test extracting multiple job experiences"""
        text = """
        EXPERIENCE
        Senior Developer, Microsoft
        2021 - Present
        • Led team of 5 developers

        Software Engineer, Amazon
        2018 - 2021
        • Built microservices
        """
        work_experience = parser.extract_work_experience(text)

        assert len(work_experience) >= 2

    def test_extract_dates(self, parser):
        """Test extracting employment dates"""
        text = """
        Software Engineer, Apple Inc
        June 2019 - December 2022
        """
        work_experience = parser.extract_work_experience(text)

        assert len(work_experience) > 0
        exp = work_experience[0]
        assert exp.start_date is not None or exp.end_date is not None

    def test_extract_current_job(self, parser):
        """Test identifying current job"""
        text = """
        Software Engineer, Meta
        2022 - Present
        """
        work_experience = parser.extract_work_experience(text)

        assert len(work_experience) > 0
        assert work_experience[0].is_current or "Present" in str(
            work_experience[0].end_date
        )


class TestEducationExtraction:
    """Test education extraction"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_education(self, parser):
        """Test extracting education"""
        text = """
        EDUCATION
        Bachelor of Science in Computer Science
        Stanford University
        2016 - 2020
        """
        education = parser.extract_education(text)

        assert len(education) > 0
        assert "Stanford" in education[0].institution

    def test_extract_degree(self, parser):
        """Test extracting degree information"""
        text = """
        Master of Science in Computer Science
        MIT
        2020 - 2022
        """
        education = parser.extract_education(text)

        assert len(education) > 0
        assert "Master" in education[0].degree or "M.S" in education[0].degree

    def test_extract_gpa(self, parser):
        """Test extracting GPA"""
        text = """
        Bachelor of Science
        Harvard University
        GPA: 3.8/4.0
        """
        education = parser.extract_education(text)

        if len(education) > 0 and education[0].gpa:
            assert "3.8" in education[0].gpa


class TestSkillsExtraction:
    """Test skills extraction"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_skills(self, parser):
        """Test extracting skills"""
        text = """
        SKILLS
        Python, Java, JavaScript, React, Node.js, Docker, Kubernetes
        """
        skills = parser.extract_skills(text)

        assert len(skills) > 0
        assert "Python" in skills or "python" in [s.lower() for s in skills]

    def test_extract_skills_from_bullets(self, parser):
        """Test extracting skills from bullet points"""
        text = """
        TECHNICAL SKILLS
        • Programming: Python, Java, C++
        • Web: React, Node.js, Django
        • Tools: Git, Docker, AWS
        """
        skills = parser.extract_skills(text)

        assert len(skills) > 0

    def test_deduplicate_skills(self, parser):
        """Test removing duplicate skills"""
        text = """
        SKILLS
        Python, python, PYTHON, Java, java
        """
        skills = parser.extract_skills(text)

        python_count = sum(1 for s in skills if s.lower() == "python")
        assert python_count <= 1


class TestCertificationExtraction:
    """Test certification extraction"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_extract_certifications(self, parser):
        """Test extracting certifications"""
        text = """
        CERTIFICATIONS
        AWS Certified Solutions Architect
        Amazon Web Services, 2022
        """
        certifications = parser.extract_certifications(text)

        assert len(certifications) > 0
        assert "AWS" in certifications[0].name


class TestFullResumeParser:
    """Test complete resume parsing"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    @pytest.fixture
    def sample_resume_text(self):
        return """
        John Doe
        john.doe@example.com | (555) 123-4567 | New York, NY
        linkedin.com/in/johndoe

        SUMMARY
        Experienced software engineer with 5+ years in full-stack development

        EXPERIENCE
        Senior Software Engineer, Google LLC
        January 2021 - Present
        • Led development of cloud-native applications
        • Mentored junior developers

        Software Engineer, Microsoft
        June 2018 - December 2020
        • Developed enterprise software solutions

        EDUCATION
        Bachelor of Science in Computer Science
        Stanford University
        2014 - 2018
        GPA: 3.9/4.0

        SKILLS
        Python, Java, JavaScript, React, Node.js, Docker, AWS

        CERTIFICATIONS
        AWS Certified Developer
        Amazon Web Services, 2021
        """

    def test_parse_complete_resume(self, parser, sample_resume_text):
        """Test parsing complete resume"""
        parsed_data = parser.parse_resume_text(sample_resume_text)

        assert isinstance(parsed_data, ParsedResumeData)
        assert parsed_data.contact_info.email == "john.doe@example.com"
        assert len(parsed_data.work_experience) >= 2
        assert len(parsed_data.education) >= 1
        assert len(parsed_data.skills) > 0

    def test_parse_minimal_resume(self, parser):
        """Test parsing resume with minimal information"""
        minimal_text = """
        Jane Smith
        jane@example.com
        """
        parsed_data = parser.parse_resume_text(minimal_text)

        assert isinstance(parsed_data, ParsedResumeData)
        assert parsed_data.contact_info.email == "jane@example.com"

    def test_parse_returns_raw_text(self, parser, sample_resume_text):
        """Test that parser stores raw text"""
        parsed_data = parser.parse_resume_text(sample_resume_text)

        assert parsed_data.raw_text is not None
        assert len(parsed_data.raw_text) > 0


class TestResumeParserErrors:
    """Test error handling in parser"""

    @pytest.fixture
    def parser(self):
        return ResumeParser()

    def test_parse_empty_text(self, parser):
        """Test parsing empty text"""
        parsed_data = parser.parse_resume_text("")

        assert isinstance(parsed_data, ParsedResumeData)
        # Should return empty but valid structure

    def test_parse_invalid_format(self, parser):
        """Test parsing text with invalid format"""
        invalid_text = "asjdkljaskld jklj lkjsadlkj asldkj"
        parsed_data = parser.parse_resume_text(invalid_text)

        assert isinstance(parsed_data, ParsedResumeData)
        # Should handle gracefully without crashing
