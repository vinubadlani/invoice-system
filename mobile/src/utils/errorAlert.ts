import { Alert } from 'react-native';

/**
 * Shows the complete error text via a native Alert instead of the toast.
 * Native module rejections (e.g. "Call to function 'X' has been rejected")
 * often continue with a `→ Caused by: ...` line carrying the real reason —
 * the toast truncates at 2 lines and silently hides that detail, so use this
 * for failures worth reading in full (PDF generation, sharing, uploads).
 */
export function showFullError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  Alert.alert(title, message);
}
