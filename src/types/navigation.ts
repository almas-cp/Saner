export type RootStackParamList = {
  '(auth)': undefined;
  '(main)': undefined;
};

export type MainTabParamList = {
  index: undefined;
  discover: undefined;
  breath: {
    exerciseId?: string;
  };
  write: undefined;
  chat: {
    userId?: string;
  };
  profile: {
    userId?: string;
  };
};

export type AuthStackParamList = {
  login: undefined;
  signup: undefined;
};

// Route name constants
export const ROUTES = {
  AUTH: {
    LOGIN: '/(auth)/login',
    SIGNUP: '/(auth)/signup',
  },
  MAIN: {
    DISCOVER: '/(main)/discover',
    BREATH: '/(main)/breath',
    WRITE: '/(main)/write',
    CHAT: '/(main)/chat',
    PROFILE: '/(main)/profile',
  },
} as const; 