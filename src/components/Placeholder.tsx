import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './Screen';
import { colors, fonts, spacing } from '@/theme';

/**
 * TEMPORARY scaffold screen. Each phase replaces these with the real screen.
 * Lets the whole app boot + navigate before the screens are built.
 */
export function Placeholder({
  title,
  subtitle,
  icon = 'construct-outline',
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Screen padded edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={34} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? 'Écran à construire'}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.white, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: spacing.sm },
});
