/**
 * Page Object Model for Authentication pages (Sign In / Sign Up)
 */
import { Page, Locator } from '@playwright/test';

export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly googleButton: Locator;
  readonly linkedInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.googleButton = page.getByRole('button', { name: /continue with google/i });
    this.linkedInButton = page.getByRole('button', { name: /continue with linkedin/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot.*password/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.errorMessage = page.locator('[role="alert"], .error-message');
  }

  async goto() {
    await this.page.goto('/signin');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async signInWithGoogle() {
    await this.googleButton.click();
  }

  async signInWithLinkedIn() {
    await this.linkedInButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async navigateToSignUp() {
    await this.signUpLink.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}

export class SignUpPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly signUpButton: Locator;
  readonly googleButton: Locator;
  readonly linkedInButton: Locator;
  readonly signInLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByLabel(/first name/i);
    this.lastNameInput = page.getByLabel(/last name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/^password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
    this.signUpButton = page.getByRole('button', { name: /sign up|create account/i });
    this.googleButton = page.getByRole('button', { name: /continue with google/i });
    this.linkedInButton = page.getByRole('button', { name: /continue with linkedin/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
    this.errorMessage = page.locator('[role="alert"], .error-message');
  }

  async goto() {
    await this.page.goto('/signup');
  }

  async signUp(data: {
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
  }) {
    if (data.firstName) {
      await this.firstNameInput.fill(data.firstName);
    }
    if (data.lastName) {
      await this.lastNameInput.fill(data.lastName);
    }

    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    if (data.confirmPassword) {
      await this.confirmPasswordInput.fill(data.confirmPassword);
    }

    if (data.acceptTerms !== false) {
      const isVisible = await this.termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        await this.termsCheckbox.check();
      }
    }

    await this.signUpButton.click();
  }

  async signUpWithGoogle() {
    await this.googleButton.click();
  }

  async signUpWithLinkedIn() {
    await this.linkedInButton.click();
  }

  async navigateToSignIn() {
    await this.signInLink.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getValidationError(field: string): Promise<string> {
    const error = this.page.locator(`[name="${field}"] ~ .error-message, [id="${field}-error"]`);
    return await error.textContent() || '';
  }
}

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToSignInLink: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.submitButton = page.getByRole('button', { name: /send reset|reset password/i });
    this.backToSignInLink = page.getByRole('link', { name: /back to sign in/i });
    this.successMessage = page.locator('[role="status"], .success-message');
    this.errorMessage = page.locator('[role="alert"], .error-message');
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async backToSignIn() {
    await this.backToSignInLink.click();
  }

  async getSuccessMessage(): Promise<string> {
    return await this.successMessage.textContent() || '';
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}
