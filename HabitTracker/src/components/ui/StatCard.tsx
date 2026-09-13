import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  style?: object;
}

export function StatCard({ label, value, icon, color = '#C7F464', style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>{icon}</View>
      )}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1C1C1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: '#707070',
    textAlign: 'center',
  },
});
