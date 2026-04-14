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
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();
  const { signUp, loading } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('commercial');

  async function handleRegister() {
    if (!fullName.trim() || !companyName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    const { error } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      industryType: industry,
    });
    if (error) {
      Alert.alert('Registration Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  }

  const label = (text: string) => (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: colors.text,
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: spacing.lg,
        textTransform: 'uppercase',
      }}
    >
      {text}
    </Text>
  );

  const input = (
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
    opts?: { secure?: boolean; keyboard?: 'email-address' | 'default' }
  ) => (
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
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={value}
      onChangeText={onChange}
      secureTextEntry={opts?.secure}
      keyboardType={opts?.keyboard ?? 'default'}
      autoCapitalize={opts?.keyboard === 'email-address' ? 'none' : 'words'}
    />
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: spacing.xl }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 4,
          }}
        >
          Create Account
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
          Start your 14-day free trial
        </Text>

        {label('Full Name')}
        {input(fullName, setFullName, 'John Doe')}

        {label('Company Name')}
        {input(companyName, setCompanyName, 'Acme Construction')}

        {label('Email')}
        {input(email, setEmail, 'you@company.com', { keyboard: 'email-address' })}

        {label('Password')}
        {input(password, setPassword, 'Min 8 characters', { secure: true })}

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: colors.blue,
            padding: 16,
            borderRadius: radii.md,
            alignItems: 'center',
            marginTop: spacing.xl,
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 14, color: colors.muted }}>
              Already have an account?{' '}
              <Text style={{ color: colors.blue, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
