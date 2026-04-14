import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, ImagePlus, Send, AlertTriangle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase, apiCall } from '@/lib/supabase';

const TYPES = ['Near Miss', 'Injury', 'Property Damage', 'Environmental', 'Other'];
const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];

export default function SafetyReportScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState('Near Miss');
  const [severity, setSeverity] = useState('Low');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userCompany) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', userCompany.companyId)
      .in('status', ['active', 'pre_construction'])
      .order('name')
      .then(({ data }) => setProjects(data ?? []));
  }, [userCompany]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotos((p) => [...p, result.assets[0].uri]);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotos((p) => [...p, result.assets[0].uri]);
  }

  async function handleSubmit() {
    if (!description.trim()) { Alert.alert('Error', 'Please describe the incident'); return; }
    setSubmitting(true);
    const { error } = await apiCall('/api/safety/incidents', {
      method: 'POST',
      body: JSON.stringify({
        project_id: selectedProject,
        incident_type: incidentType.toLowerCase().replace(/ /g, '_'),
        severity: severity.toLowerCase(),
        description: description.trim(),
        location: location.trim() || null,
        incident_date: new Date().toISOString(),
      }),
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error); }
    else {
      Alert.alert('Reported', 'Safety incident reported successfully');
      router.back();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <AlertTriangle size={20} color={colors.red} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Report Safety Incident</Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Project */}
        <View>
          <Text style={lbl(colors)}>PROJECT (OPTIONAL)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {projects.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
                style={chip(selectedProject === p.id, colors, radii)}
              >
                <Text style={chipText(selectedProject === p.id, colors)}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Type */}
        <View>
          <Text style={lbl(colors)}>INCIDENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setIncidentType(t)} style={chip(incidentType === t, colors, radii)}>
                <Text style={chipText(incidentType === t, colors)}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Severity */}
        <View>
          <Text style={lbl(colors)}>SEVERITY</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SEVERITY.map((s) => (
              <TouchableOpacity key={s} onPress={() => setSeverity(s)} style={[chip(severity === s, colors, radii), { flex: 1, alignItems: 'center' }]}>
                <Text style={chipText(severity === s, colors)}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View>
          <Text style={lbl(colors)}>DESCRIPTION</Text>
          <TextInput
            style={[input(colors, radii), { height: 100, textAlignVertical: 'top' }]}
            placeholder="Describe what happened..."
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Location */}
        <View>
          <Text style={lbl(colors)}>LOCATION</Text>
          <TextInput
            style={input(colors, radii)}
            placeholder="Where did this occur?"
            placeholderTextColor={colors.muted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Photos */}
        <View>
          <Text style={lbl(colors)}>PHOTOS</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: 80, height: 80, borderRadius: radii.md }} />
            ))}
            <TouchableOpacity onPress={takePhoto} style={photoBtn(colors, radii)}>
              <Camera size={24} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={photoBtn(colors, radii)}>
              <ImagePlus size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: colors.red, padding: 16, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function lbl(colors: any) { return { fontSize: 11, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }; }
function input(colors: any, radii: any) { return { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 15, color: colors.text, backgroundColor: colors.cardBg }; }
function chip(active: boolean, colors: any, radii: any) { return { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.md, borderWidth: 1, borderColor: active ? colors.blue : colors.border, backgroundColor: colors.cardBg }; }
function chipText(active: boolean, colors: any) { return { fontSize: 13, fontWeight: (active ? '600' : '400') as any, color: active ? colors.blue : colors.text }; }
function photoBtn(colors: any, radii: any) { return { width: 80, height: 80, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' as const, backgroundColor: colors.cardBg, justifyContent: 'center' as const, alignItems: 'center' as const }; }
