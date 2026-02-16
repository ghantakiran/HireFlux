/**
 * Retry Utilities
 * Exponential backoff and retry logic
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  jitter: true,
};

/**
 * Calculate retry delay using exponential backoff
 * @param attemptCount - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function getRetryDelay(attemptCount: number, config: Partial<RetryConfig> = {}): number {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  // Calculate exponential delay
  const exponentialDelay = fullConfig.baseDelay * Math.pow(fullConfig.backoffFactor, attemptCount);

  // Cap at max delay
  let delay = Math.min(exponentialDelay, fullConfig.maxDelay);

  // Add jitter to prevent thundering herd
  if (fullConfig.jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @param shouldRetryFn - Optional function to determine if error should trigger retry
 * @returns Promise resolving to function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetryFn?: (error: any, attempt: number) => boolean
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = shouldRetryFn ? shouldRetryFn(error, attempt) : true;

      // Don't retry if we're on the last attempt or shouldn't retry
      if (attempt === fullConfig.maxAttempts - 1 || !shouldRetry) {
        throw error;
      }

      // Calculate delay and wait
      const delay = getRetryDelay(attempt, fullConfig);

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry state manager for UI components
 */
export class RetryManager {
  private attemptCount = 0;
  private isRetrying = false;
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute function with retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isRetrying) {
      throw new Error('Already retrying');
    }

    this.isRetrying = true;
    try {
      const result = await retryWithBackoff(
        fn,
        this.config,
        (error, attempt) => {
          this.attemptCount = attempt + 1;
          return this.attemptCount < this.config.maxAttempts;
        }
      );
      this.reset();
      return result;
    } catch (error) {
      this.isRetrying = false;
      throw error;
    }
  }

  /**
   * Reset retry state
   */
  reset(): void {
    this.attemptCount = 0;
    this.isRetrying = false;
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(): number {
    return this.attemptCount;
  }

  /**
   * Check if currently retrying
   */
  getIsRetrying(): boolean {
    return this.isRetrying;
  }

  /**
   * Get next retry delay
   */
  getNextDelay(): number {
    return getRetryDelay(this.attemptCount, this.config);
  }

  /**
   * Check if can retry
   */
  canRetry(): boolean {
    return this.attemptCount < this.config.maxAttempts;
  }
}
