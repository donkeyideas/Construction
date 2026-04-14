import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Shield,
  Wrench,
  DollarSign,
  FileText,
  Users,
  CheckSquare,
  Camera,
  Search,
  Bell,
  Sun,
  CircleHelp,
  Lock,
  LogOut,
  ChevronRight,
  SwatchBook,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';

export default function MoreScreen() {
  const router = useRouter();
  const { colors, radii, spacing, toggleMode, toggleVariant, mode, variant } = useTheme();
  const { user, userCompany, signOut } = useAuthStore();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'User';
  const fullName = user?.user_metadata?.full_name ?? 'User';

  const features = [
    { icon: ShieldCheck, color: colors.blue, label: 'Permit Review', route: '/(screens)/permit-review' as const },
    { icon: Shield, color: colors.red, label: 'Safety', route: '/(screens)/safety' as const },
    { icon: Wrench, color: colors.amber, label: 'Equipment', route: '/(screens)/equipment' as const },
    { icon: DollarSign, color: colors.green, label: 'Financial', route: '/(screens)/financial/overview' as const },
    { icon: FileText, color: colors.blue, label: 'Documents', route: '/(screens)/documents' as const },
    { icon: Users, color: colors.blue, label: 'People', route: '/(screens)/people/directory' as const },
    { icon: CheckSquare, color: colors.amber, label: 'Approvals', route: '/(screens)/approvals' as const },
    { icon: Camera, color: colors.blue, label: 'Photos', route: '/(screens)/photos' as const },
    { icon: Search, color: colors.green, label: 'Search', route: '/(screens)/search' as const },
    { icon: Bell, color: colors.blue, label: 'Alerts', route: '/(screens)/notifications' as const },
  ];

  const settingsItems = [
    {
      icon: Sun,
      label: `Theme: ${mode === 'dark' ? 'Dark' : 'Light'}`,
      onPress: toggleMode,
    },
    {
      icon: SwatchBook,
      label: `Style: ${variant === 'classic' ? 'Classic' : 'Corporate'}`,
      onPress: toggleVariant,
    },
    { icon: CircleHelp, label: 'Help & Support', onPress: () => router.push('/(screens)/support') },
    { icon: Lock, label: 'Privacy & Legal', onPress: () => router.push('/(screens)/legal') },
  ];

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>More</Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* User Card */}
        <TouchableOpacity
          onPress={() => router.push('/(screens)/profile')}
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: radii.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
          activeOpacity={0.7}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{fullName}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {userCompany?.role ?? 'Member'} — {userCompany?.companyName ?? ''}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* Features Grid */}
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          FEATURES
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {features.map((f, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(f.route)}
              style={{
                width: '30%',
                backgroundColor: colors.cardBg,
                borderRadius: radii.lg,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <f.icon size={22} color={f.color} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 10 }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          SETTINGS
        </Text>
        <View style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {settingsItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <item.icon size={18} color={colors.muted} />
                <Text style={{ fontSize: 14, color: colors.text }}>{item.label}</Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            padding: 14,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.red,
            backgroundColor: colors.redLight,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
          activeOpacity={0.7}
        >
          <LogOut size={18} color={colors.red} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.red }}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
