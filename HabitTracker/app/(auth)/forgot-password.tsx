import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { useSignIn } from '@clerk/expo/legacy';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Zap, CheckCircle2, KeyRound } from 'lucide-react-native';
import { MIN_PASSWORD_LENGTH } from '../../src/lib/constants';
import { parseClerkError } from '../../src/lib/clerkErrors';

export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1: Send a reset code to the account's email ────────
  const handleRequestCode = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim().toLowerCase(),
      });
      setStep('reset');
    } catch (err: any) {
      if (__DEV__) console.log('ForgotPassword request error:', JSON.stringify(err, null, 2));
      setError(parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify the code and set a new password ───────────
  const handleResetPassword = async () => {
    if (!isLoaded || !signIn) return;
    if (!code.trim()) {
      setError('Please enter the code we emailed you.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
      });

      if (attempt.status === 'needs_new_password' || attempt.status === 'complete') {
        const completed = await signIn.resetPassword({
          password,
          signOutOfOtherSessions: true,
        });

        if (completed.status === 'complete') {
          await setActive({ session: completed.createdSessionId });
          router.replace('/(tabs)');
          return;
        }
        setError(`Reset incomplete (status: ${completed.status}). Please try again.`);
      } else {
        setError(`Verification status: ${attempt.status}.`);
      }
    } catch (err: any) {
      if (__DEV__) console.log('ForgotPassword reset error:', JSON.stringify(err, null, 2));
      setError(parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Zap size={32} color="#111111" fill="#111111" />
          </View>
          <Text style={styles.logoText}>Habit Tracker</Text>
        </View>

        {step === 'request' ? (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <KeyRound size={32} color="#C7F464" />
            </View>
            <Text style={styles.cardTitle}>Reset your password</Text>
            <Text style={styles.cardSub}>
              Enter the email on your account and we'll send you a code to reset your password.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputRow}>
                <Mail size={18} color="#707070" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#707070"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRequestCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.primaryBtnText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Step 2: Code + new password ── */
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Mail size={32} color="#C7F464" />
            </View>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.cardSub}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Reset Code</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor="#707070"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color="#707070" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
                  placeholderTextColor="#707070"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword
                    ? <EyeOff size={18} color="#707070" />
                    : <Eye size={18} color="#707070" />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <View style={[
                styles.inputRow,
                confirmPassword && password !== confirmPassword && styles.inputRowError,
              ]}>
                <Lock size={18} color="#707070" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Repeat your new password"
                  placeholderTextColor="#707070"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle2 size={18} color="#C7F464" />
                )}
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.primaryBtnText}>Reset Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => {
                setCode('');
                setPassword('');
                setConfirmPassword('');
                setError('');
                setStep('request');
              }}
            >
              <Text style={styles.resendText}>← Change email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>← Back to Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  scroll: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C7F464',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#C7F464',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },

  card: {
    backgroundColor: '#1C1C1F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 24,
    marginBottom: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C7F46420',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  cardSub: { fontSize: 14, color: '#707070', marginBottom: 24, lineHeight: 22, textAlign: 'center' },
  emailHighlight: { color: '#C7F464', fontWeight: '700' },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#B5B5B5', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3F3F3F',
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowError: { borderColor: '#FF784960' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  eyeBtn: { padding: 4 },

  codeInput: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3F3F3F',
    height: 68,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C7F464',
    letterSpacing: 12,
  },

  errorBox: {
    backgroundColor: '#FF784920',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FF784940',
  },
  errorText: { fontSize: 13, color: '#FF7849' },

  primaryBtn: {
    backgroundColor: '#C7F464',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C7F464',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: 'bold', color: '#111111' },

  resendBtn: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 14, color: '#707070' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerLink: { fontSize: 14, color: '#C7F464', fontWeight: '700' },
});
