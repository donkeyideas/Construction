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
import { ArrowLeft, Plus, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SafetyListScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('safety_incidents')
      .select('id, incident_type, severity, description, status, incident_date, project_id, projects(name)')
      .eq('company_id', userCompany.companyId)
      .order('incident_date', { ascending: false })
      .limit(50);
    setIncidents(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const sevColor = (s: string) =>
    s === 'critical' ? colors.red :
    s === 'high' ? colors.red :
    s === 'medium' ? colors.amber : colors.green;

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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Safety</Text>
        <TouchableOpacity
          onPress={() => router.push('/(screens)/safety/report')}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {incidents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <ShieldCheck size={40} color={colors.green} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>No safety incidents reported</Text>
          </View>
        ) : (
          incidents.map((inc: any) => (
            <View key={inc.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color={sevColor(inc.severity)} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
                    {inc.incident_type?.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: sevColor(inc.severity), textTransform: 'uppercase' }}>
                  {inc.severity}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4 }} numberOfLines={2}>
                {inc.description}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {(inc.projects as any)?.name ?? 'No project'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString() : ''}
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
