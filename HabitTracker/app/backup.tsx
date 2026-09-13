import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ChevronLeft, Database, Trash2 } from 'lucide-react-native';
import { useHabits, useClearAllHabits } from '../src/hooks/useHabits';
import { useBackTo } from '../src/hooks/useBackTo';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function BackupScreen() {
  // Backup is only ever reached from Settings, so back should return there
  // specifically — not jump past it to Profile.
  const goBack = useBackTo('/settings');
  const { data: habits = [] } = useHabits();
  const { mutate: clearAllHabits, isPending: isClearing } = useClearAllHabits();

  const handleExportData = async () => {
    try {
      const dataStr = JSON.stringify(habits, null, 2);
      const fileUri = FileSystem.documentDirectory + 'habit-tracker-backup.json';
      await FileSystem.writeAsStringAsync(fileUri, dataStr);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Habit Tracker Data',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (err: any) {
      console.error('Export Error:', err);
      Alert.alert('Export Failed', err.message || 'Could not export your data.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you absolutely sure you want to delete all habits and history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearAllHabits(undefined, {
              onSuccess: () => Alert.alert('Success', 'All data has been cleared.'),
              onError: () => Alert.alert('Error', 'Failed to clear data.'),
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Backup & Sync</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.body}>
          Secure your habit data by exporting a local JSON backup. You can also permanently delete all data from this device.
        </Text>
        
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleExportData}>
            <View style={[styles.settingIcon, { backgroundColor: '#5AC8FA20' }]}>
              <Database size={18} color="#5AC8FA" />
            </View>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Export Backup (JSON)</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingRow} onPress={handleClearData} disabled={isClearing}>
            <View style={[styles.settingIcon, { backgroundColor: '#FF5DA220' }]}>
              {isClearing ? <ActivityIndicator color="#FF5DA2" size="small" /> : <Trash2 size={18} color="#FF5DA2" />}
            </View>
            <Text style={[styles.settingLabel, { flex: 1, color: '#FF5DA2' }]}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
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
  body: { fontSize: 15, color: '#B5B5B5', lineHeight: 22, marginBottom: 24 },
  
  card: {
    backgroundColor: '#1C1C1F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#27272A', marginLeft: 50 },
});
