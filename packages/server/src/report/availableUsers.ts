type AvailableUsersCache = {
  githubUsers: string[];
  gitlabUsers: string[];
};

let cache: AvailableUsersCache = {
  githubUsers: [],
  gitlabUsers: [],
};

export const setAvailableUsers = (users: AvailableUsersCache): void => {
  cache = { ...users };
};

export const getAvailableUsers = (): AvailableUsersCache => ({ ...cache });
