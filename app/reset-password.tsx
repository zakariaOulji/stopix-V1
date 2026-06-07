import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen } from '@/components';
import { fakeDelay } from '@/mocks';
import { colors, fonts, layout, spacing } from '@/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError('Email requis');
      return;
    }
    setError(undefined);
    setLoading(true);
    await fakeDelay(1200);
    setLoading(false);
    setSent(true);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {sent ? (
            <View style={styles.successBlock}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.title, styles.centered]}>Lien envoyé ✓</Text>
              <Text style={[styles.subtitle, styles.centered]}>
                Un lien de réinitialisation a été envoyé à{'\n'}
                <Text style={styles.email}>{email}</Text>.{'\n'}
                Vérifiez votre boîte de réception.
              </Text>
              <Button
                label="Retour à la connexion"
                size="lg"
                onPress={() => router.replace('/login')}
                style={styles.cta}
              />
              <Pressable onPress={() => setSent(false)} hitSlop={layout.hitSlop} style={styles.resend}>
                <Text style={styles.link}>Renvoyer le lien</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="key-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.subtitle}>
                Entrez votre email, on vous envoie un lien pour réinitialiser votre mot de passe.
              </Text>

              <Input
                label="Email"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={error}
                containerStyle={styles.input}
              />

              <Button
                label="Envoyer le lien"
                size="lg"
                loading={loading}
                icon="paper-plane-outline"
                onPress={submit}
                style={styles.cta}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 48, justifyContent: 'center', paddingHorizontal: layout.screenPadding - 6 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.white },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  input: { marginTop: spacing.xxl },
  cta: { marginTop: spacing.xl },
  successBlock: { alignItems: 'center', paddingTop: spacing.huge },
  centered: { textAlign: 'center' },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  email: { fontFamily: fonts.semibold, color: colors.white },
  resend: { marginTop: spacing.xl },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
