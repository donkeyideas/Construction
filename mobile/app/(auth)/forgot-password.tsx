import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setSending(true);
    const { error } = await resetPassword(email.trim());
    setSending(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Check Your Email', 'A password reset link has been sent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl, paddingTop: 60 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.xl }}>
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
        Forgot Password
      </Text>
      <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 32 }}>
        Enter your email and we'll send a reset link.
      </Text>

      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: colors.text,
          letterSpacing: 0.5,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        EMAIL
      </Text>
      <TextInput
        style={{
          padding: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radii.md,
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.cardBg,
        }}
        placeholder="you@company.com"
        placeholderTextColor={colors.muted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        onPress={handleReset}
        disabled={sending}
        style={{
          backgroundColor: colors.blue,
          padding: 16,
          borderRadius: radii.md,
          alignItems: 'center',
          marginTop: spacing.xl,
        }}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
