import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Screen, StopCard, StopsMap } from '@/components';
import { useTourneeStore } from '@/stores';
import { fakeDelay } from '@/mocks';
import { colors, fonts, layout, radius, spacing } from '@/theme';
import type { Stop, Tournee } from '@/types';

const STEPS = ['Adresses', 'Validation', 'Optimisation', 'Récapitulatif'];
const CENTER = { latitude: 48.8566, longitude: 2.3522 };
const SCANNED = [
  '12 Rue de Rivoli, 75004',
  '8 Avenue Parmentier, 75011',
  '25 Rue du Bac, 75007',
  '40 Boulevard Haussmann, 75009',
];

/** Mock geocoding: deterministic coords scattered around Paris center. */
function coordsFor(i: number) {
  const angle = i * 2.39996;
  const dist = 0.006 + (i % 5) * 0.002;
  return { lat: CENTER.latitude + Math.sin(angle) * dist, lng: CENTER.longitude + Math.cos(angle) * dist };
}

function buildStops(tourneeId: string, addresses: string[]): Stop[] {
  return addresses.map((addr, i) => {
    const { lat, lng } = coordsFor(i);
    const minutes = 14 * 60 + i * 13;
    return {
      id: `${tourneeId}-stop-${i + 1}`,
      tourneeId,
      order: i + 1,
      status: 'pending',
      recipient: `Client ${i + 1}`,
      address: addr.split(',')[0].trim(),
      city: 'Paris',
      postalCode: addr.split(',')[1]?.trim() ?? '75001',
      lat,
      lng,
      packages: 1 + (i % 2),
      eta: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    } satisfies Stop;
  });
}

