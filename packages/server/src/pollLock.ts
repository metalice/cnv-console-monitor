let polling = false;

export function isPollLocked(): boolean {
  return polling;
}

export function lockPoll(): boolean {
  if (polling) return false;
  polling = true;
  return true;
}

export function unlockPoll(): void {
  polling = false;
}
