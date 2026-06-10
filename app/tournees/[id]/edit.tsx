import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Screen } from '@/components';
import { useTourneeStore } from '@/stores';
import type { Stop } from '@/types';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const CENTER = { latitude: 48.8566, longitude: 2.3522 };
function coordsFor(i: number) {
  const angle = i * 2.39996;
  const dist = 0.006 + (i % 5) * 0.002;
  return { lat: CENTER.latitude + Math.sin(angle) * dist, lng: CENTER.longitude + Math.cos(angle) * dist };
}

interface Draft {
  key: string;
  address: string;
  recipient: string;
  packages: number;
  vrac: number;
  phone: string;
  accessCode: string;
  notes: string;
  lat: number;
  lng: number;
}
let counter = 0;

export default function EditTourneeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tournee = useTourneeStore((s) => s.tournees.find((t) => t.id === id));
  const allStops = useTourneeStore((s) => s.stops);
  const updateTourneeStops = useTourneeStore((s) => s.updateTourneeStops);
  const renameTournee = useTourneeStore((s) => s.renameTournee);

  const [name, setName] = useState(tournee?.name ?? '');

  const initial = useMemo<Draft[]>(
    () =>
      allStops
        .filter((s) => s.tourneeId === id)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          key: s.id,
          address: s.postalCode ? `${s.address}, ${s.postalCode}` : s.address,
          recipient: s.recipient,
          packages: s.packages,
          vrac: s.vrac ?? 0,
          phone: s.phone ?? '',
          accessCode: s.accessCode ?? '',
          notes: s.notes ?? '',
          lat: s.lat,
          lng: s.lng,
        })),
    [allStops, id],
  );

  const [drafts, setDrafts] = useState<Draft[]>(initial);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addAddress = () => {
    const v = input.trim();
    if (!v) return;
    Haptics.selectionAsync();
    const { lat, lng } = coordsFor(drafts.length);
    setDrafts((d) => [
      ...d,
      { key: `n${Date.now()}_${counter++}`, address: v, recipient: '', packages: 1, vrac: 0, phone: '', accessCode: '', notes: '', lat, lng },
    ]);
    setInput('');
  };
  const removeDraft = (key: string) => setDrafts((d) => d.filter((x) => x.key !== key));
  const updateDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= drafts.length) return;
    Haptics.selectionAsync();
    setDrafts((d) => {
      const c = [...d];
      const [it] = c.splice(from, 1);
      c.splice(to, 0, it);
      return c;
    });
  };

  const save = async () => {
    if (drafts.length === 0) {
      Alert.alert('Aucun stop', 'Ajoute au moins une adresse.');
      return;
    }
    setSaving(true);
    try {
      const stops: Omit<Stop, 'id' | 'tourneeId'>[] = drafts.map((d, i) => {
        const minutes = 14 * 60 + i * 13;
        return {
          order: i + 1,
          status: 'pending',
          recipient: d.recipient.trim() || `Client ${i + 1}`,
          address: d.address.split(',')[0].trim(),
          city: 'Paris',
          postalCode: d.address.split(',')[1]?.trim() ?? '75001',
          lat: d.lat,
          lng: d.lng,
          packages: d.packages,
          vrac: d.vrac,
          phone: d.phone.trim() || undefined,
          accessCode: d.accessCode.trim() || undefined,
          notes: d.notes.trim() || undefined,
          eta: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        };
      });
      if (id) {
        await renameTournee(id, name.trim() || tournee?.name || 'Tournée');
        await updateTourneeStops(id, stops);
      }
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Enregistrement impossible', e instanceof Error ? e.message : 'Réessayez.');
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Modifier · {tournee?.name ?? ''}</Text>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <Input label="Nom de la tournée" icon="bookmark-outline" value={name} onChangeText={setName} />
          <View style={styles.addRow}>
            <View style={styles.flex1}>
              <Input label="Ajouter une adresse" icon="location-outline" value={input} onChangeText={setInput} onSubmitEditing={addAddress} returnKeyType="done" />
            </View>
            <Pressable onPress={addAddress} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={colors.background} />
            </Pressable>
          </View>

          {drafts.map((item, index) => (
            <View key={item.key} style={styles.editCard}>
              <View style={styles.editHeader}>
                <View style={styles.reorderBtns}>
                  <Pressable onPress={() => move(index, index - 1)} disabled={index === 0} hitSlop={6} style={[styles.moveBtn, index === 0 && styles.moveBtnOff]}>
                    <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.muted : colors.white} />
                  </Pressable>
                  <Pressable onPress={() => move(index, index + 1)} disabled={index === drafts.length - 1} hitSlop={6} style={[styles.moveBtn, index === drafts.length - 1 && styles.moveBtnOff]}>
                    <Ionicons name="chevron-down" size={16} color={index === drafts.length - 1 ? colors.muted : colors.white} />
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

              <TextInput value={item.recipient} onChangeText={(v) => updateDraft(item.key, { recipient: v })} placeholder="Destinataire (nom)" placeholderTextColor={colors.muted} selectionColor={colors.primary} style={styles.editInput} />
              <TextInput value={item.address} onChangeText={(v) => updateDraft(item.key, { address: v })} placeholder="Adresse" placeholderTextColor={colors.muted} selectionColor={colors.primary} style={styles.editInput} />
              <View style={styles.row}>
                <Stepper label="Colis" value={item.packages} onChange={(n) => updateDraft(item.key, { packages: n })} />
                <Stepper label="Vrac" value={item.vrac} onChange={(n) => updateDraft(item.key, { vrac: n })} />
              </View>
              <View style={styles.row}>
                <TextInput value={item.phone} onChangeText={(v) => updateDraft(item.key, { phone: v })} placeholder="Téléphone" placeholderTextColor={colors.muted} keyboardType="phone-pad" selectionColor={colors.primary} style={[styles.editInput, styles.flex1]} />
                <TextInput value={item.accessCode} onChangeText={(v) => updateDraft(item.key, { accessCode: v })} placeholder="Code d'accès" placeholderTextColor={colors.muted} selectionColor={colors.primary} style={[styles.editInput, styles.flex1]} />
              </View>
              <TextInput value={item.notes} onChangeText={(v) => updateDraft(item.key, { notes: v })} placeholder="Notes (étage, consignes…)" placeholderTextColor={colors.muted} selectionColor={colors.primary} style={styles.editInput} />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Enregistrer les modifications" size="lg" icon="checkmark" loading={saving} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn} hitSlop={6}>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: layout.screenPadding - 6 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 17, color: colors.white },
  flex1: { flex: 1 },
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: 320, gap: spacing.md },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addBtn: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  editCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reorderBtns: { flexDirection: 'row', gap: 4 },
  moveBtn: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  moveBtnOff: { opacity: 0.4 },
  orderBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  orderBadgeText: { fontFamily: fonts.heading, fontSize: 12, color: colors.primary },
  editAddress: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  editInput: { backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  row: { flexDirection: 'row', gap: spacing.sm },
  stepperWrap: { flex: 1, gap: 4 },
  stepperLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginLeft: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, padding: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: fonts.heading, fontSize: 15, color: colors.white, minWidth: 24, textAlign: 'center' },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
