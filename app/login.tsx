import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen } from '@/components';
import { useAuthStore } from '@/stores';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const [email, setEmail] = useState('karim@stopix.app');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email requis';
    if (!password.trim()) next.password = 'Mot de passe requis';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await login(email, password);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>
              STOP<Text style={{ color: colors.primary }}>IX</Text>
            </Text>
            <Text style={styles.title}>Bon retour 👋</Text>
            <Text style={styles.subtitle}>Connectez-vous pour reprendre vos tournées.</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(t) => setEmail(t)}
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              icon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((v) => !v)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={(t) => setPassword(t)}
              error={errors.password}
              containerStyle={styles.inputSpacing}
            />

            <Pressable
              onPress={() => router.push('/reset-password')}
              hitSlop={layout.hitSlop}
              style={styles.forgot}
            >
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </Pressable>

            <Button
              label="Se connecter"
              size="lg"
              loading={isSubmitting}
              onPress={submit}
              style={styles.submit}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>ou continuer avec</Text>
            <View style={styles.line} />
          </View>

          {/* OAuth (visual only) */}
          <View style={styles.oauthRow}>
            <OAuthButton icon="logo-google" label="Google" />
            <OAuthButton icon="logo-apple" label="Apple" />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Pressable onPress={() => router.push('/register')} hitSlop={layout.hitSlop}>
            <Text style={[styles.link, styles.linkBold]}>Créer un compte</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function OAuthButton({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert('Bientôt disponible', `La connexion ${label} arrive prochainement.`)}
      style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
      <Text style={styles.oauthLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.xxxl },
  header: { marginBottom: spacing.huge },
  brand: { fontFamily: fonts.heading, fontSize: 22, color: colors.white, letterSpacing: 1, marginBottom: spacing.xxxl },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: spacing.sm },
  form: {},
  inputSpacing: { marginTop: spacing.lg },
  forgot: { alignSelf: 'flex-end', marginTop: spacing.md },
  link: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  linkBold: { fontFamily: fonts.semibold },
  submit: { marginTop: spacing.xl },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xxl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginHorizontal: spacing.md },
  oauthRow: { flexDirection: 'row', gap: spacing.md },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeight.lg,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  oauthLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
