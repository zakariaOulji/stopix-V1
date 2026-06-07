import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components';
import { useUiStore } from '@/stores';
import { timeAgo } from '@/utils/format';
import type { AppNotification } from '@/types';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const TYPE_META: Record<AppNotification['type'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  info: { icon: 'information-circle', color: colors.info },
  success: { icon: 'checkmark-circle', color: colors.primary },
  warning: { icon: 'warning', color: colors.warning },
  danger: { icon: 'alert-circle', color: colors.danger },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useUiStore((s) => s.notifications);
  const markRead = useUiStore((s) => s.markNotificationRead);
  const markAllRead = useUiStore((s) => s.markAllNotificationsRead);
  const unread = useUiStore((s) => s.unreadCount());

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAllRead} disabled={unread === 0} hitSlop={layout.hitSlop}>
          <Text style={[styles.markAll, unread === 0 && styles.markAllDisabled]}>Tout lire</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, notifications.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>Vous êtes à jour ✨</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const meta = TYPE_META[item.type];
          return (
            <Animated.View entering={FadeInDown.duration(360).delay(index * 60)}>
              <Pressable
                onPress={() => markRead(item.id)}
                style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.pressed]}
              >
                <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: layout.screenPadding - 6,
    paddingRight: layout.screenPadding,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  markAll: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  markAllDisabled: { color: colors.muted, opacity: 0.5 },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.huge },
  listEmpty: { flexGrow: 1 },
  sep: { height: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowUnread: { backgroundColor: colors.surfaceHigh, borderColor: colors.borderActive },
  pressed: { opacity: 0.8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  message: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  time: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
