import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useRealm } from '@realm/react';
import { HistoryRoutine } from '../models/HistoryRoutine';
import { styles } from '../styles/HistorialScreen.styles';

export const HistorialScreen = () => {
  const realm = useRealm();
  
  const history = useQuery(HistoryRoutine).sorted('completedAt', true);

  const [selectedHistory, setSelectedHistory] = useState<HistoryRoutine | null>(null);

  const deleteHistoryRecord = (record: HistoryRoutine) => {
    Alert.alert('Eliminar registro', `¿Seguro que quieres borrar este registro de "${record.name}" del historial?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        if (selectedHistory?._id.toHexString() === record._id.toHexString()) {
          setSelectedHistory(null);
        }
        setTimeout(() => {
          realm.write(() => {
            record.exercises.forEach((exercise) => {
              realm.delete(exercise.series);
            });
            realm.delete(record.exercises); 
            realm.delete(record);
          });
        }, 0);
      }}
    ]);
  };

  const deleteAllHistory = () => {
    if (history.length === 0) return;
    Alert.alert('Borrar todo el historial', '¿Seguro que quieres borrar todos los entrenamientos del historial? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: () => {
        realm.write(() => {
          history.forEach(record => {
            record.exercises.forEach((exercise) => {
              realm.delete(exercise.series);
            });
            realm.delete(record.exercises);
          });
          realm.delete(history);
        });
      }}
    ]);
  };

  if (selectedHistory && selectedHistory.isValid()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedHistory(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{selectedHistory.name}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedHistory.completedAt.toLocaleDateString()} • {selectedHistory.durationMinutes} min
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => deleteHistoryRecord(selectedHistory)}
            style={styles.deleteDetailButton}
          >
            <Text style={styles.deleteIconText}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedHistory.exercises}
          keyExtractor={(item) => item._id.toHexString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.exerciseItem}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>{item.name}</Text>
              </View>
              <View style={styles.tagContainer}>
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.series.length} Ser</Text></View>
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.descanso} s</Text></View>
              </View>

              <View style={styles.seriesList}>
                {item.series.map((serie, index) => (
                  <View key={serie._id.toHexString()} style={styles.seriesRow}>
                    <Text style={styles.seriesText}>Serie {index + 1}: {serie.reps} reps · {serie.weight} kg</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay detalles de ejercicios para esta rutina.</Text>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { justifyContent: 'space-between' }]}>
        <Text style={styles.title}>Historial</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={deleteAllHistory} style={styles.deleteAllButton}>
            <Text style={styles.deleteAllText}>Borrar historial</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item._id.toHexString()}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setSelectedHistory(item)} 
            onLongPress={() => deleteHistoryRecord(item)} 
            style={styles.routineCard}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <View style={styles.cardHeaderRight}>
                <Text style={styles.durationTag}>{item.durationMinutes} min</Text>
                <TouchableOpacity 
                  onPress={() => deleteHistoryRecord(item)}
                  style={styles.deleteIconButton}
                >
                  <Text style={styles.deleteIconText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.cardFooter}>
              <Text style={styles.cardSubtitle}>
                {item.completedAt.toLocaleDateString()} a las {item.completedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <Text style={styles.exerciseCount}>{item.exercises.length} ejercicios</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aún no has completado ninguna rutina. ¡Empieza a entrenar!</Text>
        }
      />
    </SafeAreaView>
  );
};
