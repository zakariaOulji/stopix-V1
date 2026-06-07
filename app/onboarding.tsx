import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components';
import { colors, fonts, gradients, layout, spacing } from '@/theme';

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    key: 'deliver',
    icon: 'git-network-outline',
    title: 'Livrez plus',
    description:
      'Des tournées optimisées par l’IA pour livrer un maximum de colis en un minimum de temps.',
  },
  {
    key: 'drive',
    icon: 'leaf-outline',
    title: 'Roulez moins',
    description:
      'Réduisez vos kilomètres et votre carburant grâce aux itinéraires les plus courts.',
  },
  {
    key: 'prove',
    icon: 'shield-checkmark-outline',
    title: 'Prouvez tout',
    description:
      'Photo, signature, code d’accès… gardez une preuve fiable de chaque livraison.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (isLast) {
      router.push('/login');
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconBlock}>
        <LinearGradient
          colors={gradients.glow}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={56} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Top bar: brand + skip */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>
          STOP<Text style={{ color: colors.primary }}>IX</Text>
        </Text>
        {!isLast && (
          <Pressable onPress={() => router.push('/login')} hitSlop={layout.hitSlop}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        bounces={false}
      />

      {/* Footer: dots + CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={isLast ? 'Commencer' : 'Suivant'}
          size="lg"
          icon={isLast ? 'rocket' : undefined}
          iconRight={isLast ? undefined : 'arrow-forward'}
          onPress={goNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    height: 40,
  },
  brand: { fontFamily: fonts.heading, fontSize: 20, color: colors.white, letterSpacing: 1 },
  skip: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  iconBlock: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.huge },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading, fontSize: 32, color: colors.white, textAlign: 'center' },
  description: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: { paddingHorizontal: layout.screenPadding },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderActive,
    marginHorizontal: 4,
  },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
