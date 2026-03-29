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

// Importamos el modelo de historial
import { HistoryRoutine } from '../models/HistoryRoutine';

// ==========================================
// PALETA DE COLORES (Idéntica a RutinasScreen)
// ==========================================
const COLORS = {
  bg: '#F8F9FA',      
  cardBg: '#FFFFFF',  
  text: '#1A1A1A',    
  subText: '#6C757D', 
  primary: '#007AFF', 
  danger: '#DC3545',  
  tagBg: '#E9ECEF',   
  border: '#DEE2E6',  
};

export const HistorialScreen = () => {
  const realm = useRealm();
  
  // Obtenemos el historial ordenado por fecha de finalización (más recientes primero)
  const history = useQuery(HistoryRoutine).sorted('completedAt', true);

  // Estado para ver los detalles de una rutina completada
  const [selectedHistory, setSelectedHistory] = useState<HistoryRoutine | null>(null);

  // Función para eliminar un registro del historial
  const deleteHistoryRecord = (record: HistoryRoutine) => {
    Alert.alert('Eliminar registro', `¿Seguro que quieres borrar este registro de "${record.name}" del historial?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        realm.write(() => {
          // Eliminamos los ejercicios asociados a esta copia del historial
          realm.delete(record.exercises); 
          realm.delete(record);
        });
      }}
    ]);
  };

  // ==========================================
  // VISTA DE DETALLE DEL HISTORIAL (Solo lectura)
  // ==========================================
  if (selectedHistory) {
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
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.series} Ser</Text></View>
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.reps} Rep</Text></View>
                {item.weight > 0 && (
                  <View style={styles.dataTag}><Text style={styles.tagText}>{item.weight} kg</Text></View>
                )}
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

  // ==========================================
  // VISTA PRINCIPAL (LISTADO DEL HISTORIAL)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
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
              <Text style={styles.durationTag}>{item.durationMinutes} min</Text>
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

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  header: { 
    paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', 
    alignItems: 'center', backgroundColor: COLORS.cardBg, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitleContainer: { flex: 1, marginLeft: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.subText, marginTop: 2 },
  
  backButton: { marginRight: 5, padding: 5 },
  backButtonText: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  
  // Tarjetas del Historial
  routineCard: { 
    backgroundColor: COLORS.cardBg, padding: 20, marginHorizontal: 16, 
    marginTop: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 10 },
  durationTag: { fontSize: 14, color: COLORS.primary, fontWeight: '700', backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSubtitle: { fontSize: 14, color: COLORS.subText, fontWeight: '500' },
  exerciseCount: { fontSize: 13, color: COLORS.subText, fontWeight: '600', backgroundColor: COLORS.tagBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  // Listado de Ejercicios (Detalle)
  exerciseItem: { 
    backgroundColor: COLORS.cardBg, paddingHorizontal: 20, paddingVertical: 18, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  exerciseHeader: { marginBottom: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  tagContainer: { flexDirection: 'row' },
  dataTag: { backgroundColor: COLORS.tagBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  tagText: { color: COLORS.subText, fontSize: 13, fontWeight: '600' },

  emptyText: { textAlign: 'center', marginTop: 60, color: COLORS.subText, fontSize: 16, paddingHorizontal: 40 },
});