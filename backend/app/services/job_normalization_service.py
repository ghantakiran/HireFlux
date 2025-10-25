"""Job data normalization service"""
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from app.schemas.job_feed import (
    JobSource,
    NormalizedJob,
    SalaryRange,
    GreenhouseJob,
    LeverJob,
)


class JobNormalizationService:
    """
    Normalize job data from different sources into a common format.
    Extracts skills, experience requirements, salary, and location details.
    """

    # Common tech skills and their variations
    SKILL_PATTERNS = {
        "python": r"\bpython\b",
        "javascript": r"\b(javascript|js|node\.?js|react|vue|angular)\b",
        "typescript": r"\btypescript\b",
        "java": r"\bjava\b(?!script)",
        "golang": r"\b(golang?|go)\b",
        "rust": r"\brust\b",
        "c++": r"\bc\+\+\b",
        "c#": r"\bc#\b",
        "ruby": r"\bruby\b",
        "php": r"\bphp\b",
        "swift": r"\bswift\b",
        "kotlin": r"\bkotlin\b",
        "sql": r"\b(sql|postgres|mysql|mongodb)\b",
        "aws": r"\b(aws|amazon web services)\b",
        "gcp": r"\b(gcp|google cloud)\b",
        "azure": r"\bazure\b",
        "docker": r"\bdocker\b",
        "kubernetes": r"\b(kubernetes|k8s)\b",
        "terraform": r"\bterraform\b",
        "ci/cd": r"\b(ci/cd|jenkins|github actions|gitlab)\b",
        "machine learning": r"\b(machine learning|ml|deep learning|ai)\b",
        "data science": r"\bdata science\b",
        "react": r"\breact\b",
        "vue": r"\bvue\.?js\b",
        "angular": r"\bangular\b",
        "django": r"\bdjango\b",
        "flask": r"\bflask\b",
        "fastapi": r"\bfastapi\b",
        "graphql": r"\bgraphql\b",
        "rest api": r"\b(rest|restful) api\b",
        "microservices": r"\bmicroservices\b",
        "agile": r"\b(agile|scrum|kanban)\b",
        "git": r"\b(git|github|gitlab|version control)\b",
    }

    # Experience level patterns (checked in order)
    EXPERIENCE_PATTERNS = {
        "principal": r"\b(principal|distinguished|fellow)\b",
        "staff": r"\b(staff|architect)\b",
        "senior": r"\b(senior|sr\.|lead)\b",
        "mid": r"\b(mid[\s\-]level|intermediate)\b",
        "entry": r"\b(entry[\s\-]level|junior|new grad)\b",
    }

    # Salary patterns
    SALARY_PATTERNS = [
        r"\$\s?(\d{1,3}(?:,\d{3})+)\s?[-–to]+\s?\$?\s?(\d{1,3}(?:,\d{3})+)",  # $150,000 - $200,000
        r"\$\s?(\d+)k?\s?[-–to]+\s?\$?\s?(\d+)k?",  # $150k - $200k
        r"(\d{1,3})k\s?[-–to]+\s?(\d{1,3})k",  # 150k - 200k
        r"salary:\s?\$?\s?(\d{1,3}(?:,\d{3})*)\s?[\-–to]+\s?\$?\s?(\d{1,3}(?:,\d{3})*)",
    ]

    def normalize_greenhouse_job(
        self, job: GreenhouseJob, company_name: str
    ) -> NormalizedJob:
        """Normalize a Greenhouse job into common format"""

        description = job.content or ""

        return NormalizedJob(
            external_id=job.id,
            source=JobSource.GREENHOUSE,
            title=job.title,
            company=company_name,
            description=description,
            location=job.location,
            location_type=job.location_type,
            required_skills=self.extract_skills(description, is_required=True),
            preferred_skills=self.extract_skills(description, is_required=False),
            experience_requirement=self.extract_experience_requirement(description),
            experience_min_years=self.extract_years_experience(description)[0],
            experience_max_years=self.extract_years_experience(description)[1],
            experience_level=self.extract_experience_level(description),
            salary=self.extract_salary_range(description),
            department=job.departments[0].name if job.departments else None,
            application_url=job.absolute_url,
            posted_date=datetime.fromisoformat(job.updated_at.replace("Z", "+00:00"))
            if job.updated_at
            else None,
        )

    def normalize_lever_job(self, job: LeverJob, company_name: str) -> NormalizedJob:
        """Normalize a Lever job into common format"""

        # Use plain text description if available
        description = job.descriptionPlain or job.description or ""

        # Combine additional info
        if job.additionalPlain:
            description += "\n\n" + job.additionalPlain

        # Extract department/team
        department = None
        if job.categories:
            category = job.categories[0]
            department = category.team or category.department

        return NormalizedJob(
            external_id=job.id,
            source=JobSource.LEVER,
            title=job.text,
            company=company_name,
            description=description,
            location=job.categories[0].location
            if job.categories and job.categories[0].location
            else "Remote",
            location_type=job.location_type or "onsite",
            required_skills=self.extract_skills(description, is_required=True),
            preferred_skills=self.extract_skills(description, is_required=False),
            experience_requirement=self.extract_experience_requirement(description),
            experience_min_years=self.extract_years_experience(description)[0],
            experience_max_years=self.extract_years_experience(description)[1],
            experience_level=self.extract_experience_level(description),
            salary=self.extract_salary_range(description),
            department=department,
            employment_type=job.employment_type,
            application_url=job.hostedUrl,
            posted_date=datetime.fromtimestamp(job.createdAt / 1000)
            if job.createdAt
            else None,
        )

    def extract_skills(self, text: str, is_required: bool = True) -> List[str]:
        """
        Extract skills from job description

        Args:
            text: Job description text
            is_required: Whether to extract required or preferred skills

        Returns:
            List of extracted skill names
        """
        text_lower = text.lower()
        skills = []

        # Look for explicit required/preferred sections
        if is_required:
            # Find "Required" or "Must Have" section
            required_match = re.search(
                r"(required|must[\s\-]have|qualifications?|requirements?):?\s*(.*?)(?=\n\n|preferred|nice[\s\-]to[\s\-]have|$)",
                text_lower,
                re.DOTALL | re.IGNORECASE,
            )
            search_text = required_match.group(2) if required_match else text_lower
        else:
            # Find "Preferred" or "Nice to Have" section
            preferred_match = re.search(
                r"(preferred|nice[\s\-]to[\s\-]have|bonus|plus):?\s*(.*?)(?=\n\n|$)",
                text_lower,
                re.DOTALL | re.IGNORECASE,
            )
            search_text = preferred_match.group(2) if preferred_match else ""

        # Match skills against patterns
        for skill_name, pattern in self.SKILL_PATTERNS.items():
            if re.search(pattern, search_text, re.IGNORECASE):
                skills.append(skill_name)

        return skills[:20]  # Limit to 20 skills

    def extract_experience_requirement(self, text: str) -> Optional[str]:
        """Extract experience requirement text (e.g., '3-5 years')"""

        text_lower = text.lower()

        # Pattern for "X-Y years" or "X+ years"
        patterns = [
            r"(\d+[\s\-]?\+?\s?years?)",
            r"(\d+[\s\-]to[\s\-]\d+\s?years?)",
            r"(minimum\s+of\s+\d+\s?years?)",
            r"(at\s+least\s+\d+\s?years?)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(1)

        return None

    def extract_years_experience(
        self, text: str
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        Extract minimum and maximum years of experience

        Returns:
            Tuple of (min_years, max_years)
        """
        text_lower = text.lower()

        # Pattern for range: "3-5 years", "3 to 5 years"
        range_match = re.search(r"(\d+)\s*(?:[-–]|to)\s*(\d+)\s?years?", text_lower)
        if range_match:
            return int(range_match.group(1)), int(range_match.group(2))

        # Pattern for minimum: "3+ years", "at least 3 years"
        min_match = re.search(
            r"(\d+)\+\s?years?|(?:minimum|at least)\s+(?:of\s+)?(\d+)\s?years?",
            text_lower,
        )
        if min_match:
            min_years = int(min_match.group(1) or min_match.group(2))
            return min_years, None

        # Pattern for exact: "3 years"
        exact_match = re.search(r"(\d+)\s?years?", text_lower)
        if exact_match:
            years = int(exact_match.group(1))
            return years, years

        return None, None

    def extract_experience_level(self, text: str) -> Optional[str]:
        """Extract experience level (entry, mid, senior, staff, principal)"""

        text_lower = text.lower()

        # Check each level pattern
        for level, pattern in self.EXPERIENCE_PATTERNS.items():
            if re.search(pattern, text_lower):
                return level

        # Infer from years if not explicitly stated
        min_years, max_years = self.extract_years_experience(text)
        if min_years:
            if min_years <= 2:
                return "entry"
            elif min_years <= 5:
                return "mid"
            elif min_years <= 10:
                return "senior"
            elif min_years <= 15:
                return "staff"
            else:
                return "principal"

        return None

    def extract_salary_range(self, text: str) -> Optional[SalaryRange]:
        """Extract salary range from job description"""

        text_lower = text.lower()

        for pattern in self.SALARY_PATTERNS:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                try:
                    min_str = match.group(1).replace(",", "").replace("k", "")
                    max_str = match.group(2).replace(",", "").replace("k", "")

                    # Handle "k" suffix (e.g., "100k" -> 100000)
                    min_salary = int(min_str)
                    max_salary = int(max_str)

                    if min_salary < 1000:  # Likely in thousands
                        min_salary *= 1000
                    if max_salary < 1000:
                        max_salary *= 1000

                    return SalaryRange(
                        min_salary=min_salary, max_salary=max_salary, currency="USD"
                    )
                except (ValueError, IndexError):
                    continue

        return None

    def detect_visa_sponsorship(self, text: str) -> bool:
        """Detect if job offers visa sponsorship"""

        text_lower = text.lower()

        # Negative patterns (no sponsorship)
        no_sponsorship = [
            r"(?:us|united states) work authorization required",
            r"must (?:have|possess) work authorization",
            r"no (?:visa )?sponsorship",
            r"not sponsor",
            r"cannot sponsor",
        ]

        for pattern in no_sponsorship:
            if re.search(pattern, text_lower):
                return False

        # Positive patterns (offers sponsorship)
        sponsorship_keywords = [
            r"(?:will|can|provide|offer).*visa sponsorship",
            r"h1b sponsor(?:ship)?",
            r"eligible for (?:visa |work authorization )?(?:sponsorship|support)",
            r"sponsor work visas",
            r"work authorization support",
        ]

        for keyword in sponsorship_keywords:
            if re.search(keyword, text_lower):
                return True

        return False

    def detect_remote_type(self, location: str, description: str) -> str:
        """
        Detect location type (remote, hybrid, onsite)

        Args:
            location: Location string
            description: Job description

        Returns:
            Location type: "remote", "hybrid", or "onsite"
        """
        combined_text = f"{location} {description}".lower()

        if re.search(r"\b(fully?\s?)?remote\b", combined_text):
            return "remote"
        elif re.search(r"\bhybrid\b", combined_text):
            return "hybrid"
        else:
            return "onsite"
