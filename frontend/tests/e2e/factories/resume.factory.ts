/**
 * Resume factory for generating test data
 */
import { faker } from '@faker-js/faker';

export interface TestResumeData {
  title: string;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications?: string[];
}

export interface ExperienceItem {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string | null;
  description: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

/**
 * Generate a test resume
 */
export function createTestResume(overrides?: Partial<TestResumeData>): TestResumeData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;

  return {
    title: overrides?.title || `${name} - Software Engineer Resume`,
    personalInfo: {
      name,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number(),
      location: `${faker.location.city()}, ${faker.location.state()}`,
      website: faker.internet.url(),
      linkedin: `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      github: `github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      ...(overrides?.personalInfo || {}),
    },
    summary: overrides?.summary || generateSummary(),
    experience: overrides?.experience || [
      createExperienceItem(),
      createExperienceItem({ endDate: faker.date.past({ years: 2 }).toISOString().split('T')[0] }),
      createExperienceItem({ endDate: faker.date.past({ years: 4 }).toISOString().split('T')[0] }),
    ],
    education: overrides?.education || [createEducationItem()],
    skills: overrides?.skills || [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'PostgreSQL',
      'AWS',
      'Docker',
      'Git',
      'CI/CD',
    ],
    certifications: overrides?.certifications,
  };
}

/**
 * Generate a work experience item
 */
export function createExperienceItem(overrides?: Partial<ExperienceItem>): ExperienceItem {
  const position = overrides?.position || faker.person.jobTitle();
  const company = overrides?.company || faker.company.name();

  return {
    company,
    position,
    location: overrides?.location || `${faker.location.city()}, ${faker.location.state()}`,
    startDate: overrides?.startDate || faker.date.past({ years: 3 }).toISOString().split('T')[0],
    endDate: overrides?.endDate === undefined ? null : overrides.endDate,
    description: overrides?.description || [
      `Led development of ${faker.commerce.product()} resulting in ${faker.number.int({ min: 10, max: 50 })}% increase in user engagement`,
      `Collaborated with cross-functional team of ${faker.number.int({ min: 5, max: 15 })} engineers to deliver key features`,
      `Implemented automated testing reducing deployment time by ${faker.number.int({ min: 20, max: 60 })}%`,
      `Mentored ${faker.number.int({ min: 2, max: 5 })} junior developers in best practices and code reviews`,
    ],
  };
}

/**
 * Generate an education item
 */
export function createEducationItem(overrides?: Partial<EducationItem>): EducationItem {
  return {
    institution: overrides?.institution || faker.company.name() + ' University',
    degree: overrides?.degree || "Bachelor's degree",
    field: overrides?.field || 'Computer Science',
    location: overrides?.location || `${faker.location.city()}, ${faker.location.state()}`,
    graduationDate: overrides?.graduationDate || faker.date.past({ years: 5 }).toISOString().split('T')[0],
    gpa: overrides?.gpa || faker.number.float({ min: 3.0, max: 4.0, fractionDigits: 2 }).toString(),
  };
}

/**
 * Generate a professional summary
 */
export function generateSummary(): string {
  const yearsExperience = faker.number.int({ min: 3, max: 10 });
  const specializations = [
    'full-stack development',
    'backend systems',
    'frontend architecture',
    'cloud infrastructure',
    'microservices',
  ];
  const randomSpecialization = faker.helpers.arrayElement(specializations);

  return `Experienced Software Engineer with ${yearsExperience}+ years of expertise in ${randomSpecialization}. Proven track record of building scalable applications, leading technical initiatives, and mentoring team members. Strong background in modern web technologies and cloud platforms.`;
}

/**
 * Generate a senior engineer resume
 */
export function createSeniorEngineerResume(): TestResumeData {
  return createTestResume({
    title: 'Senior Software Engineer Resume',
    summary:
      'Senior Software Engineer with 8+ years of experience building scalable web applications and distributed systems. Expert in full-stack development, cloud architecture, and team leadership. Proven track record of delivering high-impact projects and mentoring engineering teams.',
    experience: [
      createExperienceItem({
        position: 'Senior Software Engineer',
        description: [
          'Architected and implemented microservices infrastructure serving 1M+ daily active users',
          'Led team of 8 engineers in delivering critical features ahead of schedule',
          'Reduced system latency by 40% through database optimization and caching strategies',
          'Established engineering best practices including code review processes and CI/CD pipelines',
        ],
      }),
      createExperienceItem({
        position: 'Software Engineer',
        endDate: faker.date.past({ years: 3 }).toISOString().split('T')[0],
        description: [
          'Developed and maintained RESTful APIs processing 10M+ requests daily',
          'Implemented real-time features using WebSockets and Redis',
          'Improved test coverage from 40% to 85% through comprehensive unit and integration tests',
        ],
      }),
    ],
    skills: [
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'AWS',
      'Kubernetes',
      'Docker',
      'GraphQL',
      'System Design',
      'Microservices',
      'CI/CD',
      'Team Leadership',
    ],
    certifications: ['AWS Certified Solutions Architect', 'Certified Kubernetes Administrator'],
  });
}

/**
 * Generate a junior engineer resume
 */
export function createJuniorEngineerResume(): TestResumeData {
  return createTestResume({
    title: 'Junior Software Engineer Resume',
    summary:
      'Entry-level Software Engineer with strong foundation in web development and passion for learning new technologies. Recent graduate with hands-on experience through internships and personal projects.',
    experience: [
      createExperienceItem({
        position: 'Software Engineering Intern',
        description: [
          'Developed features for customer-facing web application using React and TypeScript',
          'Collaborated with senior engineers to implement RESTful API endpoints',
          'Participated in code reviews and learned industry best practices',
          'Fixed bugs and improved application performance',
        ],
      }),
    ],
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'HTML',
      'CSS',
      'Node.js',
      'Express',
      'PostgreSQL',
      'Git',
      'REST APIs',
      'Agile',
    ],
  });
}

/**
 * Create multiple test resumes
 */
export function createTestResumes(count: number): TestResumeData[] {
  return Array.from({ length: count }, () => createTestResume());
}
