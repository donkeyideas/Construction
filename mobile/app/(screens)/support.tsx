import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, CircleHelp } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { apiCall } from '@/lib/supabase';

export default function SupportScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    const { error } = await apiCall('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: subject.trim(),
        description: message.trim(),
        priority: 'medium',
      }),
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error); }
    else {
      Alert.alert('Sent', 'Support ticket created successfully');
      router.back();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <CircleHelp size={20} color={colors.blue} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Help & Support</Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>SUBJECT</Text>
          <TextInput
            style={{ padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 15, color: colors.text, backgroundColor: colors.cardBg }}
            placeholder="Brief description of your issue"
            placeholderTextColor={colors.muted}
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>MESSAGE</Text>
          <TextInput
            style={{ padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 15, color: colors.text, backgroundColor: colors.cardBg, height: 150, textAlignVertical: 'top' }}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
          />
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: colors.blue, padding: 16, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
