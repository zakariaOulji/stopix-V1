import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTourneeStore } from '@/stores';
import { colors, radius, spacing, textStyles } from '@/theme';

/**
 * Global banner shown when a server write failed (delivery, proof, reorder…).
 * The local state is already updated: this warns the driver that the server
 * did not get it. Tap to dismiss.
 */
export function SyncErrorBanner() {
  const syncError = useTourneeStore((s) => s.syncError);
  const clear = useTourneeStore((s) => s.clearSyncError);
  const insets = useSafeAreaInsets();

  if (!syncError) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Pressable
        onPress={clear}
        accessibilityRole="alert"
        accessibilityHint="Touchez pour fermer"
        style={styles.banner}
      >
        <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
        <View style={styles.texts}>
          <Text style={styles.title}>Synchronisation échouée</Text>
          <Text style={styles.message} numberOfLines={3}>
            {syncError}
          </Text>
        </View>
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surfaceHigh,
  },
  texts: { flex: 1 },
  title: { ...textStyles.bodySmMedium, color: colors.white },
  message: { ...textStyles.caption, color: colors.muted },
});
