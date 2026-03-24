export class RateLimiter {
  private consecutiveRateLimits = 0;
  private currentConcurrency: number;
  private readonly maxConcurrency: number;
  private readonly minConcurrency = 1;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = maxConcurrency;
  }

  getBackoffMs(): number {
    const base = 1000;
    const max = 60000;
    return Math.min(max, base * 2 ** Math.min(this.consecutiveRateLimits - 3, 6));
  }

  getConcurrency(): number {
    return this.currentConcurrency;
  }

  onRateLimit(): void {
    this.consecutiveRateLimits++;
    this.currentConcurrency = Math.max(
      this.minConcurrency,
      Math.floor(this.currentConcurrency / 2),
    );
  }

  onSuccess(): void {
    this.consecutiveRateLimits = 0;
    if (this.currentConcurrency < this.maxConcurrency) {
      this.currentConcurrency = Math.min(this.maxConcurrency, this.currentConcurrency + 2);
    }
  }

  reset(): void {
    this.consecutiveRateLimits = 0;
    this.currentConcurrency = this.maxConcurrency;
  }

  shouldBackoff(): boolean {
    return this.consecutiveRateLimits > 3;
  }
}
