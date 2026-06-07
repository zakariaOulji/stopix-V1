import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts, spacing } from '@/theme';

/** Icon + label per route name. */
const TAB_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  dashboard: { icon: 'home', label: 'Accueil' },
  tournees: { icon: 'list', label: 'Tournées' },
  map: { icon: 'map', label: 'Carte' },
  stats: { icon: 'stats-chart', label: 'Stats' },
  profile: { icon: 'person', label: 'Profil' },
};

const SPRING = { damping: 12, stiffness: 220, mass: 0.6 };

function TabItem({
  focused,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.18 : 1, SPRING) },
      { translateY: withTiming(focused ? -2 : 0, { duration: 160 }) },
    ],
  }));

  return (
    <Pressable onPress={onPress} style={styles.tab} hitSlop={8}>
      <View style={styles.iconWrap}>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
            size={23}
            color={focused ? colors.primary : colors.muted}
          />
        </Animated.View>
        {focused && <View style={styles.dot} />}
      </View>
      <Text style={[styles.label, { color: focused ? colors.primary : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || spacing.md }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? { icon: 'ellipse', label: route.name };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem key={route.key} focused={focused} icon={meta.icon} label={meta.label} onPress={onPress} />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  bar: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  iconWrap: { alignItems: 'center', justifyContent: 'center', height: 28 },
  dot: {
    position: 'absolute',
    bottom: -5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  label: { fontFamily: fonts.medium, fontSize: 11, marginTop: 6 },
});
