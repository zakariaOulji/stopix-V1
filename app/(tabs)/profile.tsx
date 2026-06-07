import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Avatar, Badge, Card, Screen } from '@/components';
import { useAuthStore, useTourneeStore } from '@/stores';
import { useStats } from '@/hooks/useStats';
import { employmentMeta, vehicleMeta } from '@/utils/status';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetMocks = useTourneeStore((s) => s.resetMocks);
  const { stats } = useStats();
  const [notifications, setNotifications] = useState(true);

  const onResetDemo = () => {
    Alert.alert('Réinitialiser la démo', 'Remettre les tournées et stops à leur état initial ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => resetMocks() },
    ]);
  };

  const onLogout = () => {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Profil</Text>

        {/* Identity */}
        <Animated.View entering={FadeInDown.duration(400)}>
        <Card elevation="mid" style={styles.identity}>
          <Avatar name={user?.full_name} uri={user?.avatar_url} size={68} online />
          <View style={styles.identityInfo}>
            <Text style={styles.name} numberOfLines={1}>{user?.full_name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.badges}>
              <Badge label="Livreur" variant="success" icon="bicycle" />
              {user?.employment && <Badge label={employmentMeta[user.employment]} variant="neutral" />}
            </View>
          </View>
        </Card>
        </Animated.View>

        {/* Global stats */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
          <GlobalStat value={stats.totalDeliveries.toLocaleString('fr-FR')} label="Livraisons" />
          <GlobalStat value={`${stats.successRate}%`} label="Succès" />
          <GlobalStat value={stats.totalDistanceKm.toLocaleString('fr-FR')} label="km" />
        </Animated.View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Réglages</Text>
        <View style={styles.group}>
          <Row icon="notifications-outline" label="Notifications">
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: colors.primary, false: colors.surfaceHigh }}
              thumbColor={colors.white}
            />
          </Row>
          <Divider />
          <Row
            icon={(user ? vehicleMeta[user.vehicle].icon : 'car-outline') as keyof typeof Ionicons.glyphMap}
            label="Véhicule"
            onPress={() => Alert.alert('Véhicule', 'Modification du véhicule bientôt disponible.')}
          >
            <Text style={styles.rowValue}>{user ? vehicleMeta[user.vehicle].label : '—'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
          <Divider />
          <Row
            icon="shield-checkmark-outline"
            label="Confidentialité"
            onPress={() => Alert.alert('Confidentialité', 'Paramètres de confidentialité bientôt disponibles.')}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.group}>
          <Row icon="help-circle-outline" label="Aide & FAQ" onPress={() => Alert.alert('Aide', 'Centre d’aide bientôt disponible.')}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
          <Divider />
          <Row icon="refresh-outline" label="Réinitialiser la démo" onPress={onResetDemo}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
          <Divider />
          <Row icon="information-circle-outline" label="À propos">
            <Text style={styles.rowValue}>v1.0.0</Text>
          </Row>
        </View>

        {/* Logout */}
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function GlobalStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.globalStat}>
      <Text style={styles.globalValue}>{value}</Text>
      <Text style={styles.globalLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  children,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.white} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.huge },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.white, marginBottom: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityInfo: { flex: 1 },
  name: { fontFamily: fonts.heading, fontSize: 20, color: colors.white },
  email: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  globalStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: 4,
  },
  globalValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  globalLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.white, marginTop: spacing.xxl, marginBottom: spacing.md },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, minHeight: 56 },
  rowPressed: { backgroundColor: colors.surfaceHigh },
  rowIcon: { width: 32, alignItems: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 32 + spacing.md },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },
  logoutPressed: { opacity: 0.8 },
  logoutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
});
