import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { FadeInView } from '../../src/components/ui/FadeInView';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Settings, Trophy, BarChart2, Database, ChevronRight, Flame, Target, Zap, Star, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAppUser } from '../../src/hooks/useAppUser';
import { useUserProfile, useUpdateProfile } from '../../src/hooks/useUser';
import { useStats } from '../../src/hooks/useStats';
import { xpProgressInLevel } from '../../src/lib/constants';

export default function ProfileTab() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useAppUser();

  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: stats } = useStats();
  const { mutate: updateProfile } = useUpdateProfile();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      // Resize + compress before storing, so the payload stays small (the
      // backend stores it as a data URI string on the profile document).
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error('Could not process the selected image.');

      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
      updateProfile(
        { avatar_url: dataUri },
        { onError: () => Alert.alert('Upload failed', 'Could not save your profile picture. Please try again.') }
      );
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not process the selected image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName =
    profile?.display_name ??
    (user?.fullName && user.fullName.trim().length > 0 ? user.fullName : undefined) ??
    (user?.unsafeMetadata?.fullName as string | undefined) ??
    'Habit Tracker User';
  const handle = `@${(user?.emailAddresses[0]?.emailAddress ?? 'user').split('@')[0]}`;
  const avatarUri = profile?.avatar_url || user?.imageUrl || null;
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpProgress = xpProgressInLevel(xp, level);

  const MENU_ITEMS = [
    { icon: <Trophy size={20} color="#FFD93D" />, iconBg: '#FFD93D20', label: 'Achievements', sub: 'View your unlocked badges', route: '/achievements' },
    { icon: <BarChart2 size={20} color="#A855F7" />, iconBg: '#A855F720', label: 'Stats Overview', sub: 'View detailed stats', route: '/(tabs)/analytics' },
    { icon: <Database size={20} color="#5AC8FA" />, iconBg: '#5AC8FA20', label: 'Data & Export', sub: 'Backup & sync your data', route: '/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#C7F464" size="large" />
      </View>
    );
  }

  return (
    <FadeInView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Settings size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color="#C7F464" />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={{ fontSize: 40 }}>{displayName[0]?.toUpperCase() ?? '🧑'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraBadge} onPress={handlePickAvatar} disabled={uploadingAvatar}>
              <Camera size={13} color="#111111" />
            </TouchableOpacity>
            <View style={styles.levelBadge}>
              <Star size={10} color="#111111" fill="#111111" />
              <Text style={styles.levelText}>{level}</Text>
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.handle}>{handle}</Text>
            <View style={styles.verifiedBadge}>
              <Zap size={10} color="#111111" fill="#111111" />
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>Level {level}</Text>
              <Text style={styles.xpValue}>{xp.toLocaleString()} XP</Text>
            </View>
            <ProgressBar progress={xpProgress} color="#C7F464" height={8} />
            <Text style={styles.xpNext}>{Math.round(xpProgress * 100)}% to Level {level + 1}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { icon: <Flame size={18} color="#FF7849" />, bg: '#FF784920', val: stats?.current_streak ?? 0, lbl: 'Day Streak' },
            { icon: <Target size={18} color="#5AC8FA" />, bg: '#5AC8FA20', val: stats?.longest_streak ?? 0, lbl: 'Best Streak' },
            { icon: <Zap size={18} color="#C7F464" />, bg: '#C7F46420', val: `${Math.round((stats?.completion_rate ?? 0) * 100)}%`, lbl: 'Consistency' },
          ].map(s => (
            <View key={s.lbl} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>{s.icon}</View>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>My Data</Text>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>{item.icon}</View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <ChevronRight size={18} color="#707070" />
          </TouchableOpacity>
        ))}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  settingsBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  avatarCard: { backgroundColor: '#1C1C1F', borderRadius: 24, borderWidth: 1, borderColor: '#27272A', padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#C7F464', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  cameraBadge: { position: 'absolute', bottom: 0, left: -4, backgroundColor: '#C7F464', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1C1C1F' },
  levelBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#C7F464', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  levelText: { fontSize: 11, fontWeight: 'bold', color: '#111111' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  handle: { fontSize: 14, color: '#707070' },
  verifiedBadge: { backgroundColor: '#5AC8FA', borderRadius: 10, padding: 3 },
  xpSection: { width: '100%' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpLabel: { fontSize: 13, color: '#B5B5B5', fontWeight: '600' },
  xpValue: { fontSize: 13, color: '#C7F464', fontWeight: '600' },
  xpNext: { fontSize: 11, color: '#707070', marginTop: 6, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1C1C1F', borderRadius: 16, borderWidth: 1, borderColor: '#27272A', padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  statLbl: { fontSize: 11, color: '#707070', textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1F', borderRadius: 16, borderWidth: 1, borderColor: '#27272A', padding: 16, marginBottom: 10 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#707070' },

  signOutBtn: { marginTop: 10, backgroundColor: '#FF784920', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF784940' },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#FF7849' },
});
