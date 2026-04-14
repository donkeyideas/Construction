import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MapPin, Play, Square } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { apiCall } from '@/lib/supabase';

export default function ClockScreen() {
  const { colors, radii, spacing } = useTheme();
  const { userCompany } = useAuthStore();
  const [openEntry, setOpenEntry] = useState<any>(null);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState('0:00:00');

  const today = new Date().toISOString().split('T')[0];
  const isClockedIn = !!openEntry;

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const [timeRes, projRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, clock_in, clock_out, hours, project_id, projects(name)')
        .eq('company_id', userCompany.companyId)
        .eq('user_id', userCompany.userId)
        .eq('entry_date', today)
        .order('clock_in', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userCompany.companyId)
        .in('status', ['active', 'pre_construction'])
        .order('name'),
    ]);
    const entries = timeRes.data ?? [];
    setTodayEntries(entries);
    setOpenEntry(entries.find((e: any) => e.clock_in && !e.clock_out) ?? null);
    setProjects(projRes.data ?? []);
  }, [userCompany, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Elapsed timer
  useEffect(() => {
    if (!openEntry?.clock_in) { setElapsed('0:00:00'); return; }
    const tick = () => {
      const diff = Date.now() - new Date(openEntry.clock_in).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [openEntry]);

  async function getGps() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { lat: null, lng: null };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {
      return { lat: null, lng: null };
    }
  }

  async function handleClockIn() {
    setLoading(true);
    const gps = await getGps();
    const { error } = await apiCall('/api/mobile/clock', {
      method: 'POST',
      body: JSON.stringify({
        project_id: selectedProject,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
      }),
    });
    if (error) Alert.alert('Error', error);
    await fetchData();
    setLoading(false);
  }

  async function handleClockOut() {
    if (!openEntry) return;
    setLoading(true);
    const gps = await getGps();
    const { error } = await apiCall('/api/mobile/clock', {
      method: 'PATCH',
      body: JSON.stringify({
        entry_id: openEntry.id,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
      }),
    });
    if (error) Alert.alert('Error', error);
    await fetchData();
    setLoading(false);
  }

  const totalHours = todayEntries.reduce((s: number, e: any) => s + (e.hours ?? 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Clock In / Out</Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Timer Display */}
        <View style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {elapsed}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isClockedIn ? colors.green : colors.red }} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            Today: {totalHours.toFixed(1)} hours logged
          </Text>
        </View>

        {/* Project Picker */}
        {!isClockedIn && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              SELECT PROJECT
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {projects.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: selectedProject === p.id ? colors.blue : colors.border,
                    backgroundColor: colors.cardBg,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: selectedProject === p.id ? '600' : '400', color: selectedProject === p.id ? colors.blue : colors.text }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Clock Button */}
        <TouchableOpacity
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          style={{
            backgroundColor: isClockedIn ? colors.red : colors.green,
            padding: 20,
            borderRadius: radii.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {isClockedIn ? <Square size={24} color="#fff" /> : <Play size={24} color="#fff" />}
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Today's entries */}
        {todayEntries.length > 0 && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              TODAY'S ENTRIES
            </Text>
            {todayEntries.map((e: any) => (
              <View key={e.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>
                    {(e.projects as any)?.name ?? 'No project'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {new Date(e.clock_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {e.clock_out ? ` — ${new Date(e.clock_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ' — Now'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {e.hours ? `${e.hours.toFixed(1)}h` : '—'}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
