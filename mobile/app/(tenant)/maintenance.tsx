import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Wrench, Send } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase, apiCall } from '@/lib/supabase';

export default function TenantMaintenanceScreen() {
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('maintenance_requests')
      .select('id, title, description, status, priority, created_at')
      .eq('company_id', userCompany.companyId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
    setSubmitting(true);
    const { error } = await apiCall('/api/properties/maintenance', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), description: description.trim(), priority: 'medium' }),
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error); }
    else {
      setTitle('');
      setDescription('');
      setShowForm(false);
      fetchData();
    }
  }

  const statusColor = (s: string) =>
    s === 'completed' ? colors.green :
    s === 'in_progress' ? colors.blue :
    s === 'open' ? colors.amber : colors.muted;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Maintenance</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {showForm && (
          <View style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.blue, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>New Request</Text>
            <TextInput
              style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 14, color: colors.text, backgroundColor: colors.cardBg }}
              placeholder="Title"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 14, color: colors.text, backgroundColor: colors.cardBg, height: 80, textAlignVertical: 'top' }}
              placeholder="Describe the issue..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: colors.blue, padding: 12, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} activeOpacity={0.8}>
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Send size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Wrench size={36} color={colors.muted} />
            <Text style={{ color: colors.muted }}>No maintenance requests</Text>
          </View>
        ) : (
          requests.map((r: any) => (
            <View key={r.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{r.title}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(r.status), textTransform: 'uppercase' }}>{r.status?.replace(/_/g, ' ')}</Text>
              </View>
              {r.description && <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={2}>{r.description}</Text>}
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</Text>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
