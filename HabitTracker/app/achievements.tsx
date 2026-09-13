import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useAchievements } from '../src/hooks/useAchievements';
import { useBackTo } from '../src/hooks/useBackTo';

export default function AchievementsScreen() {
  const goBack = useBackTo('/(tabs)/profile');
  const { data: achievements = [], isLoading } = useAchievements();
  const unlocked = achievements.filter(a => a.unlocked).length;

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#C7F464" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>{unlocked}/{achievements.length} unlocked</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: achievements.length > 0 ? `${(unlocked / achievements.length) * 100}%` : '0%' }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {achievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🏆</Text>
            <Text style={styles.emptyText}>Achievements will appear here once you start tracking habits!</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {achievements.map(a => (
              <View key={a.id} style={[styles.badge, !a.unlocked && styles.badgeLocked]}>
                <View style={[styles.badgeIconWrap, { backgroundColor: a.unlocked ? `${a.color}25` : '#27272A' }]}>
                  {a.unlocked
                    ? <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                    : <Lock size={28} color="#3F3F3F" />}
                </View>
                <Text style={[styles.badgeTitle, !a.unlocked && styles.lockedText]} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{a.description}</Text>
                {a.unlocked ? (
                  <View style={[styles.unlockedTag, { backgroundColor: `${a.color}25` }]}>
                    <Text style={[styles.unlockedTagText, { color: a.color }]}>Unlocked ✓</Text>
                  </View>
                ) : (
                  <View style={styles.xpTag}>
                    <Text style={styles.xpTagText}>+{a.xp_reward} XP</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, gap: 14 },
  backBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#707070', marginTop: 2 },

  progressWrap: { paddingHorizontal: 24, marginBottom: 20 },
  progressTrack: { height: 6, backgroundColor: '#1C1C1F', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C7F464', borderRadius: 3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  badge: { width: '47%', backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1, borderColor: '#27272A', padding: 16, alignItems: 'center' },
  badgeLocked: { opacity: 0.5 },
  badgeIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  lockedText: { color: '#707070' },
  badgeDesc: { fontSize: 11, color: '#707070', textAlign: 'center', lineHeight: 16, marginBottom: 10 },
  unlockedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  unlockedTagText: { fontSize: 11, fontWeight: '700' },
  xpTag: { backgroundColor: '#27272A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  xpTagText: { fontSize: 11, color: '#707070', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: '#707070', textAlign: 'center', lineHeight: 22, marginTop: 16 },
});
