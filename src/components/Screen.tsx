import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, layout } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** Apply default horizontal screen padding. */
  padded?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Base screen container: dark background + safe-area handling. */
export function Screen({ children, padded = false, edges = ['top'], style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  padded: { paddingHorizontal: layout.screenPadding },
});
