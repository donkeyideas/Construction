import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, FileText, CreditCard, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function TenantDashboard() {
  const { colors, radii } = useTheme();
  const { userCompany, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ openRequests: 0, pendingPayments: 0 });

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Tenant';

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const companyId = userCompany.companyId;

    const [reqRes, payRes] = await Promise.all([
      supabase.from('maintenance_requests').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).in('status', ['open', 'in_progress']),
      supabase.from('rent_payments').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('status', 'pending'),
    ]);

    setStats({
      openRequests: reqRes.count ?? 0,
      pendingPayments: payRes.count ?? 0,
    });
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const kpis = [
    { icon: Wrench, label: 'Open Requests', value: String(stats.openRequests), color: colors.amber },
    { icon: CreditCard, label: 'Pending Payments', value: String(stats.pendingPayments), color: colors.red },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Hello, {firstName}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Tenant Dashboard</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {kpis.map((k, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <k.icon size={18} color={k.color} />
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8 }}>{k.value}</Text>
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8 }}>
          <AlertCircle size={24} color={colors.muted} />
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
            Submit maintenance requests, view your lease, and manage payments from the tabs below.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
