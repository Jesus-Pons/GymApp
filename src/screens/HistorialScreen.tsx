import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const HistorialScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Pantalla del histórico de rutinas finalizadas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});