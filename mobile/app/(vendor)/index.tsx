import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, CreditCard, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function VendorDashboard() {
  const { colors, radii } = useTheme();
  const { userCompany, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pendingInvoices: 0, totalOwed: 0 });

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Vendor';

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('invoices')
      .select('id, total_amount, status')
      .eq('company_id', userCompany.companyId)
      .eq('invoice_type', 'accounts_payable')
      .in('status', ['received', 'sent', 'overdue']);

    const invoices = data ?? [];
    setStats({
      pendingInvoices: invoices.length,
      totalOwed: invoices.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0),
    });
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const kpis = [
    { icon: FileText, label: 'Open Invoices', value: String(stats.pendingInvoices), color: colors.amber },
    { icon: CreditCard, label: 'Total Owed', value: `$${stats.totalOwed.toLocaleString()}`, color: colors.green },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Hello, {firstName}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Vendor Dashboard</Text>
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
            Submit invoices and track payment status from the tabs below.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
