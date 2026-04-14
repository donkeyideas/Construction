import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, Mail, Phone, Building2, Shield } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { user, userCompany } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (!userCompany) return;
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userCompany.userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setFullName(data?.full_name ?? '');
        setPhone(data?.phone ?? '');
        setJobTitle(data?.job_title ?? '');
        setLoading(false);
      });
  }, [userCompany]);

  async function handleSave() {
    if (!userCompany) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName, phone, job_title: jobTitle })
      .eq('id', userCompany.userId);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Saved', 'Profile updated successfully');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.blue} /> : <Save size={20} color={colors.blue} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
              {fullName.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
            {userCompany?.role ?? 'Member'} · {userCompany?.companyName ?? ''}
          </Text>
        </View>

        {/* Form */}
        <View style={card(colors, radii)}>
          <Field label="Full Name" icon={Building2} value={fullName} onChange={setFullName} colors={colors} radii={radii} />
          <Field label="Email" icon={Mail} value={user?.email ?? ''} colors={colors} radii={radii} editable={false} />
          <Field label="Phone" icon={Phone} value={phone} onChange={setPhone} colors={colors} radii={radii} keyboardType="phone-pad" />
          <Field label="Job Title" icon={Shield} value={jobTitle} onChange={setJobTitle} colors={colors} radii={radii} />
        </View>

        {/* Company Info */}
        <View style={card(colors, radii)}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>COMPANY</Text>
          <Row label="Company" value={userCompany?.companyName ?? '—'} colors={colors} />
          <Row label="Role" value={userCompany?.role ?? '—'} colors={colors} />
          <Row label="Member Since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} colors={colors} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function card(colors: any, radii: any) {
  return { backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border } as const;
}

function Field({ label, icon: Icon, value, onChange, colors, radii, editable = true, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, backgroundColor: editable ? colors.cardBg : colors.surface }}>
        <Icon size={16} color={colors.muted} />
        <TextInput
          style={{ flex: 1, padding: 12, fontSize: 14, color: editable ? colors.text : colors.muted }}
          value={value}
          onChangeText={onChange}
          editable={editable}
          keyboardType={keyboardType}
          placeholderTextColor={colors.muted}
        />
      </View>
    </View>
  );
}

function Row({ label, value, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{value}</Text>
    </View>
  );
}
