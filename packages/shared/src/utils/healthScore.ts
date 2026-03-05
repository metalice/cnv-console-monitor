import type { HealthStatus } from '../schemas/launch';

export function computeHealthFromRate(passRate: number): HealthStatus {
  if (passRate >= 95) return 'green';
  if (passRate >= 80) return 'yellow';
  return 'red';
}

export function healthLabel(health: HealthStatus): string {
  switch (health) {
    case 'green':
      return 'All Green';
    case 'yellow':
      return 'Degraded';
    case 'red':
      return 'Has Failures';
  }
}
