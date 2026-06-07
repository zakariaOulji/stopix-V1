import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from './BottomSheet';
import {
  NAV_PROVIDERS,
  getAvailableProviders,
  openNavigation,
  type NavTarget,
} from '@/utils/navigation';
import { colors, fonts, radius, spacing } from '@/theme';

export interface NavigationSheetProps {
  visible: boolean;
  onClose: () => void;
  target: NavTarget | null;
}

export function NavigationSheet({ visible, onClose, target }: NavigationSheetProps) {
  const [providers, setProviders] = useState(NAV_PROVIDERS);

  // Detect installed nav apps each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    getAvailableProviders().then((list) => {
      if (active) setProviders(list);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const handlePick = async (provider: (typeof NAV_PROVIDERS)[number]['provider']) => {
    Haptics.selectionAsync();
    if (target) await openNavigation(provider, target);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Naviguer avec…">
      {target?.label ? (
        <View style={styles.destination}>
          <Ionicons name="location" size={15} color={colors.primary} />
          <Text style={styles.destText} numberOfLines={1}>{target.label}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {providers.map((p) => (
          <Pressable
            key={p.provider}
            onPress={() => handlePick(p.provider)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.icon, { backgroundColor: `${p.color}22` }]}>
              <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={22} color={p.color} />
            </View>
            <Text style={styles.label}>{p.label}</Text>
            <Ionicons name="open-outline" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  destText: { fontFamily: fonts.medium, fontSize: 13, color: colors.white, flex: 1 },
  list: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
