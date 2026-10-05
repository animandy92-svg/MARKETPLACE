export function authDestination(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') &&
    !value.startsWith('//') && !/[\\\u0000-\u0020]/.test(value) ? value : '/';
}

export function googleAuthErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case 'auth/popup-blocked':
      return 'Allow popups for this website, then try Continue with Google again.';
    case 'auth/account-exists-with-different-credential':
      return 'Sign in with your existing account method for this email.';
    case 'auth/network-request-failed':
      return 'Check your internet connection and try again.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
      return 'Google sign-in is temporarily unavailable. Please use email and password.';
    default:
      return 'Could not sign in with Google. Please try again.';
  }
}
