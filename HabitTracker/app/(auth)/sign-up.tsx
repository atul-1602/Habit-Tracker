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
import { useSignUp } from '@clerk/expo/legacy';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Zap, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, MIN_PASSWORD_LENGTH } from '../../src/lib/constants';
import { parseClerkError } from '../../src/lib/clerkErrors';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1: Create account ──────────────────────────────
  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Create a fresh sign-up instance with email & password.
      // NOTE: the "name" attribute is disabled on this Clerk instance, so we
      // cannot send `firstName`/`lastName` (Clerk rejects unknown params).
      // The full name is stored in unsafeMetadata instead and read back on
      // the profile screen.
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        unsafeMetadata: { fullName: name.trim() },
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setStep('verify');
    } catch (err: any) {
      if (__DEV__) console.log('SignUp error:', JSON.stringify(err, null, 2));
      setError(parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify email code ───────────────────────────
  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;
    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      // Check status after verification
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Mark onboarding as NOT seen yet
        await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        router.replace('/onboarding');
      } else {
        setError(`Verification status: ${completeSignUp.status}.`);
      }
    } catch (err: any) {
      if (__DEV__) console.log('Verification error:', JSON.stringify(err, null, 2));
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

        {step === 'form' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSub}>Start your journey to better habits</Text>

            {/* Full Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputRow}>
                <User size={18} color="#707070" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor="#707070"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Email */}
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

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
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

            {/* Confirm Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={[
                styles.inputRow,
                confirmPassword && password !== confirmPassword && styles.inputRowError,
              ]}>
                <Lock size={18} color="#707070" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Repeat your password"
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
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.primaryBtnText}>Create Account</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Verification Step ── */
          <View style={styles.card}>
            <View style={styles.verifyIcon}>
              <Mail size={32} color="#C7F464" />
            </View>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.cardSub}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Verification Code</Text>
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

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => {
                // Return to the form. We intentionally keep the entered email
                // so the user can edit it; a new signUp is created on submit.
                setCode('');
                setError('');
                setStep('form');
              }}
            >
              <Text style={styles.resendText}>← Change email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}> Sign In</Text>
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
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#707070', marginBottom: 24, lineHeight: 22 },

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

  verifyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C7F46420',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emailHighlight: { color: '#C7F464', fontWeight: '700' },

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
  footerText: { fontSize: 14, color: '#707070' },
  footerLink: { fontSize: 14, color: '#C7F464', fontWeight: '700' },
});
