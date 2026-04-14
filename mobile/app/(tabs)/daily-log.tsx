import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ImagePlus, Send } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase, apiCall } from '@/lib/supabase';

export default function DailyLogScreen() {
  const { colors, radii, spacing } = useTheme();
  const { userCompany } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [weather, setWeather] = useState('Clear');
  const [crewSize, setCrewSize] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [notes, setNotes] = useState('');
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handleSubmit() {
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    if (!workPerformed.trim()) {
      Alert.alert('Error', 'Please describe the work performed');
      return;
    }
    setSubmitting(true);
    const { error } = await apiCall('/api/mobile/daily-log', {
      method: 'POST',
      body: JSON.stringify({
        project_id: selectedProject,
        weather,
        crew_size: crewSize ? parseInt(crewSize) : null,
        work_performed: workPerformed.trim(),
        notes: notes.trim() || null,
      }),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Daily log submitted!');
      setWorkPerformed('');
      setNotes('');
      setCrewSize('');
      setPhotos([]);
    }
  }

  const weatherOptions = ['Clear', 'Cloudy', 'Rain', 'Wind', 'Snow', 'Hot', 'Cold'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Daily Log</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Project */}
        <View>
          <Text style={label(colors)}>PROJECT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {projects.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProject(p.id)}
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
        </View>

        {/* Weather */}
        <View>
          <Text style={label(colors)}>WEATHER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {weatherOptions.map((w) => (
              <TouchableOpacity
                key={w}
                onPress={() => setWeather(w)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: weather === w ? colors.blue : colors.border,
                  backgroundColor: colors.cardBg,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: weather === w ? '600' : '400', color: weather === w ? colors.blue : colors.text }}>
                  {w}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Crew Size */}
        <View>
          <Text style={label(colors)}>CREW SIZE</Text>
          <TextInput
            style={inputStyle(colors, radii)}
            placeholder="Number of workers"
            placeholderTextColor={colors.muted}
            value={crewSize}
            onChangeText={setCrewSize}
            keyboardType="number-pad"
          />
        </View>

        {/* Work Performed */}
        <View>
          <Text style={label(colors)}>WORK PERFORMED</Text>
          <TextInput
            style={[inputStyle(colors, radii), { height: 100, textAlignVertical: 'top' }]}
            placeholder="Describe today's work..."
            placeholderTextColor={colors.muted}
            value={workPerformed}
            onChangeText={setWorkPerformed}
            multiline
          />
        </View>

        {/* Notes */}
        <View>
          <Text style={label(colors)}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={[inputStyle(colors, radii), { height: 60, textAlignVertical: 'top' }]}
            placeholder="Additional notes, delays, issues..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Photos */}
        <View>
          <Text style={label(colors)}>PHOTOS</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: 80, height: 80, borderRadius: radii.md }} />
            ))}
            <TouchableOpacity
              onPress={takePhoto}
              style={{ width: 80, height: 80, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.cardBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Camera size={24} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              style={{ width: 80, height: 80, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.cardBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <ImagePlus size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: colors.blue,
            padding: 16,
            borderRadius: radii.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Submit Daily Log</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function label(colors: any) {
  return { fontSize: 11, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 };
}

function inputStyle(colors: any, radii: any) {
  return { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 15, color: colors.text, backgroundColor: colors.cardBg };
}
