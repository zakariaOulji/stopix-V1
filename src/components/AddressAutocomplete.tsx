import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { geocodeService, type AddressPrediction, type GeocodeResult } from '@/services';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export interface AddressAutocompleteProps {
  /** Called when the user selects a suggestion or submits free text (geocoded). */
  onPick: (result: GeocodeResult) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ onPick, placeholder = 'Ajouter une adresse' }: AddressAutocompleteProps) {
  const [text, setText] = useState('');
  const [preds, setPreds] = useState<AddressPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (text.trim().length < 3) {
      setPreds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const p = await geocodeService.autocomplete(text);
      setPreds(p);
      setLoading(false);
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  const pick = async (pred: AddressPrediction) => {
    setResolving(true);
    const r = await geocodeService.details(pred.placeId, pred.description);
    setResolving(false);
    if (r) {
      onPick(r);
      setText('');
      setPreds([]);
    }
  };

  const submitManual = async () => {
    if (!text.trim()) return;
    setResolving(true);
    const r = await geocodeService.geocode(text);
    setResolving(false);
    if (r) {
      onPick(r);
      setText('');
      setPreds([]);
    }
  };

  return (
    <View>
      <View style={styles.field}>
        <Ionicons name="location-outline" size={20} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submitManual}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {(loading || resolving) && <ActivityIndicator size="small" color={colors.muted} />}
        {!loading && !resolving && text.length > 0 && (
          <Pressable onPress={() => { setText(''); setPreds([]); }} hitSlop={layout.hitSlop}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {preds.length > 0 && (
        <View style={styles.dropdown}>
          {preds.slice(0, 5).map((p) => (
            <Pressable
              key={p.placeId}
              onPress={() => pick(p)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={styles.rowText} numberOfLines={2}>{p.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.white, paddingVertical: 0 },
  dropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
});
