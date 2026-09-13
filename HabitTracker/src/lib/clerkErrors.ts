/**
 * Turns a Clerk error (from signUp/signIn .create/.attempt* calls) into a
 * user-facing message. Shared by sign-up, sign-in, and forgot-password so
 * the same known error codes are handled consistently everywhere.
 */
export function parseClerkError(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    const e = err.errors[0];
    // Bot protection (Smart CAPTCHA) can't be completed in Expo/React Native.
    // It must be disabled in the Clerk Dashboard → Attack Protection.
    if (e.code === 'captcha_missing_token' || e.code === 'captcha_invalid') {
      return 'Sign-up is blocked by Clerk bot protection. Disable "Bot sign-up protection" in the Clerk Dashboard (User & Authentication → Attack Protection).';
    }
    return e.longMessage || e.message || 'Authentication error.';
  }
  if (err.longMessage) return err.longMessage;
  if (typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return 'Something went wrong. Please check your inputs.';
}
