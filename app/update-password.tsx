import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen, Spinner } from '@/components';
import { authService } from '@/services';
import { useAuthStore } from '@/stores';
import { colors, fonts, layout, spacing } from '@/theme';

const MIN_LENGTH = 8;

/**
 * Landing page of the password-reset email. supabase-js reads the recovery
 * token from the URL (detectSessionInUrl, web) and opens a temporary session;
 * this screen then sets the new password on it.
 */
export default function UpdatePasswordScreen() {
  const router = useRouter();
  const restore = useAuthStore((s) => s.restore);
  const [checking, setChecking] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; submit?: string }>({});
  const [saving, setSaving] = useState(false);

  // The recovery session is created while the client initialises.
  useEffect(() => {
    let active = true;
    authService
      .hasSession()
      .then((ok) => active && setLinkValid(ok))
      .catch(() => active && setLinkValid(false))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    const next: typeof errors = {};
    if (password.length < MIN_LENGTH) next.password = `Au moins ${MIN_LENGTH} caractères`;
    if (confirm !== password) next.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await authService.updatePassword(password);
      await restore(); // the recovery session is a normal login: sync the store
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'Modification impossible, réessayez.' });
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          {checking ? (
            <View style={styles.center}>
              <Spinner size="large" />
            </View>
          ) : !linkValid ? (
            <>
              <View style={[styles.iconWrap, styles.iconWrapDanger]}>
                <Ionicons name="link-outline" size={40} color={colors.danger} />
              </View>
              <Text style={styles.title}>Lien invalide ou expiré</Text>
              <Text style={styles.subtitle}>
                Ce lien de réinitialisation n’est plus valable. Demandez-en un nouveau.
              </Text>
              <Button
                label="Demander un nouveau lien"
                size="lg"
                icon="refresh"
                onPress={() => router.replace('/reset-password')}
                style={styles.cta}
              />
            </>
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>Nouveau mot de passe</Text>
              <Text style={styles.subtitle}>Choisissez un mot de passe d’au moins {MIN_LENGTH} caractères.</Text>

              <Input
                label="Nouveau mot de passe"
                icon="lock-closed-outline"
                rightIcon={show ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShow((v) => !v)}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                containerStyle={styles.input}
              />
              <Input
                label="Confirmer"
                icon="lock-closed-outline"
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="new-password"
                value={confirm}
                onChangeText={setConfirm}
                error={errors.confirm}
                containerStyle={styles.inputNext}
              />
              {!!errors.submit && <Text style={styles.submitError}>{errors.submit}</Text>}

              <Button
                label="Enregistrer"
                size="lg"
                icon="checkmark"
                loading={saving}
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
  body: { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.huge },
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
  iconWrapDanger: { backgroundColor: colors.dangerSoft },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: spacing.sm },
  input: { marginTop: spacing.xxl },
  inputNext: { marginTop: spacing.lg },
  submitError: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger, marginTop: spacing.md },
  cta: { marginTop: spacing.xl },
});
