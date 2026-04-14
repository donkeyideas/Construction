import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, ImagePlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/ThemeContext';

export default function PhotosScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [photos, setPhotos] = useState<string[]>([]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Photos</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={takePhoto} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}>
            <Camera size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
            <ImagePlus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 8 }}>
        {photos.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <Camera size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>No photos yet</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Take a photo or pick from gallery</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {photos.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{
                  width: '32.5%',
                  aspectRatio: 1,
                  borderRadius: radii.sm,
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
