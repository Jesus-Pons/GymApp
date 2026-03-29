import Realm from "realm";
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Importamos los hooks de Realm
import { useQuery, useRealm } from '@realm/react';

// Importamos nuestros modelos y el enumerador de estado
import { Routine, RoutineStatus } from '../models/Routine';
import { Exercise } from '../models/Exercise';

// ==========================================
// PALETA DE COLORES
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

export const RutinasScreen = () => {
  const realm = useRealm();
  
  const routines = useQuery(Routine, (collection) => 
    collection.filtered('status == $0', RoutineStatus.TEMPLATE)
  );

  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  // --- Estados CRUD Rutinas ---
  const [isRoutineModalVisible, setRoutineModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineName, setRoutineName] = useState('');

  // --- Estados CRUD Ejercicios ---
  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '', series: '', reps: '', weight: '' });

  // ==========================================
  // FUNCIONES CRUD PARA RUTINAS
  // ==========================================
  const openRoutineModal = (routine?: Routine) => {
    if (routine) {
      setEditingRoutine(routine);
      setRoutineName(routine.name);
    } else {
      setEditingRoutine(null);
      setRoutineName('');
    }
    setRoutineModalVisible(true);
  };

  const saveRoutine = () => {
    if (!routineName.trim()) {
      return Alert.alert('Error', 'El nombre de la rutina es obligatorio');
    }

    realm.write(() => {
      if (editingRoutine) {
        editingRoutine.name = routineName;
      } else {
        realm.create(Routine, {
          _id: new Realm.BSON.UUID(),
          name: routineName,
          status: RoutineStatus.TEMPLATE,
          exercises: [],
          createdAt: new Date(),
        });
      }
    });
    setRoutineModalVisible(false);
  };

  const deleteRoutine = (routine: Routine) => {
    Alert.alert('Eliminar', `¿Seguro que quieres eliminar la rutina "${routine.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        realm.write(() => {
          realm.delete(routine.exercises); 
          realm.delete(routine);
        });
        setSelectedRoutine(null);
        setRoutineModalVisible(false);
      }}
    ]);
  };

  // ==========================================
  // FUNCIONES CRUD PARA EJERCICIOS
  // ==========================================
  const openExerciseModal = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseForm({
        name: exercise.name,
        series: exercise.series.toString(),
        reps: exercise.reps.toString(),
        weight: exercise.weight.toString()
      });
    } else {
      setEditingExercise(null);
      setExerciseForm({ name: '', series: '', reps: '', weight: '' });
    }
    setExerciseModalVisible(true);
  };

  const saveExercise = () => {
    if (!exerciseForm.name.trim() || !selectedRoutine) {
      return Alert.alert('Error', 'El nombre del ejercicio es obligatorio');
    }

    realm.write(() => {
      if (editingExercise) {
        editingExercise.name = exerciseForm.name;
        editingExercise.series = parseInt(exerciseForm.series) || 0;
        editingExercise.reps = parseInt(exerciseForm.reps) || 0;
        editingExercise.weight = parseFloat(exerciseForm.weight) || 0;
      } else {
        const newExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: exerciseForm.name,
          series: parseInt(exerciseForm.series) || 0,
          reps: parseInt(exerciseForm.reps) || 0,
          weight: parseFloat(exerciseForm.weight) || 0,
        });
        selectedRoutine.exercises.push(newExercise);
      }
    });
    setExerciseModalVisible(false);
  };

  const deleteExercise = (exercise: Exercise) => {
    Alert.alert('Eliminar', `¿Seguro que quieres eliminar "${exercise.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        realm.write(() => {
          realm.delete(exercise);
        });
        setExerciseModalVisible(false);
      }}
    ]);
  };

  // ==========================================
  // VISTA DE EJERCICIOS (DETALLE DE RUTINA)
  // ==========================================
  if (selectedRoutine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedRoutine(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openRoutineModal(selectedRoutine)} style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{selectedRoutine.name}</Text>
          </TouchableOpacity>
          
          {/* NUEVA ZONA: Acciones derechas (Eliminar + Añadir) */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => deleteRoutine(selectedRoutine)}>
              <Text style={[styles.iconButtonText, styles.addButtonTextMinimal, { color: COLORS.danger }]}>🗑️ Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButtonMinimal} onPress={() => openExerciseModal()}>
              <Text style={styles.addButtonTextMinimal}>+ Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={selectedRoutine.exercises}
          keyExtractor={(item) => item._id.toHexString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openExerciseModal(item)} activeOpacity={0.7} style={styles.exerciseItem}>
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
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay ejercicios en esta rutina aún.</Text>
          }
        />

        {/* MODAL EJERCICIOS (Mantiene su botón de eliminar) */}
        <Modal visible={isExerciseModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</Text>
              <TextInput style={styles.input} placeholder="Nombre del ejercicio" value={exerciseForm.name} onChangeText={(t) => setExerciseForm({...exerciseForm, name: t})} />
              <View style={styles.rowInputs}>
                <TextInput style={[styles.input, {flex: 1, marginRight: 5}]} placeholder="Series" keyboardType="numeric" value={exerciseForm.series} onChangeText={(t) => setExerciseForm({...exerciseForm, series: t})} />
                <TextInput style={[styles.input, {flex: 1, marginHorizontal: 5}]} placeholder="Reps" keyboardType="numeric" value={exerciseForm.reps} onChangeText={(t) => setExerciseForm({...exerciseForm, reps: t})} />
                <TextInput style={[styles.input, {flex: 1, marginLeft: 5}]} placeholder="Peso (kg)" keyboardType="numeric" value={exerciseForm.weight} onChangeText={(t) => setExerciseForm({...exerciseForm, weight: t})} />
              </View>
              <View style={styles.modalActionsRow}>
                {editingExercise && (
                  <TouchableOpacity style={styles.deleteActionBtn} onPress={() => deleteExercise(editingExercise)}>
                    <Text style={styles.deleteActionText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.modalActionsGroup}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setExerciseModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveExercise}>
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL EDITAR RUTINA (Desde el detalle - Botón eliminar eliminado de aquí) */}
        <Modal visible={isRoutineModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Editar Nombre Rutina</Text>
                    <TextInput style={styles.input} placeholder="Nombre de la rutina" value={routineName} onChangeText={setRoutineName} autoFocus />
                    
                    <View style={styles.modalActionsRowEnd}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setRoutineModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveRoutine}>
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL (LISTADO DE RUTINAS)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Rutinas</Text>
        <TouchableOpacity style={styles.addButtonMinimal} onPress={() => openRoutineModal()}>
          <Text style={styles.addButtonTextMinimal}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item._id.toHexString()}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setSelectedRoutine(item)} 
            onLongPress={() => openRoutineModal(item)} 
            style={styles.routineCard}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.exerciseCount}>{item.exercises.length} ejercicios</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Creada el {item.createdAt.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes rutinas aún. ¡Añade una!</Text>
        }
      />

      {/* MODAL CREAR/EDITAR RUTINA (Botón eliminar eliminado) */}
      <Modal visible={isRoutineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingRoutine ? 'Editar Rutina' : 'Nueva Rutina'}</Text>
            <TextInput style={styles.input} placeholder="Nombre de la rutina" value={routineName} onChangeText={setRoutineName} autoFocus />
            
            <View style={styles.modalActionsRowEnd}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRoutineModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveRoutine}>
                    <Text style={styles.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  headerTitleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  backButton: { marginRight: 15, padding: 5 },
  backButtonText: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  
  // Contenedor para alinear los botones en la cabecera
  headerRightActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 5 },
  iconButtonText: { fontSize: 20 },
  
  addButtonMinimal: { paddingHorizontal: 12, paddingVertical: 6 },
  addButtonTextMinimal: { color: COLORS.primary, fontWeight: '600', fontSize: 16 },
  
  routineCard: { 
    backgroundColor: COLORS.cardBg, padding: 24, marginHorizontal: 16, 
    marginTop: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 10 },
  exerciseCount: { fontSize: 14, color: COLORS.subText, fontWeight: '600', backgroundColor: COLORS.tagBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardSubtitle: { fontSize: 14, color: COLORS.subText },
  
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.text },
  input: { 
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 15, color: COLORS.text
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Botones para el Modal de Ejercicios (espacio para el eliminar)
  modalActionsRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 
  },
  
  // Botones para el Modal de Rutinas (todo a la derecha porque no hay eliminar)
  modalActionsRowEnd: { 
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15 
  },
  
  modalActionsGroup: { flexDirection: 'row', alignItems: 'center' },
  deleteActionBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  deleteActionText: { color: COLORS.danger, fontWeight: '600', fontSize: 16 },

  cancelBtn: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 10 },
  cancelBtnText: { color: COLORS.subText, fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  saveBtnText: { color: COLORS.cardBg, fontWeight: '600', fontSize: 16 },
});