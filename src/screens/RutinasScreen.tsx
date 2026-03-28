import Realm from "realm";
import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Importamos los hooks de Realm
import { useQuery, useRealm } from '@realm/react';
// Importamos nuestros modelos
import { Routine } from '../models/Routine';
import { Exercise } from '../models/Exercise';

export const RutinasScreen = () => {
  const realm = useRealm();
  
  // useQuery obtiene todas las rutinas y se actualiza SOLO cuando cambian
  const routines = useQuery(Routine);

  // Función para añadir una rutina de ejemplo
  const addSampleRoutine = () => {
    realm.write(() => {
      // 1. Creamos la rutina
      const newRoutine = realm.create(Routine, {
        _id: new Realm.BSON.UUID(),
        name: `Rutina ${routines.length + 1}`,
        exercises: [], // Empezamos con lista vacía
        createdAt: new Date(),
      });

      // 2. (Opcional) Le añadimos un ejercicio de ejemplo directamente
      const sampleExercise = realm.create(Exercise, {
        _id: new Realm.BSON.UUID(),
        name: 'Press de Banca',
        series: 4,
        reps: 10,
        weight: 60,
      });

      newRoutine.exercises.push(sampleExercise);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Rutinas</Text>
        <TouchableOpacity style={styles.addButton} onPress={addSampleRoutine}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item._id.toHexString()}
        renderItem={({ item }) => (
          <View style={styles.routineCard}>
            <Text style={styles.routineName}>{item.name}</Text>
            <Text style={styles.routineDetails}>
              {item.exercises.length} ejercicios • {item.createdAt.toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes rutinas aún. ¡Añade una!</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  routineCard: {
    backgroundColor: '#FFF',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  routineDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16,
  },
});