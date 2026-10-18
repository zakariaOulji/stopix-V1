import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDialogStore, type DialogButton } from '@/utils/dialog';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Renders dialogs queued by `showAlert` on web (native uses the OS Alert).
 * Mount once, at the root. Tapping the backdrop triggers the cancel button,
 * like a cancelable Android alert.
 */
export function DialogHost() {
  const current = useDialogStore((s) => s.queue[0]);
  const resolve = useDialogStore((s) => s.resolve);

  if (!current) return null;

  const cancel = current.buttons.find((b) => b.style === 'cancel');
  // Cancel last, like iOS action lists; stack vertically beyond two buttons.
  const ordered = [...current.buttons.filter((b) => b !== cancel), ...(cancel ? [cancel] : [])];
  const vertical = ordered.length > 2;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => resolve(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => resolve(cancel)}>
        {/* Inner Pressable swallows taps so they don't reach the backdrop. */}
        <Pressable style={styles.card} onPress={() => {}} accessibilityRole="alert">
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}
          <View style={[styles.buttons, vertical && styles.buttonsVertical]}>
            {ordered.map((b, i) => (
              <DialogAction key={`${b.text}-${i}`} button={b} vertical={vertical} onPress={() => resolve(b)} />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogAction({ button, vertical, onPress }: { button: DialogButton; vertical: boolean; onPress: () => void }) {
  const isCancel = button.style === 'cancel';
  const isDestructive = button.style === 'destructive';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        !vertical && styles.actionRow,
        isCancel ? styles.actionCancel : isDestructive ? styles.actionDestructive : styles.actionDefault,
        pressed && styles.actionPressed,
      ]}
    >
      <Text style={[styles.actionText, isCancel && styles.actionTextCancel]}>{button.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  message: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  buttonsVertical: { flexDirection: 'column' },
  action: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionRow: { flex: 1 },
  actionDefault: { backgroundColor: colors.primary },
  actionDestructive: { backgroundColor: colors.danger },
  actionCancel: { backgroundColor: colors.surfaceHigh },
  actionPressed: { opacity: 0.8 },
  actionText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.background },
  actionTextCancel: { color: colors.white },
});
