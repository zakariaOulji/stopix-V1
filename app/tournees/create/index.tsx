import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { AddressAutocomplete, Button, Input, Screen, StopCard, StopsMap } from '@/components';
import { useTourneeStore } from '@/stores';
import { fakeDelay } from '@/mocks';
import { aiService, geocodeService, type GeocodeResult } from '@/services';
import { ENV } from '@/config/env';
import { optimizeRoute, type LatLng } from '@/utils/optimize';
import { getCurrentPosition } from '@/utils/location';
import { useRoutePolyline } from '@/hooks/useRoutePolyline';
import { pickFromLibrary, takePhoto, type PickedImage } from '@/utils/imagePicker';
import { colors, fonts, layout, radius, spacing } from '@/theme';
import type { Stop } from '@/types';

const STEPS = ['Adresses', 'Détails & ordre', 'Optimisation', 'Récapitulatif'];
const CENTER = { latitude: 48.8566, longitude: 2.3522 };

interface StopDraft {
  key: string;
  address: string;
  recipient: string;
  packages: number; // colis
  vrac: number;
  phone: string;
  notes: string;
  accessCode: string;
  lat?: number;
  lng?: number;
  postalCode?: string;
  city?: string;
}

let draftCounter = 0;
const baseDraft = (): Omit<StopDraft, 'address'> => ({
  key: `d${Date.now()}_${draftCounter++}`,
  recipient: '',
  packages: 1,
  vrac: 0,
  phone: '',
  notes: '',
  accessCode: '',
});
const draftFromGeocode = (r: GeocodeResult): StopDraft => ({
  ...baseDraft(),
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  postalCode: r.postalCode,
  city: r.city,
});

/** Fallback coords (mock import without geocoding) scattered around Paris. */
function coordsFor(i: number) {
  const angle = i * 2.39996;
  const dist = 0.006 + (i % 5) * 0.002;
  return { lat: CENTER.latitude + Math.sin(angle) * dist, lng: CENTER.longitude + Math.cos(angle) * dist };
}

type StopInput = Omit<Stop, 'id' | 'tourneeId'>;

function buildStopInputs(drafts: StopDraft[]): StopInput[] {
  return drafts.map((d, i) => {
    const fallback = coordsFor(i);
    const minutes = 14 * 60 + i * 13;
    return {
      order: i + 1,
      status: 'pending',
      recipient: d.recipient.trim() || `Client ${i + 1}`,
      address: d.address.split(',')[0].trim(),
      city: d.city ?? 'Paris',
      postalCode: d.postalCode ?? d.address.match(/\b\d{5}\b/)?.[0] ?? '75001',
      lat: d.lat ?? fallback.lat,
      lng: d.lng ?? fallback.lng,
      packages: d.packages,
      vrac: d.vrac,
      phone: d.phone.trim() || undefined,
      notes: d.notes.trim() || undefined,
      accessCode: d.accessCode.trim() || undefined,
      eta: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    } satisfies StopInput;
  });
}

function buildStops(tourneeId: string, drafts: StopDraft[]): Stop[] {
  return buildStopInputs(drafts).map((s, i) => ({ ...s, id: `${tourneeId}-stop-${i + 1}`, tourneeId }));
}

