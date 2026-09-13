import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeColor?: string;
}

export function ToggleSwitch({
  value,
  onValueChange,
  activeColor = '#C7F464',
}: ToggleSwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#27272A', activeColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={styles.track}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.trackBg, { backgroundColor: bgColor }]} />
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackBg: {
    borderRadius: 14,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
