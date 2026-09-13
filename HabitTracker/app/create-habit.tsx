import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ToggleSwitch } from '../src/components/ui/ToggleSwitch';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { X, ChevronDown, Clock, Check } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useCreateHabit } from '../src/hooks/useHabits';
import { useAppUser } from '../src/hooks/useAppUser';
import {
  HABIT_CATEGORIES,
  HABIT_COLORS,
  HABIT_EMOJIS,
  WEEK_DAYS_SHORT,
} from '../src/lib/constants';
import { formatTime, timeStringToDate, dateToTimeString } from '../src/lib/dateUtils';
import { HabitCategory, HabitFrequency } from '../src/domain/types';

export default function CreateHabitScreen() {
  const router = useRouter();
  const { user } = useAppUser();
  const { mutate: createHabit, isPending } = useCreateHabit();

  const [selectedEmoji, setSelectedEmoji] = useState<string>(HABIT_EMOJIS[0]);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory>('Health');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  const [repeatMode, setRepeatMode] = useState<HabitFrequency>('daily');
  // Custom starts with nothing selected — the user must deliberately choose
  // which days it applies to, rather than starting from "every day" and
  // having to deselect down to what they actually want.
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setReminderTime(dateToTimeString(selectedDate));
    // Android's picker is a modal dialog that closes itself on pick; iOS's
    // is an inline spinner the user dismisses via the "Done" button below.
    if (Platform.OS === 'android') setShowTimePicker(false);
  };

  const toggleDay = (i: number) => {
    setActiveDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
    );
  };

  const isCustomWithNoDays = repeatMode === 'custom' && activeDays.length === 0;

  const handleSave = () => {
    if (!name.trim()) return;
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to add a habit.');
      return;
    }
    if (isCustomWithNoDays) {
      Alert.alert('Select at least one day', 'Choose which days this habit repeats on.');
      return;
    }

    createHabit(
      {
        name: name.trim(),
        emoji: selectedEmoji,
        color: selectedColor,
        category: selectedCategory,
        frequency: repeatMode,
        frequency_days:
          repeatMode === 'daily'
            ? [0, 1, 2, 3, 4, 5, 6]
            : repeatMode === 'weekdays'
            ? [0, 1, 2, 3, 4]
            : activeDays,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime : null,
        sort_order: 0,
        archived: false,
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => Alert.alert('Error', err.message ?? 'Could not create habit.'),
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <StatusBar barStyle="light-content" backgroundColor="#111111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add New Habit</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Emoji Preview */}
        <View style={styles.emojiPreview}>
          <View style={[styles.emojiCircle, { backgroundColor: `${selectedColor}30` }]}>
            <Text style={{ fontSize: 48 }}>{selectedEmoji}</Text>
          </View>
          <Text style={styles.emojiHint}>Choose an emoji</Text>
        </View>

        {/* Emoji Grid */}
        <View style={styles.emojiGrid}>
          {HABIT_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
              onPress={() => setSelectedEmoji(e)}
            >
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Habit Name */}
        <Text style={styles.label}>Habit Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Morning Run"
          placeholderTextColor="#707070"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Text style={styles.dropdownText}>{selectedCategory}</Text>
          <ChevronDown size={18} color="#707070" />
        </TouchableOpacity>
        {showCategoryPicker && (
          <View style={styles.dropdownMenu}>
            {HABIT_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={styles.dropdownItem}
                onPress={() => { setSelectedCategory(cat as HabitCategory); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.dropdownItemText, selectedCategory === cat && styles.dropdownItemActive]}>
                  {cat}
                </Text>
                {selectedCategory === cat && <Check size={16} color="#C7F464" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Color Picker */}
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {HABIT_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]}
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </View>

        {/* Repeat */}
        <Text style={styles.label}>Repeat</Text>
        <View style={styles.repeatToggle}>
          {(['daily', 'weekdays', 'custom'] as HabitFrequency[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.repeatBtn, repeatMode === mode && styles.repeatBtnActive]}
              onPress={() => setRepeatMode(mode)}
            >
              <Text style={[styles.repeatText, repeatMode === mode && styles.repeatTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {repeatMode === 'custom' && (
          <>
            <View style={styles.daysRow}>
              {WEEK_DAYS_SHORT.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayChip, activeDays.includes(i) && styles.dayChipActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayChipText, activeDays.includes(i) && styles.dayChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {activeDays.length === 0 && (
              <Text style={styles.daysHint}>Pick at least one day above.</Text>
            )}
          </>
        )}

        {/* Reminder */}
        <Text style={styles.label}>Reminder</Text>
        <View style={[styles.reminderRow, reminderEnabled && styles.reminderRowActive]}>
          <TouchableOpacity
            style={styles.reminderTapArea}
            activeOpacity={reminderEnabled ? 0.6 : 1}
            onPress={() => reminderEnabled && setShowTimePicker(true)}
          >
            <Clock size={18} color={reminderEnabled ? '#C7F464' : '#707070'} />
            <Text style={[styles.reminderText, reminderEnabled && { color: '#C7F464' }]}>
              {reminderEnabled ? `${formatTime(reminderTime)} · Tap to change` : 'No reminder'}
            </Text>
          </TouchableOpacity>
          <ToggleSwitch
            value={reminderEnabled}
            onValueChange={(val) => {
              setReminderEnabled(val);
              if (val) setShowTimePicker(true);
            }}
          />
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={timeStringToDate(reminderTime)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={handleTimeChange}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}
        {Platform.OS === 'ios' && showTimePicker && (
          <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
            <Text style={styles.pickerDoneText}>Done</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (!name.trim() || isPending || isCustomWithNoDays) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || isPending || isCustomWithNoDays}
          activeOpacity={0.8}
        >
          {isPending
            ? <ActivityIndicator color="#111111" />
            : <Text style={styles.saveBtnText}>Save Habit</Text>
          }
        </TouchableOpacity>
      </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  inner: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  closeBtn: { backgroundColor: '#1C1C1F', padding: 8, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  emojiPreview: { alignItems: 'center', marginBottom: 20 },
  emojiCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emojiHint: { fontSize: 13, color: '#707070' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  emojiBtn: {
    width: '11%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#1C1C1F', borderWidth: 1, borderColor: '#27272A',
  },
  emojiBtnActive: { borderColor: '#C7F464', backgroundColor: '#C7F46420' },

  label: { fontSize: 14, fontWeight: '600', color: '#B5B5B5', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#1C1C1F', borderRadius: 14, borderWidth: 1,
    borderColor: '#27272A', padding: 16, fontSize: 15, color: '#FFFFFF', marginBottom: 16,
  },

  dropdown: {
    backgroundColor: '#1C1C1F', borderRadius: 14, borderWidth: 1, borderColor: '#27272A',
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  dropdownText: { fontSize: 15, color: '#FFFFFF' },
  dropdownMenu: {
    backgroundColor: '#27272A', borderRadius: 14, borderWidth: 1, borderColor: '#3F3F3F', marginBottom: 16, overflow: 'hidden',
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#1C1C1F', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownItemText: { fontSize: 14, color: '#B5B5B5' },
  dropdownItemActive: { color: '#C7F464', fontWeight: '700' },

  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.15 }] },

  repeatToggle: { flexDirection: 'row', backgroundColor: '#1C1C1F', borderRadius: 12, padding: 4, marginBottom: 12 },
  repeatBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  repeatBtnActive: { backgroundColor: '#27272A' },
  repeatText: { fontSize: 13, color: '#707070', fontWeight: '600' },
  repeatTextActive: { color: '#FFFFFF' },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  daysHint: { fontSize: 12, color: '#FF7849', marginBottom: 20 },
  dayChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1F', borderWidth: 1, borderColor: '#27272A' },
  dayChipActive: { backgroundColor: '#C7F464', borderColor: '#C7F464' },
  dayChipText: { fontSize: 13, fontWeight: '700', color: '#707070' },
  dayChipTextActive: { color: '#111111' },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C1F',
    borderRadius: 14, borderWidth: 1, borderColor: '#27272A', padding: 16, marginBottom: 8,
  },
  reminderRowActive: { borderColor: '#C7F46440' },
  reminderTapArea: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  reminderText: { fontSize: 15, color: '#707070', flex: 1 },
  pickerDoneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: '#C7F464' },

  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#1C1C1F' },
  saveBtn: { backgroundColor: '#C7F464', borderRadius: 18, padding: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: '#111111' },
});
