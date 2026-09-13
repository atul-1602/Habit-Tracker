import { View, StyleSheet } from 'react-native';

export interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color = '#C7F464', height = 8 }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, progress * 100));

  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[styles.fill, { width: `${percentage}%`, backgroundColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#27272A',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
