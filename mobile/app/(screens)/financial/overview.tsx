import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function FinancialOverviewScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalAR: 0, totalAP: 0, bankBalance: 0, invoiceCount: 0 });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const companyId = userCompany.companyId;

    const [arRes, apRes, bankRes, invRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('company_id', companyId)
        .eq('invoice_type', 'accounts_receivable')
        .in('status', ['sent', 'overdue']),
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('company_id', companyId)
        .eq('invoice_type', 'accounts_payable')
        .in('status', ['received', 'overdue']),
      supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', companyId)
        .eq('is_active', true),
      supabase
        .from('invoices')
        .select('id, invoice_number, vendor_name, client_name, total_amount, status, invoice_type, due_date')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const totalAR = (arRes.data ?? []).reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0);
    const totalAP = (apRes.data ?? []).reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0);
    const bankBalance = (bankRes.data ?? []).reduce((s: number, b: any) => s + (b.current_balance ?? 0), 0);

    setStats({ totalAR, totalAP, bankBalance, invoiceCount: invRes.data?.length ?? 0 });
    setRecentInvoices(invRes.data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  const kpis = [
    { icon: TrendingUp, label: 'Receivable', value: fmt(stats.totalAR), color: colors.green },
    { icon: TrendingDown, label: 'Payable', value: fmt(stats.totalAP), color: colors.red },
    { icon: CreditCard, label: 'Bank Balance', value: fmt(stats.bankBalance), color: colors.blue },
    { icon: DollarSign, label: 'Invoices', value: String(stats.invoiceCount), color: colors.amber },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Financial</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {/* KPI Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {kpis.map((k, i) => (
            <View key={i} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <k.icon size={18} color={k.color} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 }}>{k.value}</Text>
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Invoices */}
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          RECENT INVOICES
        </Text>
        {recentInvoices.map((inv: any) => (
          <View key={inv.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                {inv.invoice_number ?? 'No #'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {inv.vendor_name ?? inv.client_name ?? '—'}
                {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {inv.total_amount ? fmt(inv.total_amount) : '—'}
              </Text>
              <Text style={{
                fontSize: 10, fontWeight: '600', textTransform: 'uppercase',
                color: inv.status === 'paid' ? colors.green : inv.status === 'overdue' ? colors.red : colors.amber,
              }}>
                {inv.status}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
