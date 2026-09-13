import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ChevronLeft } from 'lucide-react-native';
import { useBackTo } from '../src/hooks/useBackTo';

export default function AboutScreen() {
  const goBack = useBackTo('/settings');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>About Habit Tracker</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.logoContainer}>
          <Text style={{fontSize: 64}}>⚡</Text>
        </View>
        <Text style={styles.body}>
          Habit Tracker is a beautifully simple app designed to help you build positive routines and track your progress over time. 
          {"\n\n"}
          Version 1.0.0
          {"\n"}
          Made with ❤️
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 20,
  },
  backBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginVertical: 32 },
  body: { fontSize: 16, color: '#B5B5B5', lineHeight: 24, textAlign: 'center' },
});
