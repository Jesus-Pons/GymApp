import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const HacerRutinaScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Pantalla para hacer la rutina en curso</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});