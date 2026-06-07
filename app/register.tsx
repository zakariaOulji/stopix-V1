import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Input, Screen } from '@/components';
import { useAuthStore } from '@/stores';
import { employmentMeta, vehicleMeta } from '@/utils/status';
import type { EmploymentType, VehicleType } from '@/types';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const STEPS = ['Vos infos', 'Votre activité', 'Finalisation'];
const VEHICLES: VehicleType[] = ['velo', 'moto', 'voiture', 'camionnette'];
const EMPLOYMENTS: EmploymentType[] = ['independant', 'salarie'];

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [employment, setEmployment] = useState<EmploymentType>();
  const [vehicle, setVehicle] = useState<VehicleType>();
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});

  const validateStep0 = () => {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = 'Nom requis';
    if (!email.trim()) next.email = 'Email requis';
    if (password.length < 4) next.password = 'Au moins 4 caractères';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goBack = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const goNext = async () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && (!employment || !vehicle)) {
      Alert.alert('Champs manquants', 'Choisissez votre statut et votre véhicule.');
      return;
    }
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    // Final submit
    await register({ full_name: fullName, email, employment, vehicle });
    router.replace('/(tabs)/dashboard');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header + progress */}
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={layout.hitSlop} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.stepLabel}>
            Étape {step + 1}/{STEPS.length}
          </Text>
          <View style={styles.back} />
        </View>
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{STEPS[step]}</Text>

          {step === 0 && (
            <View>
              <Text style={styles.subtitle}>Créez votre compte livreur en quelques secondes.</Text>
              <Input
                label="Nom complet"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                containerStyle={styles.field}
              />
              <Input
                label="Email"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                containerStyle={styles.field}
              />
              <Input
                label="Mot de passe"
                icon="lock-closed-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((v) => !v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                containerStyle={styles.field}
              />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.subtitle}>Aidez-nous à personnaliser vos tournées.</Text>

              <Text style={styles.groupLabel}>Type de livreur</Text>
              <View style={styles.employmentRow}>
                {EMPLOYMENTS.map((e) => {
                  const active = employment === e;
                  return (
                    <Pressable
                      key={e}
                      onPress={() => setEmployment(e)}
                      style={[styles.employmentCard, active && styles.cardActive]}
                    >
                      <Ionicons
                        name={e === 'independant' ? 'briefcase-outline' : 'business-outline'}
                        size={22}
                        color={active ? colors.primary : colors.muted}
                      />
                      <Text style={[styles.employmentText, active && styles.textActive]}>
                        {employmentMeta[e]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.groupLabel}>Véhicule</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLES.map((v) => {
                  const active = vehicle === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setVehicle(v)}
                      style={[styles.vehicleCard, active && styles.cardActive]}
                    >
                      <Ionicons
                        name={vehicleMeta[v].icon as keyof typeof Ionicons.glyphMap}
                        size={26}
                        color={active ? colors.primary : colors.muted}
                      />
                      <Text style={[styles.vehicleText, active && styles.textActive]}>
                        {vehicleMeta[v].label}
                      </Text>
                      {active && (
                        <View style={styles.check}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.subtitle}>Une dernière chose, et c’est parti !</Text>

              <View style={styles.photoBlock}>
                <Avatar name={fullName || 'Livreur'} size={96} />
                <Pressable
                  onPress={() => Alert.alert('Bientôt disponible', 'L’ajout de photo arrive prochainement.')}
                  style={styles.photoBtn}
                >
                  <Ionicons name="camera-outline" size={16} color={colors.primary} />
                  <Text style={styles.photoBtnText}>Ajouter une photo</Text>
                </Pressable>
                <Text style={styles.optional}>Optionnel</Text>
              </View>

              <View style={styles.summary}>
                <SummaryRow icon="person-outline" label="Nom" value={fullName || '—'} />
                <SummaryRow icon="mail-outline" label="Email" value={email || '—'} />
                <SummaryRow
                  icon="briefcase-outline"
                  label="Statut"
                  value={employment ? employmentMeta[employment] : '—'}
                />
                <SummaryRow
                  icon={(vehicle ? vehicleMeta[vehicle].icon : 'car-outline') as keyof typeof Ionicons.glyphMap}
                  label="Véhicule"
                  value={vehicle ? vehicleMeta[vehicle].label : '—'}
                  last
                />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={step === 2 ? 'Créer mon compte' : 'Continuer'}
            size="lg"
            loading={isSubmitting}
            icon={step === 2 ? 'checkmark' : undefined}
            iconRight={step === 2 ? undefined : 'arrow-forward'}
            onPress={goNext}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, !last && styles.summaryDivider]}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: layout.screenPadding - 6,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: layout.screenPadding, marginTop: spacing.sm },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh },
  progressSegActive: { backgroundColor: colors.primary },
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },

  groupLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employmentRow: { flexDirection: 'row', gap: spacing.md },
  employmentCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  employmentText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  textActive: { color: colors.white },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  vehicleCard: {
    width: '47.5%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  vehicleText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  check: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  photoBlock: { alignItems: 'center', marginBottom: spacing.xl },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  photoBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  optional: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },

  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  summaryDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, flex: 1 },
  summaryValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white, maxWidth: '55%' },

  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
