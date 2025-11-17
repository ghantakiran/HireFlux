"""Job Templates Seed Data (Issue #24)

Seeds public job templates for common roles.

Usage:
    python -m app.db.seeds.job_templates_seed

This script creates 8+ default public templates:
- Software Engineer (Entry, Mid, Senior, Lead)
- Product Manager
- UX Designer
- Sales Representative
- Marketing Manager
- Data Scientist
- DevOps Engineer
- Customer Support

All templates are marked as PUBLIC visibility with company_id=None.
"""

import sys
import os
from sqlalchemy.orm import Session

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from app.db.session import SessionLocal
from app.services.job_template_service import JobTemplateService
from app.schemas.job_template import (
    JobTemplateCreate,
    TemplateVisibility,
    TemplateCategory,
)


# ============================================================================
# Public Template Definitions
# ============================================================================

PUBLIC_TEMPLATES = [
    # Software Engineer - Entry Level
    {
        "name": "Software Engineer (Entry Level)",
        "category": TemplateCategory.ENGINEERING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Entry-Level Software Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "experience_level": "entry",
        "description": "We're seeking a motivated entry-level software engineer to join our growing engineering team. You'll work on real-world projects, learn from experienced engineers, and contribute to building scalable software solutions.",
        "requirements": [
            "Bachelor's degree in Computer Science or related field (or equivalent experience)",
            "0-2 years of professional software development experience",
            "Familiarity with at least one programming language (Python, Java, JavaScript, etc.)",
            "Understanding of data structures and algorithms",
            "Strong problem-solving skills and attention to detail",
            "Excellent communication and teamwork abilities",
        ],
        "responsibilities": [
            "Write clean, maintainable, and efficient code",
            "Participate in code reviews and provide constructive feedback",
            "Collaborate with cross-functional teams to deliver features",
            "Debug and troubleshoot software issues",
            "Learn and adopt best practices in software development",
            "Contribute to technical documentation",
        ],
        "skills": [
            "Python",
            "JavaScript",
            "Git",
            "SQL",
            "REST APIs",
            "Agile methodology",
        ],
    },

    # Software Engineer - Mid Level
    {
        "name": "Software Engineer (Mid Level)",
        "category": TemplateCategory.ENGINEERING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Mid-Level Software Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Join our engineering team as a mid-level software engineer. You'll design and implement features, mentor junior engineers, and play a key role in technical decision-making.",
        "requirements": [
            "3-5 years of professional software development experience",
            "Strong proficiency in one or more programming languages",
            "Experience with modern web frameworks and databases",
            "Solid understanding of software design patterns and principles",
            "Experience with cloud platforms (AWS, GCP, or Azure)",
            "Proven track record of delivering complex features",
        ],
        "responsibilities": [
            "Design, develop, and deploy scalable software solutions",
            "Lead technical discussions and contribute to architecture decisions",
            "Mentor junior engineers and conduct code reviews",
            "Optimize application performance and scalability",
            "Collaborate with product managers to define requirements",
            "Participate in on-call rotation for production support",
        ],
        "skills": [
            "Python",
            "React",
            "Node.js",
            "PostgreSQL",
            "AWS",
            "Docker",
            "Kubernetes",
            "CI/CD",
        ],
    },

    # Software Engineer - Senior
    {
        "name": "Senior Software Engineer",
        "category": TemplateCategory.ENGINEERING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Senior Software Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "experience_level": "senior",
        "description": "We're looking for a senior software engineer to drive technical excellence, architect scalable systems, and lead critical initiatives. You'll be a technical leader and mentor to the team.",
        "requirements": [
            "6+ years of professional software development experience",
            "Expert-level proficiency in multiple programming languages",
            "Deep understanding of system design and architecture",
            "Experience leading technical projects from conception to delivery",
            "Strong knowledge of distributed systems and microservices",
            "Excellent communication skills with technical and non-technical stakeholders",
        ],
        "responsibilities": [
            "Architect and design complex, scalable systems",
            "Lead technical initiatives and drive engineering best practices",
            "Mentor engineers and conduct architecture reviews",
            "Make critical technical decisions with long-term impact",
            "Collaborate with leadership on technical strategy",
            "Identify and resolve performance bottlenecks",
            "Champion engineering culture and continuous improvement",
        ],
        "skills": [
            "Python",
            "Go",
            "React",
            "TypeScript",
            "PostgreSQL",
            "Redis",
            "AWS",
            "System design",
            "Microservices",
            "Performance optimization",
        ],
    },

    # Engineering Lead
    {
        "name": "Engineering Lead / Tech Lead",
        "category": TemplateCategory.ENGINEERING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Engineering Lead",
        "department": "Engineering",
        "employment_type": "full_time",
        "experience_level": "lead",
        "description": "Lead a high-performing engineering team and drive technical excellence. You'll balance hands-on technical work with team leadership, project management, and strategic planning.",
        "requirements": [
            "8+ years of software engineering experience",
            "2+ years in technical leadership or management role",
            "Proven track record of leading successful engineering teams",
            "Expert-level system design and architecture skills",
            "Experience managing project timelines and deliverables",
            "Strong mentorship and people development skills",
        ],
        "responsibilities": [
            "Lead and manage a team of software engineers",
            "Define technical vision and roadmap for the team",
            "Drive hiring, onboarding, and professional development",
            "Conduct 1:1s and performance reviews",
            "Partner with product and design on feature planning",
            "Ensure code quality, testing, and operational excellence",
            "Remove blockers and facilitate team productivity",
        ],
        "skills": [
            "Python",
            "React",
            "System architecture",
            "Team leadership",
            "Project management",
            "Agile/Scrum",
            "Hiring & mentorship",
            "Technical strategy",
        ],
    },

    # Product Manager
    {
        "name": "Product Manager",
        "category": TemplateCategory.PRODUCT,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Product Manager",
        "department": "Product",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Drive product strategy and execution. You'll work cross-functionally with engineering, design, and business teams to build products customers love.",
        "requirements": [
            "3-5 years of product management experience",
            "Proven track record of shipping successful products",
            "Strong analytical and problem-solving skills",
            "Experience with user research and data-driven decision making",
            "Excellent communication and stakeholder management",
            "Technical background or ability to work closely with engineers",
        ],
        "responsibilities": [
            "Define product vision, strategy, and roadmap",
            "Gather and prioritize product requirements",
            "Collaborate with engineering and design on feature development",
            "Conduct user research and analyze product metrics",
            "Write clear product specifications and user stories",
            "Launch products and measure success metrics",
            "Present updates to leadership and stakeholders",
        ],
        "skills": [
            "Product strategy",
            "User research",
            "Data analysis",
            "Roadmap planning",
            "Agile/Scrum",
            "SQL",
            "Stakeholder management",
            "Jira",
        ],
    },

    # UX Designer
    {
        "name": "UX/UI Designer",
        "category": TemplateCategory.DESIGN,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "UX/UI Designer",
        "department": "Design",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Create intuitive, beautiful user experiences. You'll own the design process from research to high-fidelity mockups, working closely with product and engineering.",
        "requirements": [
            "3-5 years of UX/UI design experience",
            "Strong portfolio demonstrating user-centered design",
            "Proficiency in Figma, Sketch, or similar design tools",
            "Experience with user research and usability testing",
            "Understanding of design systems and component libraries",
            "Excellent visual design and typography skills",
        ],
        "responsibilities": [
            "Conduct user research and create user personas",
            "Design wireframes, mockups, and interactive prototypes",
            "Create and maintain design systems",
            "Collaborate with product and engineering teams",
            "Conduct usability testing and iterate on designs",
            "Present design rationale and gather feedback",
            "Ensure consistent user experience across products",
        ],
        "skills": [
            "Figma",
            "User research",
            "Wireframing",
            "Prototyping",
            "Design systems",
            "HTML/CSS",
            "User testing",
            "Visual design",
        ],
    },

    # Sales Representative
    {
        "name": "Sales Representative",
        "category": TemplateCategory.SALES,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Sales Representative",
        "department": "Sales",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Drive revenue growth by building relationships with prospects and closing deals. You'll manage the full sales cycle from prospecting to closing.",
        "requirements": [
            "2-4 years of B2B sales experience",
            "Proven track record of meeting/exceeding quota",
            "Strong negotiation and closing skills",
            "Experience with CRM tools (Salesforce, HubSpot)",
            "Excellent communication and presentation skills",
            "Self-motivated with entrepreneurial mindset",
        ],
        "responsibilities": [
            "Prospect and qualify new sales leads",
            "Conduct product demonstrations and presentations",
            "Manage sales pipeline and forecast accurately",
            "Negotiate contracts and close deals",
            "Build long-term relationships with customers",
            "Collaborate with marketing on lead generation",
            "Achieve monthly and quarterly sales targets",
        ],
        "skills": [
            "B2B sales",
            "CRM (Salesforce)",
            "Prospecting",
            "Negotiation",
            "Presentation",
            "Pipeline management",
            "Account management",
        ],
    },

    # Marketing Manager
    {
        "name": "Marketing Manager",
        "category": TemplateCategory.MARKETING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Marketing Manager",
        "department": "Marketing",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Lead marketing initiatives to drive brand awareness and customer acquisition. You'll develop and execute multi-channel marketing campaigns.",
        "requirements": [
            "4-6 years of marketing experience",
            "Proven success with digital marketing campaigns",
            "Experience with marketing automation and analytics tools",
            "Strong content creation and copywriting skills",
            "Data-driven approach to campaign optimization",
            "Project management and cross-functional collaboration",
        ],
        "responsibilities": [
            "Develop and execute marketing strategies",
            "Manage multi-channel campaigns (email, social, content, paid)",
            "Create compelling marketing content and messaging",
            "Analyze campaign performance and optimize ROI",
            "Manage marketing budget and vendor relationships",
            "Collaborate with sales on lead generation",
            "Track and report on marketing KPIs",
        ],
        "skills": [
            "Digital marketing",
            "Content marketing",
            "SEO/SEM",
            "Marketing automation",
            "Google Analytics",
            "Email marketing",
            "Social media",
            "Copywriting",
        ],
    },

    # Data Scientist
    {
        "name": "Data Scientist",
        "category": TemplateCategory.DATA,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Data Scientist",
        "department": "Data",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Turn data into actionable insights. You'll build ML models, conduct analyses, and drive data-informed decision making across the organization.",
        "requirements": [
            "3-5 years of data science experience",
            "Strong proficiency in Python and data science libraries",
            "Experience with machine learning and statistical modeling",
            "Solid understanding of SQL and data warehousing",
            "Ability to communicate complex insights to non-technical stakeholders",
            "Advanced degree in Computer Science, Statistics, or related field",
        ],
        "responsibilities": [
            "Build and deploy machine learning models",
            "Conduct exploratory data analysis and A/B tests",
            "Develop predictive models and recommendation systems",
            "Create dashboards and visualizations",
            "Collaborate with engineering on data infrastructure",
            "Present findings and recommendations to leadership",
            "Mentor junior data team members",
        ],
        "skills": [
            "Python",
            "SQL",
            "Pandas",
            "Scikit-learn",
            "TensorFlow",
            "Statistics",
            "Machine learning",
            "Data visualization",
            "A/B testing",
        ],
    },

    # DevOps Engineer
    {
        "name": "DevOps Engineer",
        "category": TemplateCategory.ENGINEERING,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "DevOps Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "experience_level": "mid",
        "description": "Build and maintain scalable infrastructure. You'll automate deployments, improve reliability, and ensure our systems run smoothly at scale.",
        "requirements": [
            "3-5 years of DevOps/SRE experience",
            "Strong knowledge of cloud platforms (AWS, GCP, or Azure)",
            "Experience with containerization (Docker, Kubernetes)",
            "Proficiency in scripting (Python, Bash, etc.)",
            "Understanding of CI/CD pipelines and automation",
            "Experience with infrastructure as code (Terraform, CloudFormation)",
        ],
        "responsibilities": [
            "Design and maintain cloud infrastructure",
            "Build and optimize CI/CD pipelines",
            "Implement monitoring, logging, and alerting systems",
            "Automate deployment and infrastructure management",
            "Ensure system reliability, security, and scalability",
            "Troubleshoot production incidents",
            "Collaborate with engineering teams on infrastructure needs",
        ],
        "skills": [
            "AWS/GCP/Azure",
            "Kubernetes",
            "Docker",
            "Terraform",
            "CI/CD",
            "Python",
            "Linux",
            "Monitoring",
            "Security",
        ],
    },

    # Customer Support
    {
        "name": "Customer Support Specialist",
        "category": TemplateCategory.CUSTOMER_SUCCESS,
        "visibility": TemplateVisibility.PUBLIC,
        "title": "Customer Support Specialist",
        "department": "Customer Success",
        "employment_type": "full_time",
        "experience_level": "entry",
        "description": "Provide exceptional support to our customers. You'll help users solve problems, answer questions, and ensure customer satisfaction.",
        "requirements": [
            "1-3 years of customer support experience",
            "Excellent written and verbal communication skills",
            "Strong problem-solving and troubleshooting abilities",
            "Empathy and patience when working with customers",
            "Experience with support ticketing systems",
            "Technical aptitude and willingness to learn",
        ],
        "responsibilities": [
            "Respond to customer inquiries via email, chat, and phone",
            "Troubleshoot technical issues and provide solutions",
            "Document customer interactions and maintain knowledge base",
            "Escalate complex issues to appropriate teams",
            "Identify patterns in customer feedback",
            "Contribute to improving support processes",
            "Achieve customer satisfaction and response time targets",
        ],
        "skills": [
            "Customer service",
            "Technical troubleshooting",
            "Communication",
            "Zendesk/Intercom",
            "Documentation",
            "CRM",
            "Problem-solving",
        ],
    },
]


