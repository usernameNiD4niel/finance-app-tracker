import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleIconButton } from './CircleIconButton';

interface Action {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  actions: Action[];
}

export const ActionButtonRow = React.memo(function ActionButtonRow({ actions }: Props) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <CircleIconButton
          key={action.label}
          icon={action.icon}
          label={action.label}
          color={action.color}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
});
