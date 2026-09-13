import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ChevronLeft } from 'lucide-react-native';
import { useBackTo } from '../src/hooks/useBackTo';

export default function PrivacyScreen() {
  const goBack = useBackTo('/settings');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.body}>
          Your privacy is critically important to us. All of your habits and history are stored locally on your device in a secure SQLite database. 
          {"\n\n"}
          When you back up or sync your data, we only transfer what is necessary to provide the service. We never sell your personal data or habit history to third parties.
          {"\n\n"}
          For more detailed information, please contact our support team.
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