def seed_job_templates():
    """Seed public job templates"""
    db: Session = SessionLocal()
    template_service = JobTemplateService(db)

    print("🌱 Seeding public job templates...")
    print(f"📝 Creating {len(PUBLIC_TEMPLATES)} templates...")

    created_count = 0
    skipped_count = 0

    for template_data in PUBLIC_TEMPLATES:
        try:
            # Check if template already exists (by name)
            existing = db.query(JobTemplate).filter(
                JobTemplate.name == template_data["name"]
            ).first()

            if existing:
                print(f"⏭️  Skipped: '{template_data['name']}' (already exists)")
                skipped_count += 1
                continue

            # Create template
            template_create = JobTemplateCreate(**template_data)
            template = template_service.create_template(
                template_data=template_create,
                company_id=None,  # Public template
            )

            print(f"✅ Created: '{template.name}' ({template.category})")
            created_count += 1

        except Exception as e:
            print(f"❌ Error creating '{template_data['name']}': {str(e)}")

    db.close()

    print(f"\n✅ Seeding complete!")
    print(f"   📊 Created: {created_count}")
    print(f"   ⏭️  Skipped: {skipped_count}")
    print(f"   📚 Total templates: {created_count + skipped_count}")


if __name__ == "__main__":
    # Import here to avoid circular import
    from app.db.models.job_template import JobTemplate

    seed_job_templates()
