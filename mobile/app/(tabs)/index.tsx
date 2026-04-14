import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  ClipboardList,
  Camera,
  ShieldCheck,
  Bell,
  MapPin,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Users,
  BarChart3,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, fonts: f, spacing, radii } = useTheme();
  const { userCompany, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayHours, setTodayHours] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [safetyCount, setSafetyCount] = useState(0);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there';
  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { companyId, userId } = userCompany;

    const [timeRes, projRes, taskRes, actRes, teamRes, safetyRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, clock_in, clock_out, hours, project_id, projects(name)')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('entry_date', today)
        .order('clock_in', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name, code, address_line1, city, state, status')
        .eq('company_id', companyId)
        .in('status', ['active', 'pre_construction'])
        .order('name')
        .limit(3),
      supabase
        .from('project_tasks')
        .select('id, name, status, priority, project_id, projects(name, code)')
        .eq('company_id', companyId)
        .eq('assigned_to', userId)
        .in('status', ['not_started', 'in_progress'])
        .order('priority')
        .limit(5),
      supabase
        .from('audit_log')
        .select('id, action, entity_type, details, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('company_members')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('safety_incidents')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('incident_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const entries = timeRes.data ?? [];
    const open = entries.find((e: any) => e.clock_in && !e.clock_out);
    setIsClockedIn(!!open);
    setTodayHours(entries.reduce((s: number, e: any) => s + (e.hours ?? 0), 0));
    setProjects(projRes.data ?? []);
    setTasks(taskRes.data ?? []);
    setActivity(actRes.data ?? []);
    setTeamCount(teamRes.count ?? 0);
    setSafetyCount(safetyRes.count ?? 0);
  }, [userCompany, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const kpiData = [
    { icon: BarChart3, color: colors.blue, value: `${projects.length}`, label: 'ACTIVE PROJECTS' },
    { icon: Clock, color: colors.green, value: `${todayHours.toFixed(1)}h`, label: 'TODAY' },
    { icon: Users, color: colors.amber, value: String(teamCount), label: 'TEAM' },
    { icon: AlertTriangle, color: colors.red, value: String(safetyCount), label: 'SAFETY' },
  ];

  const quickActions = [
    { icon: Clock, label: 'Clock In', onPress: () => router.push('/(tabs)/clock') },
    { icon: ClipboardList, label: 'Daily Log', onPress: () => router.push('/(tabs)/daily-log') },
    { icon: Camera, label: 'Photo', onPress: () => router.push('/(screens)/photos') },
    { icon: ShieldCheck, label: 'Safety', onPress: () => router.push('/(screens)/safety') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text style={{ fontFamily: f.heading, fontSize: 20, fontWeight: '700', color: colors.text }}>
            Hello, {firstName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Bell size={18} color={colors.text} />
          </TouchableOpacity>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.blue,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {/* Clock Status Card */}
        <View style={cardStyle(colors, radii)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isClockedIn ? colors.green : colors.red,
                }}
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Today: <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{todayHours.toFixed(1)}h</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/clock')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: radii.md,
                backgroundColor: isClockedIn ? colors.red : colors.green,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              activeOpacity={0.8}
            >
              <Clock size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {kpiData.map((kpi, i) => (
            <View key={i} style={[cardStyle(colors, radii), { flex: 1, minWidth: '45%' }]}>
              <kpi.icon size={18} color={kpi.color} />
              <Text style={{ fontFamily: f.heading, fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 }}>
                {kpi.value}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {kpi.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={sectionTitle(colors)}>QUICK ACTIONS</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {quickActions.map((qa, i) => (
            <TouchableOpacity
              key={i}
              onPress={qa.onPress}
              style={[cardStyle(colors, radii), { flex: 1, alignItems: 'center', paddingVertical: 14 }]}
              activeOpacity={0.7}
            >
              <qa.icon size={22} color={colors.blue} />
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.text, marginTop: 6 }}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Projects */}
        {projects.length > 0 && (
          <>
            <Text style={sectionTitle(colors)}>ACTIVE PROJECTS</Text>
            {projects.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                style={[cardStyle(colors, radii), { flexDirection: 'row', alignItems: 'center', gap: 14 }]}
                activeOpacity={0.7}
              >
                <Building2 size={20} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color={colors.muted} />
                    <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>
                      {[p.city, p.state].filter(Boolean).join(', ') || 'No address'}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: p.status === 'active' ? colors.green : colors.amber,
                    textTransform: 'uppercase',
                  }}
                >
                  {p.status === 'pre_construction' ? 'PLANNING' : p.status?.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <>
            <Text style={sectionTitle(colors)}>YOUR TASKS</Text>
            <View style={cardStyle(colors, radii)}>
              {tasks.map((t: any, i: number) => (
                <View
                  key={t.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    paddingVertical: 10,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: colors.border,
                      marginTop: 1,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{t.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {(t.projects as any)?.name ?? 'Unassigned'}
                      {'  '}
                      <Text
                        style={{
                          fontWeight: '600',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          color:
                            t.priority === 'high' ? colors.red :
                            t.priority === 'medium' ? colors.amber : colors.green,
                        }}
                      >
                        {t.priority}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Activity */}
        {activity.length > 0 && (
          <>
            <Text style={sectionTitle(colors)}>RECENT ACTIVITY</Text>
            <View style={cardStyle(colors, radii)}>
              {activity.map((a: any, i: number) => (
                <View
                  key={a.id}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    paddingVertical: 10,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                    alignItems: 'flex-start',
                  }}
                >
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginTop: 5 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      {a.action.replace(/_/g, ' ')} {(a.details as any)?.name ?? a.entity_type ?? ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function cardStyle(colors: any, radii: any) {
  return {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;
}

function sectionTitle(colors: any) {
  return {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  };
}
