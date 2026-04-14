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
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const FILTERS = ['All', 'Pending', 'Paid', 'Overdue'];

export default function VendorInvoicesScreen() {
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    let query = supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, status, due_date, client_name, vendor_name, created_at')
      .eq('company_id', userCompany.companyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'Pending') query = query.in('status', ['sent', 'received']);
    else if (filter === 'Paid') query = query.eq('status', 'paid');
    else if (filter === 'Overdue') query = query.eq('status', 'overdue');

    const { data } = await query;
    setInvoices(data ?? []);
    setLoading(false);
  }, [userCompany, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const statusColor = (s: string) =>
    s === 'paid' ? colors.green :
    s === 'overdue' ? colors.red : colors.amber;

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
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Invoices</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: filter === f ? colors.blue : colors.border, backgroundColor: colors.cardBg }}
          >
            <Text style={{ fontSize: 12, fontWeight: filter === f ? '600' : '400', color: filter === f ? colors.blue : colors.muted }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {invoices.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <FileText size={36} color={colors.muted} />
            <Text style={{ color: colors.muted }}>No invoices found</Text>
          </View>
        ) : (
          invoices.map((inv: any) => (
            <View key={inv.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {inv.invoice_number ?? 'No #'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {inv.vendor_name ?? inv.client_name ?? '—'}
                  {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  ${inv.total_amount?.toLocaleString() ?? '—'}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(inv.status), textTransform: 'uppercase' }}>
                  {inv.status}
                </Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
