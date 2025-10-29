/**
 * Page Object Model for Dashboard page
 */
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly header: Locator;
  readonly navigation: Locator;
  readonly resumesLink: Locator;
  readonly jobsLink: Locator;
  readonly applicationsLink: Locator;
  readonly coverLettersLink: Locator;
  readonly interviewBuddyLink: Locator;
  readonly analyticsLink: Locator;
  readonly settingsLink: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.navigation = page.locator('nav[aria-label="Main navigation"]');

    // Navigation links
    this.resumesLink = this.navigation.getByRole('link', { name: /resumes/i });
    this.jobsLink = this.navigation.getByRole('link', { name: /jobs/i });
    this.applicationsLink = this.navigation.getByRole('link', { name: /applications/i });
    this.coverLettersLink = this.navigation.getByRole('link', { name: /cover letters/i });
    this.interviewBuddyLink = this.navigation.getByRole('link', { name: /interview/i });
    this.analyticsLink = this.navigation.getByRole('link', { name: /analytics/i });
    this.settingsLink = this.navigation.getByRole('link', { name: /settings/i });

    this.userMenu = this.header.getByRole('button', { name: /user menu|account/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateToResumes() {
    await this.resumesLink.click();
    await this.page.waitForURL('**/dashboard/resumes**');
  }

  async navigateToJobs() {
    await this.jobsLink.click();
    await this.page.waitForURL('**/dashboard/jobs**');
  }

  async navigateToApplications() {
    await this.applicationsLink.click();
    await this.page.waitForURL('**/dashboard/applications**');
  }

  async navigateToCoverLetters() {
    await this.coverLettersLink.click();
    await this.page.waitForURL('**/dashboard/cover-letters**');
  }

  async navigateToInterviewBuddy() {
    await this.interviewBuddyLink.click();
    await this.page.waitForURL('**/dashboard/interview-buddy**');
  }

  async navigateToAnalytics() {
    await this.analyticsLink.click();
    await this.page.waitForURL('**/dashboard/analytics**');
  }

  async navigateToSettings() {
    await this.settingsLink.click();
    await this.page.waitForURL('**/dashboard/settings**');
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async signOut() {
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: /sign out|log out/i }).click();
    await this.page.waitForURL('/', { timeout: 5000 });
  }

  async getWelcomeMessage(): Promise<string> {
    const welcomeText = this.page.getByText(/welcome|hello/i).first();
    return await welcomeText.textContent() || '';
  }

  async isNavigationVisible(): Promise<boolean> {
    return await this.navigation.isVisible();
  }
}
