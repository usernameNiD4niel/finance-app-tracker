import React from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListRowCard } from './ui/ListRowCard';
import type { AppTheme } from '../theme';

interface Props {
  id: number;
  name: string;
  icon: string;
  color: string;
  soaDay: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  index?: number;
}

export const CreditCardListItem = React.memo(function CreditCardListItem({
  id, name, icon, color, soaDay, onEdit, onDelete, index = 0,
}: Props) {
  const theme = useTheme<AppTheme>();

  const handleLongPress = () => {
    Alert.alert(name, 'Credit Card', [
      { text: 'Edit', onPress: () => onEdit(id) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ListRowCard onLongPress={handleLongPress} index={index} style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.details}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {soaDay != null ? `SOA: day ${soaDay}` : 'Credit Card'}
        </Text>
      </View>
    </ListRowCard>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
});
