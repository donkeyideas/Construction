import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, FileText, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase, apiCall } from '@/lib/supabase';

type Tab = 'changes' | 'rfis' | 'submittals';

export default function ApprovalsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [tab, setTab] = useState<Tab>('changes');
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [rfis, setRfis] = useState<any[]>([]);
  const [submittals, setSubmittals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const companyId = userCompany.companyId;

    const [coRes, rfiRes, subRes] = await Promise.all([
      supabase.from('change_orders').select('id, number, title, status, amount, project_id, projects(name), created_at')
        .eq('company_id', companyId).in('status', ['pending', 'submitted']).order('created_at', { ascending: false }).limit(30),
      supabase.from('rfis').select('id, number, subject, status, priority, project_id, projects(name), created_at')
        .eq('company_id', companyId).eq('status', 'open').order('created_at', { ascending: false }).limit(30),
      supabase.from('submittals').select('id, number, title, status, project_id, projects(name), created_at')
        .eq('company_id', companyId).in('status', ['pending', 'submitted']).order('created_at', { ascending: false }).limit(30),
    ]);

    setChangeOrders(coRes.data ?? []);
    setRfis(rfiRes.data ?? []);
    setSubmittals(subRes.data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function approveItem(type: string, id: string) {
    const endpoint = type === 'change_order'
      ? '/api/projects/change-orders'
      : type === 'rfi'
      ? '/api/projects/rfis'
      : '/api/projects/submittals';

    const { error } = await apiCall(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ id, status: 'approved' }),
    });

    if (error) Alert.alert('Error', error);
    else fetchData();
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'changes', label: 'Change Orders', count: changeOrders.length },
    { key: 'rfis', label: 'RFIs', count: rfis.length },
    { key: 'submittals', label: 'Submittals', count: submittals.length },
  ];

  const items = tab === 'changes' ? changeOrders : tab === 'rfis' ? rfis : submittals;
  const itemType = tab === 'changes' ? 'change_order' : tab === 'rfis' ? 'rfi' : 'submittal';

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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Approvals</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.key ? colors.blue : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: tab === t.key ? '600' : '400', color: tab === t.key ? colors.blue : colors.muted }}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {items.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No pending items</Text>
        ) : (
          items.map((item: any) => (
            <View key={item.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {tab === 'rfis' ? <AlertCircle size={18} color={colors.amber} /> : <FileText size={18} color={colors.blue} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {item.number ? `#${item.number} ` : ''}{item.title ?? item.subject ?? ''}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {(item.projects as any)?.name ?? ''}
                    {item.amount ? ` · $${Number(item.amount).toLocaleString()}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => approveItem(itemType, item.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.md, backgroundColor: colors.greenLight }}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={16} color={colors.green} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.green }}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
