import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
}

/** Labelled − value + counter (never below 0). */
export function Stepper({ label, value, onChange }: StepperProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          style={styles.btn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${label} moins un`}
        >
          <Ionicons name="remove" size={18} color={colors.white} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          onPress={() => onChange(value + 1)}
          style={styles.btn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${label} plus un`}
        >
          <Ionicons name="add" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 4 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginLeft: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    padding: 4,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.heading, fontSize: 16, color: colors.white, minWidth: 24, textAlign: 'center' },
});
