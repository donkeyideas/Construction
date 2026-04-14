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
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  ClipboardList,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Tab = 'overview' | 'tasks' | 'logs' | 'rfis' | 'changes';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'logs', label: 'Logs' },
  { key: 'rfis', label: 'RFIs' },
  { key: 'changes', label: 'Changes' },
];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();
  const { userCompany } = useAuthStore();

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [rfis, setRfis] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany || !id) return;
    const companyId = userCompany.companyId;

    const [projRes, taskRes, logRes, rfiRes, coRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single(),
      supabase
        .from('project_tasks')
        .select('id, name, status, priority, assigned_to, due_date')
        .eq('project_id', id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('daily_logs')
        .select('id, log_date, weather, work_performed, created_at, user_id')
        .eq('project_id', id)
        .eq('company_id', companyId)
        .order('log_date', { ascending: false })
        .limit(20),
      supabase
        .from('rfis')
        .select('id, number, subject, status, priority, created_at')
        .eq('project_id', id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('change_orders')
        .select('id, number, title, status, amount, created_at')
        .eq('project_id', id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setProject(projRes.data);
    setTasks(taskRes.data ?? []);
    setLogs(logRes.data ?? []);
    setRfis(rfiRes.data ?? []);
    setChangeOrders(coRes.data ?? []);
    setLoading(false);
  }, [userCompany, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const statusColor = (s: string) =>
    s === 'active' ? colors.green :
    s === 'pre_construction' ? colors.amber :
    s === 'on_hold' ? colors.red :
    s === 'completed' ? colors.blue : colors.muted;

  const statusLabel = (s: string) =>
    s === 'pre_construction' ? 'Planning' : s?.replace(/_/g, ' ');

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Project not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{project.code}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor(project.status), textTransform: 'uppercase' }}>
          {statusLabel(project.status)}
        </Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: tab === t.key ? colors.blue : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: tab === t.key ? '600' : '400', color: tab === t.key ? colors.blue : colors.muted }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {tab === 'overview' && (
          <>
            {/* Info Card */}
            <View style={card(colors, radii)}>
              <Row icon={MapPin} color={colors.muted} label="Address" value={[project.address_line1, project.city, project.state].filter(Boolean).join(', ') || '—'} colors={colors} />
              <Row icon={Calendar} color={colors.muted} label="Start" value={project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'} colors={colors} />
              <Row icon={Calendar} color={colors.muted} label="End" value={project.end_date ? new Date(project.end_date).toLocaleDateString() : '—'} colors={colors} />
              <Row icon={DollarSign} color={colors.muted} label="Budget" value={project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'} colors={colors} />
            </View>

            {/* Progress */}
            <View style={card(colors, radii)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>COMPLETION</Text>
              <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: (project.estimated_completion_pct ?? 0) > 80 ? colors.green : colors.blue, width: `${Math.min(project.estimated_completion_pct ?? 0, 100)}%` }} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 }}>
                {project.estimated_completion_pct ?? 0}%
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{tasks.length}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Tasks</Text>
              </View>
              <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{rfis.length}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>RFIs</Text>
              </View>
              <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{changeOrders.length}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>COs</Text>
              </View>
            </View>
          </>
        )}

        {tab === 'tasks' && (
          <>
            {tasks.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No tasks yet</Text>
            ) : (
              tasks.map((t: any) => (
                <View key={t.id} style={[card(colors, radii), { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    borderWidth: 2,
                    borderColor: t.status === 'completed' ? colors.green : colors.border,
                    backgroundColor: t.status === 'completed' ? colors.greenLight : 'transparent',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {t.status === 'completed' && <CheckCircle size={14} color={colors.green} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{t.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <Text style={{
                        fontSize: 10, fontWeight: '600', textTransform: 'uppercase',
                        color: t.priority === 'high' ? colors.red : t.priority === 'medium' ? colors.amber : colors.green,
                      }}>
                        {t.priority}
                      </Text>
                      {t.due_date && (
                        <Text style={{ fontSize: 10, color: colors.muted }}>
                          Due {new Date(t.due_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.status?.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'logs' && (
          <>
            {logs.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No daily logs yet</Text>
            ) : (
              logs.map((l: any) => (
                <View key={l.id} style={card(colors, radii)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {new Date(l.log_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    {l.weather && (
                      <Text style={{ fontSize: 11, color: colors.muted }}>{l.weather}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }} numberOfLines={3}>
                    {l.work_performed}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'rfis' && (
          <>
            {rfis.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No RFIs yet</Text>
            ) : (
              rfis.map((r: any) => (
                <View key={r.id} style={[card(colors, radii), { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <AlertCircle size={18} color={r.status === 'open' ? colors.amber : r.status === 'closed' ? colors.green : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                      {r.number ? `RFI #${r.number}` : ''} {r.subject}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 10, fontWeight: '600', textTransform: 'uppercase',
                    color: r.status === 'open' ? colors.amber : r.status === 'closed' ? colors.green : colors.muted,
                  }}>
                    {r.status}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'changes' && (
          <>
            {changeOrders.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No change orders yet</Text>
            ) : (
              changeOrders.map((co: any) => (
                <View key={co.id} style={[card(colors, radii), { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <FileText size={18} color={co.status === 'approved' ? colors.green : co.status === 'rejected' ? colors.red : colors.amber} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                      {co.number ? `CO #${co.number}` : ''} {co.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {co.amount ? `$${Number(co.amount).toLocaleString()}` : '—'} · {new Date(co.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 10, fontWeight: '600', textTransform: 'uppercase',
                    color: co.status === 'approved' ? colors.green : co.status === 'rejected' ? colors.red : colors.amber,
                  }}>
                    {co.status}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function card(colors: any, radii: any) {
  return {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;
}

function Row({ icon: Icon, color, label, value, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Icon size={16} color={color} />
      <Text style={{ fontSize: 12, color: colors.muted, width: 50 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{value}</Text>
    </View>
  );
}
