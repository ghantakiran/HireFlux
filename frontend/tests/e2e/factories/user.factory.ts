/**
 * User factory for generating test data
 */
import { faker } from '@faker-js/faker';

export interface TestUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
}

export interface TestProfileData {
  targetTitles: string[];
  salaryMin: number;
  salaryMax: number;
  industries: string[];
  skills: string[];
  remote: boolean;
  visaFriendly: boolean;
}

/**
 * Generate a random test user
 */
export function createTestUser(overrides?: Partial<TestUserData>): TestUserData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: overrides?.email || `test.user.${timestamp}.${random}@example.com`,
    password: overrides?.password || 'TestPassword123!',
    firstName: overrides?.firstName || faker.person.firstName(),
    lastName: overrides?.lastName || faker.person.lastName(),
    phone: overrides?.phone || faker.phone.number(),
    location: overrides?.location || `${faker.location.city()}, ${faker.location.state()}`,
    ...overrides,
  };
}

/**
 * Generate multiple test users
 */
export function createTestUsers(count: number, overrides?: Partial<TestUserData>): TestUserData[] {
  return Array.from({ length: count }, () => createTestUser(overrides));
}

/**
 * Generate a test profile with job preferences
 */
export function createTestProfile(overrides?: Partial<TestProfileData>): TestProfileData {
  return {
    targetTitles: overrides?.targetTitles || [
      'Software Engineer',
      'Full Stack Developer',
      'Backend Engineer',
    ],
    salaryMin: overrides?.salaryMin || 80000,
    salaryMax: overrides?.salaryMax || 150000,
    industries: overrides?.industries || ['Technology', 'Software', 'SaaS'],
    skills: overrides?.skills || [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'PostgreSQL',
    ],
    remote: overrides?.remote !== undefined ? overrides.remote : true,
    visaFriendly: overrides?.visaFriendly !== undefined ? overrides.visaFriendly : false,
    ...overrides,
  };
}

/**
 * Create a senior engineer profile
 */
export function createSeniorEngineerProfile(): TestProfileData {
  return createTestProfile({
    targetTitles: ['Senior Software Engineer', 'Staff Engineer', 'Principal Engineer'],
    salaryMin: 150000,
    salaryMax: 250000,
    skills: [
      'System Design',
      'Architecture',
      'Leadership',
      'TypeScript',
      'Python',
      'AWS',
      'Kubernetes',
      'Microservices',
    ],
  });
}

/**
 * Create a junior engineer profile
 */
export function createJuniorEngineerProfile(): TestProfileData {
  return createTestProfile({
    targetTitles: ['Junior Software Engineer', 'Software Engineer I', 'Associate Engineer'],
    salaryMin: 60000,
    salaryMax: 90000,
    skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git', 'REST APIs'],
  });
}

/**
 * Create a product manager profile
 */
export function createProductManagerProfile(): TestProfileData {
  return createTestProfile({
    targetTitles: ['Product Manager', 'Senior Product Manager', 'Product Owner'],
    salaryMin: 120000,
    salaryMax: 180000,
    industries: ['Technology', 'SaaS', 'E-commerce'],
    skills: [
      'Product Strategy',
      'Agile',
      'User Research',
      'Data Analysis',
      'SQL',
      'A/B Testing',
    ],
  });
}

/**
 * Generate realistic email based on name
 */
export function generateEmail(firstName: string, lastName: string, domain: string = 'example.com'): string {
  const timestamp = Date.now();
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@${domain}`;
}

/**
 * Generate strong password
 */
export function generateStrongPassword(): string {
  return faker.internet.password({ length: 16, memorable: false, pattern: /[A-Za-z0-9!@#$%]/ });
}
