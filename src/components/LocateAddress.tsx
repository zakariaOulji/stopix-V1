import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { geocodeService, QuotaExceededError, type GeocodeResult } from '@/services';
import { colors, fonts, radius, spacing } from '@/theme';

export interface LocateAddressProps {
  address: string;
  onLocated: (result: GeocodeResult) => void;
}

/**
 * Shown under a stop whose address has no real position (geocoding failed,
 * daily limit reached, or the address text was edited). Never invents a
 * position: the driver re-locates it or fixes the text.
 */
export function LocateAddress({ address, onLocated }: LocateAddressProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const locate = async () => {
    if (!address.trim()) {
      setMessage('Saisis une adresse.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const r = await geocodeService.geocode(address);
      if (r) onLocated(r);
      else setMessage('Adresse introuvable : précise le numéro, la rue et la ville.');
    } catch (e) {
      setMessage(e instanceof QuotaExceededError ? e.message : 'Localisation impossible, réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={16} color={colors.warning} />
      <Text style={styles.text}>{message ?? 'Position inconnue : cet arrêt ne peut pas être placé sur la carte.'}</Text>
      <Pressable onPress={locate} disabled={busy} style={styles.btn} hitSlop={6} accessibilityRole="button">
        {busy ? <ActivityIndicator size="small" color={colors.warning} /> : <Text style={styles.btnText}>Localiser</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  text: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.warning },
  btn: {
    minWidth: 76,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warning },
});
