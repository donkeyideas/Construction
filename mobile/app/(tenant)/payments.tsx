import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, DollarSign } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function TenantPaymentsScreen() {
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('rent_payments')
      .select('id, amount, payment_date, status, payment_method, period_start, period_end')
      .eq('company_id', userCompany.companyId)
      .order('payment_date', { ascending: false })
      .limit(50);
    setPayments(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const statusColor = (s: string) =>
    s === 'completed' || s === 'paid' ? colors.green :
    s === 'pending' ? colors.amber :
    s === 'overdue' ? colors.red : colors.muted;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Payments</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {payments.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <CreditCard size={36} color={colors.muted} />
            <Text style={{ color: colors.muted }}>No payment history</Text>
          </View>
        ) : (
          payments.map((p: any) => (
            <View key={p.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  ${p.amount?.toLocaleString() ?? '—'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : ''}
                  {p.payment_method ? ` · ${p.payment_method}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(p.status), textTransform: 'uppercase' }}>
                {p.status}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
