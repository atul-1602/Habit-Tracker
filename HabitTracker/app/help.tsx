import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ChevronLeft } from 'lucide-react-native';
import { useBackTo } from '../src/hooks/useBackTo';

export default function HelpScreen() {
  const goBack = useBackTo('/settings');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.body}>
          Need help? Here are some frequently asked questions:
          {"\n\n"}
          <Text style={{fontWeight: 'bold', color: '#FFFFFF'}}>How do I add a new habit?</Text>{"\n"}
          Tap the floating "+" button in the middle of the tab bar.
          {"\n\n"}
          <Text style={{fontWeight: 'bold', color: '#FFFFFF'}}>How do I edit a habit?</Text>{"\n"}
          Tap on a habit from the home screen, then tap the pencil icon in the top right corner.
          {"\n\n"}
          <Text style={{fontWeight: 'bold', color: '#FFFFFF'}}>How do I delete my data?</Text>{"\n"}
          Go to Settings -{">"} Clear All Data. Note that this cannot be undone!
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
  body: { fontSize: 16, color: '#B5B5B5', lineHeight: 24 },
});
