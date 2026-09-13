import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { useSignIn } from '@clerk/expo/legacy';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react-native';
import { parseClerkError } from '../../src/lib/clerkErrors';

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!signIn) return;
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const attempt = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else if (attempt.status === 'needs_second_factor') {
        // Clerk is asking for a step-up verification (typically on a device/
        // client it hasn't seen before). There's no second-factor UI yet, so
        // fail clearly instead of showing a raw enum value.
        setError('This sign-in needs additional verification that the app doesn\'t support yet. Please try again from the device you originally signed up on, or contact support.');
      } else {
        setError('Sign in incomplete (status: ' + attempt.status + '). Please try again or contact support.');
      }
    } catch (err: any) {
      if (__DEV__) console.log('SignIn error:', JSON.stringify(err, null, 2));
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

      {/* Logo */}
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <Zap size={32} color="#111111" fill="#111111" />
        </View>
        <Text style={styles.logoText}>Habit Tracker</Text>
        <Text style={styles.logoSub}>Build habits. Track progress. Become unstoppable.</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back 👋</Text>
        <Text style={styles.cardSub}>Sign in to continue your streak</Text>

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
              placeholder="Your password"
              placeholderTextColor="#707070"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword
                ? <EyeOff size={18} color="#707070" />
                : <Eye size={18} color="#707070" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Forgot password */}
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#111111" />
            : <Text style={styles.primaryBtnText}>Sign In</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity>
            <Text style={styles.footerLink}> Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C7F464',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#C7F464',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  logoSub: { fontSize: 13, color: '#707070', textAlign: 'center' },

  card: {
    backgroundColor: '#1C1C1F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#707070', marginBottom: 24 },

  fieldWrap: { marginBottom: 16 },
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  eyeBtn: { padding: 4 },

  errorBox: {
    backgroundColor: '#FF784920',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF784940',
  },
  errorText: { fontSize: 13, color: '#FF7849' },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: '#C7F464', fontWeight: '600' },

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
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: 'bold', color: '#111111' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#707070' },
  footerLink: { fontSize: 14, color: '#C7F464', fontWeight: '700' },
});
