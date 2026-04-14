import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, fonts: themeFont, spacing, radii } = useTheme();
  const { signIn, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    const { error } = await signIn(email.trim(), password);
    if (error) {
      Alert.alert('Sign In Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Buildwrk',
      fallbackLabel: 'Use password',
    });
    if (result.success) {
      // Biometric success — session should already be persisted in SecureStore
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: colors.blue,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>B</Text>
          </View>
          <Text
            style={{
              fontFamily: themeFont.heading,
              fontSize: 24,
              fontWeight: '700',
              color: colors.text,
              marginBottom: 4,
            }}
          >
            Welcome Back
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Sign in to your Buildwrk account
          </Text>
        </View>

        {/* Email */}
        <Text style={labelStyle(colors)}>EMAIL</Text>
        <TextInput
          style={inputStyle(colors, radii)}
          placeholder="you@company.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Password */}
        <Text style={[labelStyle(colors), { marginTop: spacing.lg }]}>PASSWORD</Text>
        <TextInput
          style={inputStyle(colors, radii)}
          placeholder="Enter your password"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={{ alignSelf: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.xl }}
        >
          <Text style={{ fontSize: 13, color: colors.blue, fontWeight: '500' }}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        {/* Sign In */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: colors.blue,
            padding: 16,
            borderRadius: radii.md,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: spacing.xl,
            gap: 12,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontSize: 12, color: colors.muted }}>or continue with</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* Biometric */}
        <TouchableOpacity
          onPress={handleBiometric}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 14,
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
          activeOpacity={0.7}
        >
          <Fingerprint size={22} color={colors.text} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
            Sign in with Biometrics
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={{ fontSize: 14, color: colors.blue, fontWeight: '600' }}>
              Create one
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function labelStyle(colors: { text: string }) {
  return {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  };
}

function inputStyle(colors: { text: string; border: string; cardBg: string }, radii: { md: number }) {
  return {
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cardBg,
  };
}
