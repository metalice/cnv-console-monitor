let polling = false;

export const isPollLocked = (): boolean => {
  return polling;
}

export const lockPoll = (): boolean => {
  if (polling) return false;
  polling = true;
  return true;
}

export const unlockPoll = (): void => {
  polling = false;
}
