import { Alert, Platform } from 'react-native';

function runConfirm(onConfirm) {
  try {
    const result = onConfirm?.();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (error) {
    // No-op: caller handles user-facing errors if needed.
  }
}

export function confirmLogout({
  title = 'Logout',
  message = 'Do you want to end your session?',
  webMessage,
  onConfirm,
  alert = Alert,
  platform = Platform,
}) {
  if (platform?.OS === 'web') {
    const confirmer = typeof globalThis.confirm === 'function' ? globalThis.confirm : null;
    const accepted = confirmer ? confirmer(webMessage || message) : true;
    if (!accepted) return;
    runConfirm(onConfirm);
    return;
  }

  alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Logout',
      style: 'destructive',
      onPress: () => runConfirm(onConfirm),
    },
  ]);
}