export default function CreateTourneeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTournee = useTourneeStore((s) => s.addTournee);
  const startTournee = useTourneeStore((s) => s.startTournee);

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [launching, setLaunching] = useState(false);

  const addAddress = () => {
    const v = input.trim();
    if (!v) return;
    Haptics.selectionAsync();
    setAddresses((a) => [...a, v]);
    setInput('');
  };

  const removeAddress = (i: number) => setAddresses((a) => a.filter((_, idx) => idx !== i));
  const editAddress = (i: number, v: string) =>
    setAddresses((a) => a.map((x, idx) => (idx === i ? v : x)));

  const importPhoto = async () => {
    setScanning(true);
    await fakeDelay(1600);
    setAddresses((a) => [...a, ...SCANNED]);
    setScanning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Auto-run optimization when entering step 2.
  useEffect(() => {
    if (step === 2 && !optimized) {
      let active = true;
      (async () => {
        await fakeDelay(2000);
        if (active) {
          setOptimized(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [step, optimized]);

  const previewStops = buildStops('preview', addresses);
  const distanceKm = +(addresses.length * 1.4).toFixed(1);
  const durationMin = addresses.length * 12;

  const goBack = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const onPrimary = async () => {
    if (step === 0 || step === 1) {
      setStep((s) => s + 1);
      return;
    }
    if (step === 2 && optimized) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setLaunching(true);
      const id = `tournee-${Date.now()}`;
      const stops = buildStops(id, addresses);
      const tournee: Tournee = {
        id,
        name: 'Nouvelle tournée',
        status: 'planned',
        date: new Date().toISOString(),
        stopsCount: stops.length,
        deliveredCount: 0,
        failedCount: 0,
        distanceKm,
        estimatedDurationMin: durationMin,
        region: CENTER,
      };
      addTournee(tournee, stops);
      await startTournee(id);
      router.replace(`/tournees/${id}/execute`);
    }
  };

  const primaryLabel =
    step === 0 ? 'Continuer' : step === 1 ? 'Optimiser avec l’IA' : step === 2 ? 'Voir le récapitulatif' : 'Lancer la tournée';
  const primaryDisabled =
    (step === 0 && addresses.length === 0) || (step === 2 && !optimized);
  const showFooter = !(step === 2 && !optimized);

  return (
    <Screen edges={['top']}>
      {/* Header + progress */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.stepLabel}>Étape {step + 1}/4</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.progress}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.seg, i <= step && styles.segActive]} />
        ))}
      </View>

      <View style={styles.body}>
        <Animated.View key={step} entering={FadeIn.duration(280)} style={styles.flex1}>
        <Text style={styles.title}>{STEPS[step]}</Text>

        {/* STEP 0 — Add addresses */}
        {step === 0 && (
          <View style={styles.flex1}>
            <View style={styles.addRow}>
              <View style={styles.flex1}>
                <Input
                  label="Adresse de livraison"
                  icon="location-outline"
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={addAddress}
                  returnKeyType="done"
                />
              </View>
              <Pressable onPress={addAddress} style={styles.addBtn}>
                <Ionicons name="add" size={24} color={colors.background} />
              </Pressable>
            </View>

            <Button
              label={scanning ? 'Analyse en cours…' : 'Importer une photo (IA)'}
              variant="secondary"
              icon="camera-outline"
              loading={scanning}
              onPress={importPhoto}
              style={styles.importBtn}
            />

            <FlatList
              data={addresses}
              keyExtractor={(a, i) => `${a}-${i}`}
              contentContainerStyle={styles.addrList}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="map-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyText}>Ajoutez des adresses manuellement ou via une photo.</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={styles.addrRow}>
                  <View style={styles.addrIndex}>
                    <Text style={styles.addrIndexText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.addrText} numberOfLines={1}>{item}</Text>
                  <Pressable onPress={() => removeAddress(index)} hitSlop={layout.hitSlop}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}

        {/* STEP 1 — Validate */}
        {step === 1 && (
          <View style={styles.flex1}>
            <Text style={styles.subtitle}>Vérifiez et corrigez vos {addresses.length} adresses avant l’optimisation.</Text>
            <FlatList
              data={addresses}
              keyExtractor={(a, i) => `${a}-${i}`}
              contentContainerStyle={styles.addrList}
              renderItem={({ item, index }) => (
                <View style={styles.addrRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <TextInput
                    value={item}
                    onChangeText={(v) => editAddress(index, v)}
                    style={styles.addrInput}
                    selectionColor={colors.primary}
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable onPress={() => removeAddress(index)} hitSlop={layout.hitSlop}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}

        {/* STEP 2 — Optimization */}
        {step === 2 && (
          <View style={styles.optimize}>
            {!optimized ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.optTitle}>L’IA optimise votre tournée…</Text>
                <Text style={styles.optSub}>Calcul du meilleur itinéraire</Text>
              </>
            ) : (
              <>
                <View style={styles.optIcon}>
                  <Ionicons name="sparkles" size={36} color={colors.primary} />
                </View>
                <Text style={styles.optTitle}>Tournée optimisée ! 🎯</Text>
                <View style={styles.optStats}>
                  <OptStat value="-23%" label="Distance" />
                  <OptStat value={`${addresses.length}`} label="Stops" />
                  <OptStat value={`${distanceKm} km`} label="Total" />
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 3 — Recap */}
        {step === 3 && (
          <View style={styles.flex1}>
            <StopsMap stops={previewStops} interactive={false} style={styles.map} />
            <View style={styles.recapStats}>
              <Text style={styles.recapText}>
                {addresses.length} stops · {distanceKm} km · ~{durationMin} min
              </Text>
            </View>
            <FlatList
              data={previewStops}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => <StopCard stop={item} showStatusBadge={false} />}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              contentContainerStyle={styles.recapList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        </Animated.View>
      </View>

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={primaryLabel}
            size="lg"
            disabled={primaryDisabled}
            loading={launching}
            icon={step === 3 ? 'rocket' : step === 1 ? 'sparkles' : undefined}
            iconRight={step === 0 ? 'arrow-forward' : undefined}
            onPress={onPrimary}
          />
        </View>
      )}
    </Screen>
  );
}

function OptStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.optStat}>
      <Text style={styles.optStatValue}>{value}</Text>
      <Text style={styles.optStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh },
  segActive: { backgroundColor: colors.primary },
  body: { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.white, marginBottom: spacing.lg },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: spacing.lg },
  flex1: { flex: 1 },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtn: { marginTop: spacing.md },
  addrList: { paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addrIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrIndexText: { fontFamily: fonts.heading, fontSize: 12, color: colors.primary },
  addrText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  addrInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white, paddingVertical: 0 },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xl },

  optimize: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  optIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  optTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.white, textAlign: 'center' },
  optSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  optStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  optStat: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: 4,
  },
  optStatValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  optStatLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  map: { height: 160, marginBottom: spacing.md },
  recapStats: { marginBottom: spacing.md },
  recapText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  recapList: { paddingBottom: spacing.lg },

  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
