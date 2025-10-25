"""Resume parsing service"""
import re
import io
from typing import List, Optional
import pdfplumber
import docx

from app.schemas.resume import (
    ParsedResumeData,
    ContactInfo,
    WorkExperience,
    Education,
    Certification,
)


class ResumeParser:
    """Service for parsing resume files (PDF and DOCX)"""

    # Common section headers
    EXPERIENCE_HEADERS = [
        "experience",
        "work history",
        "employment",
        "work experience",
        "professional experience",
    ]
    EDUCATION_HEADERS = ["education", "academic background", "academic history"]
    SKILLS_HEADERS = ["skills", "technical skills", "core competencies", "expertise"]
    CERTIFICATION_HEADERS = [
        "certifications",
        "certificates",
        "professional certifications",
        "licenses",
    ]

    def extract_text_from_pdf(self, file: io.BytesIO) -> str:
        """
        Extract text from PDF file

        Args:
            file: PDF file as BytesIO

        Returns:
            Extracted text

        Raises:
            Exception: If PDF is corrupted or cannot be read
        """
        try:
            with pdfplumber.open(file) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

    def extract_text_from_docx(self, file: io.BytesIO) -> str:
        """
        Extract text from DOCX file

        Args:
            file: DOCX file as BytesIO

        Returns:
            Extracted text

        Raises:
            Exception: If DOCX is corrupted or cannot be read
        """
        try:
            doc = docx.Document(file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")

    def extract_contact_info(self, text: str) -> ContactInfo:
        """
        Extract contact information from resume text

        Args:
            text: Resume text

        Returns:
            ContactInfo object
        """
        contact_info = ContactInfo()

        # Extract email
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info.email = emails[0]

        # Extract phone
        phone_pattern = r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        phones = re.findall(phone_pattern, text)
        if phones:
            contact_info.phone = (
                "".join(phones[0]) if isinstance(phones[0], tuple) else phones[0]
            )

        # Extract LinkedIn
        linkedin_pattern = r"(https?://)?(www\.)?linkedin\.com/in/[A-Za-z0-9_-]+"
        linkedin_matches = re.findall(linkedin_pattern, text)
        if linkedin_matches:
            linkedin_url = (
                "".join(linkedin_matches[0])
                if isinstance(linkedin_matches[0], tuple)
                else linkedin_matches[0]
            )
            if not linkedin_url.startswith("http"):
                linkedin_url = "https://" + linkedin_url
            contact_info.linkedin_url = linkedin_url

        # Extract name (heuristic: first line that looks like a name)
        lines = text.split("\n")
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if line and len(line.split()) >= 2 and len(line) < 50:
                # Looks like a name (2+ words, not too long)
                if not re.search(r"@|http|www|\.com", line.lower()):
                    contact_info.full_name = line
                    break

        # Extract location (look for city, state patterns)
        location_pattern = r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})"
        locations = re.findall(location_pattern, text)
        if locations:
            contact_info.location = locations[0]

        return contact_info

    def extract_work_experience(self, text: str) -> List[WorkExperience]:
        """
        Extract work experience from resume text

        Args:
            text: Resume text

        Returns:
            List of WorkExperience objects
        """
        experiences = []

        # Find experience section
        experience_section = self._extract_section(text, self.EXPERIENCE_HEADERS)
        if not experience_section:
            return experiences

        # Split into individual job entries
        # Look for patterns like company names followed by dates
        lines = experience_section.split("\n")
        current_exp = None

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Check if line contains a date range (potential job entry)
            date_pattern = r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:19|20)\d{2})\s*[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:19|20)\d{2}|Present)"
            date_match = re.search(date_pattern, line, re.IGNORECASE)

            if date_match:
                # Save previous experience if exists
                if current_exp:
                    experiences.append(current_exp)

                # Start new experience
                current_exp = WorkExperience(
                    company="",
                    title="",
                    start_date=date_match.group(1),
                    end_date=date_match.group(2),
                    is_current="present" in date_match.group(2).lower(),
                )

                # Try to extract company and title from surrounding lines
                if i > 0:
                    prev_line = lines[i - 1].strip()
                    if prev_line:
                        # Check if it contains a comma (likely title, company format)
                        if "," in prev_line:
                            parts = prev_line.split(",", 1)
                            current_exp.title = parts[0].strip()
                            current_exp.company = parts[1].strip()
                        else:
                            current_exp.title = prev_line

                if i > 1 and not current_exp.company:
                    prev_prev_line = lines[i - 2].strip()
                    if prev_prev_line and not date_match:
                        current_exp.company = prev_prev_line

            elif current_exp and line.startswith(("•", "-", "*", "·")):
                # Add responsibility
                responsibility = line.lstrip("•-*·").strip()
                if responsibility:
                    current_exp.responsibilities.append(responsibility)

        # Don't forget last experience
        if current_exp:
            experiences.append(current_exp)

        return experiences

    def extract_education(self, text: str) -> List[Education]:
        """
        Extract education from resume text

        Args:
            text: Resume text

        Returns:
            List of Education objects
        """
        education_list = []

        # Find education section
        education_section = self._extract_section(text, self.EDUCATION_HEADERS)
        if not education_section:
            return education_list

        lines = education_section.split("\n")
        current_edu = None

        degree_keywords = [
            "bachelor",
            "master",
            "phd",
            "associate",
            "doctorate",
            "b.s",
            "m.s",
            "b.a",
            "m.a",
            "mba",
        ]

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Check if line contains a degree
            if any(keyword in line.lower() for keyword in degree_keywords):
                if current_edu:
                    education_list.append(current_edu)

                current_edu = Education(institution="", degree=line)

                # Look for institution in next lines
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and not any(
                        keyword in next_line.lower() for keyword in degree_keywords
                    ):
                        current_edu.institution = next_line

            # Check for GPA
            elif current_edu:
                gpa_pattern = r"GPA:?\s*(\d\.\d+(?:/\d\.\d+)?)"
                gpa_match = re.search(gpa_pattern, line, re.IGNORECASE)
                if gpa_match:
                    current_edu.gpa = gpa_match.group(1)

                # Check for dates
                date_pattern = r"((?:19|20)\d{2})\s*[-–—to]+\s*((?:19|20)\d{2})"
                date_match = re.search(date_pattern, line)
                if date_match:
                    current_edu.start_date = date_match.group(1)
                    current_edu.end_date = date_match.group(2)

        if current_edu:
            education_list.append(current_edu)

        return education_list

    def extract_skills(self, text: str) -> List[str]:
        """
        Extract skills from resume text

        Args:
            text: Resume text

        Returns:
            List of skills
        """
        skills = []

        # Find skills section
        skills_section = self._extract_section(text, self.SKILLS_HEADERS)
        if not skills_section:
            return skills

        # Remove bullets and split by common delimiters
        skills_text = re.sub(r"[•\-\*·]", "", skills_section)

        # Split by common delimiters
        skill_items = re.split(r"[,;\n|]", skills_text)

        for skill in skill_items:
            skill = skill.strip()
            if skill and len(skill) > 1 and len(skill) < 50:
                skills.append(skill)

        # Deduplicate (case-insensitive)
        seen = set()
        unique_skills = []
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower not in seen:
                seen.add(skill_lower)
                unique_skills.append(skill)

        return unique_skills

    def extract_certifications(self, text: str) -> List[Certification]:
        """
        Extract certifications from resume text

        Args:
            text: Resume text

        Returns:
            List of Certification objects
        """
        certifications = []

        # Find certification section
        cert_section = self._extract_section(text, self.CERTIFICATION_HEADERS)
        if not cert_section:
            return certifications

        lines = cert_section.split("\n")
        current_cert = None

        for line in lines:
            line = line.strip()
            if not line or line.startswith(tuple(self.CERTIFICATION_HEADERS)):
                continue

            # If line has a date, might be issue date
            date_pattern = r"((?:19|20)\d{2})"
            date_match = re.search(date_pattern, line)

            if date_match and current_cert:
                current_cert.issue_date = date_match.group(1)
                certifications.append(current_cert)
                current_cert = None
            elif not current_cert:
                # Start new certification
                current_cert = Certification(name=line, issuing_organization="Unknown")
                # Check if organization is in the same line
                if "," in line:
                    parts = line.split(",", 1)
                    current_cert.name = parts[0].strip()
                    current_cert.issuing_organization = parts[1].strip()

        if current_cert:
            certifications.append(current_cert)

        return certifications

    def _extract_section(self, text: str, section_headers: List[str]) -> Optional[str]:
        """
        Extract a specific section from resume text

        Args:
            text: Resume text
            section_headers: List of possible section headers

        Returns:
            Section text or None
        """
        text_lower = text.lower()
        lines = text.split("\n")

        # Find section start
        start_idx = None
        for i, line in enumerate(lines):
            line_lower = line.strip().lower()
            if any(
                header == line_lower or line_lower.startswith(header)
                for header in section_headers
            ):
                start_idx = i + 1
                break

        if start_idx is None:
            return None

        # Find section end (next major section or end of document)
        all_headers = (
            self.EXPERIENCE_HEADERS
            + self.EDUCATION_HEADERS
            + self.SKILLS_HEADERS
            + self.CERTIFICATION_HEADERS
        )
        end_idx = len(lines)

        for i in range(start_idx, len(lines)):
            line_lower = lines[i].strip().lower()
            if any(header == line_lower for header in all_headers):
                end_idx = i
                break

        return "\n".join(lines[start_idx:end_idx])

    def parse_resume_text(self, text: str) -> ParsedResumeData:
        """
        Parse resume text and extract all information

        Args:
            text: Resume text

        Returns:
            ParsedResumeData object with extracted information
        """
        if not text or not text.strip():
            return ParsedResumeData()

        return ParsedResumeData(
            contact_info=self.extract_contact_info(text),
            work_experience=self.extract_work_experience(text),
            education=self.extract_education(text),
            skills=self.extract_skills(text),
            certifications=self.extract_certifications(text),
            raw_text=text,
        )
