import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogState {
  /** Pending dialogs, shown one at a time (first = visible). */
  queue: DialogRequest[];
  /** Close the visible dialog, then run the pressed button's handler. */
  resolve: (button?: DialogButton) => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  resolve: (button) => {
    set((s) => ({ queue: s.queue.slice(1) }));
    void button?.onPress?.();
  },
}));

/**
 * Drop-in replacement for `Alert.alert` that also works on web, where
 * react-native-web's Alert is a no-op. Native keeps the OS dialog; web renders
 * `DialogHost` (mounted once in the root layout).
 */
export function showAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const request: DialogRequest = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  useDialogStore.setState((s) => ({ queue: [...s.queue, request] }));
}