export default function CreateTourneeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createTournee = useTourneeStore((s) => s.createTournee);
  const startTournee = useTourneeStore((s) => s.startTournee);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState<StopDraft[]>([]);
  const [scanning, setScanning] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [optResult, setOptResult] = useState<{ improvement: number; distanceKm: number; gps: boolean } | null>(null);
  const [startCoord, setStartCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [launching, setLaunching] = useState(false);

  const addGeocoded = (r: GeocodeResult) => {
    Haptics.selectionAsync();
    setDrafts((d) => [...d, draftFromGeocode(r)]);
  };

  const removeDraft = (key: string) => setDrafts((d) => d.filter((x) => x.key !== key));
  const updateDraft = (key: string, patch: Partial<StopDraft>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= drafts.length) return;
    Haptics.selectionAsync();
    setDrafts((d) => {
      const copy = [...d];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const runExtraction = async (img: PickedImage | null) => {
    setScanning(true);
    try {
      const deliveries = await aiService.extractAddresses(img?.base64 ?? '', img?.mimeType ?? '');
      if (deliveries.length === 0) {
        Alert.alert('Aucune adresse trouvée', 'Réessaie avec une photo plus nette ou mieux cadrée.');
        return;
      }
      // Geocode each extracted address to get real coordinates.
      const built: StopDraft[] = [];
      for (const d of deliveries) {
        const geo = await geocodeService.geocode(d.address);
        built.push({
          ...baseDraft(),
          address: geo?.address ?? d.address,
          lat: geo?.lat,
          lng: geo?.lng,
          postalCode: geo?.postalCode,
          city: geo?.city,
          recipient: d.recipient ?? '',
          phone: d.phone ?? '',
          packages: d.packages ?? 1,
          vrac: d.vrac ?? 0,
        });
      }
      setDrafts((prev) => [...prev, ...built]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : 'Réessaie.');
    } finally {
      setScanning(false);
    }
  };

  const importPhoto = () => {
    if (ENV.USE_MOCKS) {
      runExtraction(null);
      return;
    }
    Alert.alert('Importer une feuille de route', 'Choisis la source de la photo', [
      {
        text: 'Prendre une photo',
        onPress: async () => {
          const img = await takePhoto();
          if (img) runExtraction(img);
        },
      },
      {
        text: 'Choisir dans la galerie',
        onPress: async () => {
          const img = await pickFromLibrary();
          if (img) runExtraction(img);
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    if (step === 2 && !optimized) {
      let active = true;
      (async () => {
        // Use GPS position as the start point (falls back to no start if denied).
        const gps = await getCurrentPosition();
        const points: LatLng[] = drafts.map((d, i) => {
          const fb = coordsFor(i);
          return { lat: d.lat ?? fb.lat, lng: d.lng ?? fb.lng };
        });
        const { order, improvement, distanceKm } = optimizeRoute(points, gps ?? undefined);
        // Keep the animation visible a touch.
        await fakeDelay(900);
        if (!active) return;
        setDrafts((prev) => order.map((idx) => prev[idx]));
        setOptResult({ improvement, distanceKm, gps: !!gps });
        setStartCoord(gps);
        setOptimized(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })();
      return () => {
        active = false;
      };
    }
  }, [step, optimized]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewStops = buildStops('preview', drafts);
  const { polyline: routePolyline } = useRoutePolyline(previewStops, startCoord);
  const distanceKm = optResult?.distanceKm ?? +(drafts.length * 1.4).toFixed(1);
  const durationMin = Math.round(distanceKm * 3 + drafts.length * 4);

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
      try {
        const id = await createTournee(name.trim() || 'Nouvelle tournée', buildStopInputs(drafts));
        await startTournee(id);
        router.replace(`/tournees/${id}/execute`);
      } catch (e) {
        setLaunching(false);
        Alert.alert('Création impossible', e instanceof Error ? e.message : 'Réessayez.');
      }
    }
  };

  const primaryLabel =
    step === 0 ? 'Continuer' : step === 1 ? 'Optimiser avec l’IA' : step === 2 ? 'Voir le récapitulatif' : 'Lancer la tournée';
  const primaryDisabled = (step === 0 && drafts.length === 0) || (step === 2 && !optimized);
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
        <Animated.View key={step} entering={FadeIn.duration(260)} style={styles.flex1}>
          <Text style={styles.title}>{STEPS[step]}</Text>

          {/* STEP 0 — quick add addresses */}
          {step === 0 && (
            <View style={styles.flex1}>
              <View style={styles.nameField}>
                <Input
                  label="Nom de la tournée"
                  icon="bookmark-outline"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <AddressAutocomplete onPick={addGeocoded} placeholder="Rechercher une adresse…" />

              <Button
                label={scanning ? 'Analyse en cours…' : 'Importer une photo (IA)'}
                variant="secondary"
                icon="camera-outline"
                loading={scanning}
                onPress={importPhoto}
                style={styles.importBtn}
              />

              {drafts.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="map-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyText}>Ajoutez des adresses manuellement ou via une photo.</Text>
                </View>
              ) : (
                <ScrollView style={styles.flex1} contentContainerStyle={styles.quickList} keyboardShouldPersistTaps="handled">
                  {drafts.map((d, i) => (
                    <View key={d.key} style={styles.quickRow}>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.quickAddr} numberOfLines={1}>{d.address}</Text>
                      <Pressable onPress={() => removeDraft(d.key)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                  <Text style={styles.hint}>Étape suivante : détails de chaque livraison + ordre.</Text>
                </ScrollView>
              )}
            </View>
          )}

          {/* STEP 1 — per-stop details + reorder (↑/↓) */}
          {step === 1 && (
            <KeyboardAvoidingView
              style={styles.flex1}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={90}
            >
              <View style={styles.reorderHint}>
                <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                <Text style={styles.subtitleInline}>Réordonne avec ↑/↓. Remplis les détails (optionnels).</Text>
              </View>
              <ScrollView
                style={styles.flex1}
                contentContainerStyle={styles.dragList}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
              >
                {drafts.map((item, index) => (
                  <View key={item.key} style={styles.editCard}>
                    <View style={styles.editHeader}>
                      <View style={styles.reorderBtns}>
                        <Pressable
                          onPress={() => move(index, index - 1)}
                          disabled={index === 0}
                          hitSlop={6}
                          style={[styles.moveBtn, index === 0 && styles.moveBtnOff]}
                        >
                          <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.muted : colors.white} />
                        </Pressable>
                        <Pressable
                          onPress={() => move(index, index + 1)}
                          disabled={index === drafts.length - 1}
                          hitSlop={6}
                          style={[styles.moveBtn, index === drafts.length - 1 && styles.moveBtnOff]}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={index === drafts.length - 1 ? colors.muted : colors.white}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.editAddress} numberOfLines={1}>{item.address || 'Adresse'}</Text>
                      <Pressable onPress={() => removeDraft(item.key)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>

                    <TextInput
                      value={item.recipient}
                      onChangeText={(v) => updateDraft(item.key, { recipient: v })}
                      placeholder="Destinataire (nom)"
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.primary}
                      style={styles.editInput}
                    />
                    <TextInput
                      value={item.address}
                      onChangeText={(v) => updateDraft(item.key, { address: v })}
                      placeholder="Adresse"
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.primary}
                      style={styles.editInput}
                    />

                    {/* Colis + Vrac quantities */}
                    <View style={styles.row}>
                      <Stepper
                        label="Colis"
                        value={item.packages}
                        min={0}
                        onChange={(n) => updateDraft(item.key, { packages: n })}
                      />
                      <Stepper
                        label="Vrac"
                        value={item.vrac}
                        min={0}
                        onChange={(n) => updateDraft(item.key, { vrac: n })}
                      />
                    </View>

                    <View style={styles.row}>
                      <TextInput
                        value={item.phone}
                        onChangeText={(v) => updateDraft(item.key, { phone: v })}
                        placeholder="Téléphone"
                        placeholderTextColor={colors.muted}
                        keyboardType="phone-pad"
                        selectionColor={colors.primary}
                        style={[styles.editInput, styles.flex1]}
                      />
                      <TextInput
                        value={item.accessCode}
                        onChangeText={(v) => updateDraft(item.key, { accessCode: v })}
                        placeholder="Code d'accès"
                        placeholderTextColor={colors.muted}
                        selectionColor={colors.primary}
                        style={[styles.editInput, styles.flex1]}
                      />
                    </View>
                    <TextInput
                      value={item.notes}
                      onChangeText={(v) => updateDraft(item.key, { notes: v })}
                      placeholder="Notes (étage, consignes…)"
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.primary}
                      style={styles.editInput}
                    />
                  </View>
                ))}
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* STEP 2 — optimization */}
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
                    <OptStat value={`-${optResult?.improvement ?? 0}%`} label="Distance" />
                    <OptStat value={`${drafts.length}`} label="Stops" />
                    <OptStat value={`${distanceKm} km`} label="Total" />
                  </View>
                  <Text style={styles.optSub}>
                    {optResult?.gps
                      ? 'Optimisé depuis ta position actuelle.'
                      : 'Position GPS indisponible — ordre des stops optimisé.'}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* STEP 3 — recap */}
          {step === 3 && (
            <View style={styles.flex1}>
              <StopsMap stops={previewStops} interactive={false} showRoute start={startCoord ?? undefined} routePolyline={routePolyline ?? undefined} style={styles.map} />
              <View style={styles.recapStats}>
                <Text style={styles.recapText}>
                  {drafts.length} stops · {distanceKm} km · ~{durationMin} min
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

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn} hitSlop={6}>
          <Ionicons name="remove" size={18} color={colors.white} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(value + 1)} style={styles.stepBtn} hitSlop={6}>
          <Ionicons name="add" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
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
  flex1: { flex: 1 },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.white, marginBottom: spacing.lg },

  nameField: { marginBottom: spacing.md },
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
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
  quickList: { paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.huge },
  quickRow: {
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
  quickAddr: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },

  reorderHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  subtitleInline: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, flex: 1 },
  dragList: { paddingBottom: 300, gap: spacing.md },
  editCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reorderBtns: { flexDirection: 'row', gap: 4 },
  moveBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnOff: { opacity: 0.4 },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: { fontFamily: fonts.heading, fontSize: 12, color: colors.primary },
  editAddress: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  editInput: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  stepperWrap: { flex: 1, gap: 4 },
  stepperLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginLeft: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.heading, fontSize: 15, color: colors.white, minWidth: 24, textAlign: 'center' },

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
