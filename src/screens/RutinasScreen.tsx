import Realm from "realm";
import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';

// Importamos los hooks de Realm
import { useQuery, useRealm } from '@realm/react';

// Importamos nuestros modelos y el enumerador de estado
import { Routine, RoutineStatus } from '../models/Routine';
import { Exercise } from '../models/Exercise';
import { Serie } from '../models/Serie';

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
  const navigation = useNavigation<any>();
  
  const routines = useQuery(Routine, (collection) => 
    collection.filtered('status == $0', RoutineStatus.TEMPLATE)
  );

  // --- NUEVO: Buscamos si hay alguna rutina a medias ---
  const drafts = useQuery(Routine, (collection) => 
    collection.filtered('status == $0', RoutineStatus.DRAFT)
  );

  // --- NUEVO: Redirección automática ---
  // Si entramos a la pantalla de Rutinas y existe un DRAFT, 
  // saltamos directamente a la pantalla de hacer rutina.
  useEffect(() => {
    if (drafts.length > 0) {
      navigation.navigate('HacerRutina');
    }
  }, [drafts.length, navigation]);

  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  // --- Estados CRUD Rutinas ---
  const [isRoutineModalVisible, setRoutineModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineName, setRoutineName] = useState('');

  // --- Estados CRUD Ejercicios ---
  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '', seriesCount: '', reps: '', weight: '', descanso: '' });

  const buildSeriesList = (count: number, reps: number, weight: number, completed = false) => {
    return Array.from({ length: count }, () => ({
      _id: new Realm.BSON.UUID(),
      reps,
      weight,
      completed,
    }));
  };

  // ==========================================
  // LÓGICA PARA EMPEZAR A ENTRENAR
  // ==========================================
  const startRoutine = (templateRoutine: Routine) => {
    let draftId: string = '';

    realm.write(() => {
      // 1. Creamos una nueva rutina en modo DRAFT
      const draftRoutine = realm.create(Routine, {
        _id: new Realm.BSON.UUID(),
        name: templateRoutine.name,
        status: RoutineStatus.DRAFT,
        exercises: [],
        createdAt: new Date(),
      });

      // 2. Hacemos una copia profunda de cada ejercicio para no sobreescribir la plantilla
      templateRoutine.exercises.forEach(ex => {
        const copiedEx = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(), // IMPORTANTE: Nuevo ID para el ejercicio copiado
          name: ex.name,
          descanso: ex.descanso,
          series: ex.series.map((serie) => ({
            _id: new Realm.BSON.UUID(),
            reps: serie.reps,
            weight: serie.weight,
            completed: false,
          })),
        });
        draftRoutine.exercises.push(copiedEx);
      });

      draftId = draftRoutine._id.toHexString();
    });

    // 3. Navegamos a la pantalla de entrenamiento pasándole el ID del borrador
    navigation.navigate('HacerRutina', { routineId: draftId });
  };

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
          routine.exercises.forEach((exercise) => {
            realm.delete(exercise.series);
          });
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
        seriesCount: exercise.series.length.toString(),
        reps: (exercise.series[0]?.reps ?? 0).toString(),
        weight: (exercise.series[0]?.weight ?? 0).toString(),
        descanso: exercise.descanso.toString(),
      });
    } else {
      setEditingExercise(null);
      setExerciseForm({ name: '', seriesCount: '3', reps: '10', weight: '0', descanso: '60' });
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
        editingExercise.descanso = parseInt(exerciseForm.descanso) || 0;

        const targetCount = Math.max(1, parseInt(exerciseForm.seriesCount) || 0);
        const reps = parseInt(exerciseForm.reps) || 0;
        const weight = parseFloat(exerciseForm.weight) || 0;

        while (editingExercise.series.length > targetCount) {
          const lastSeries = editingExercise.series[editingExercise.series.length - 1];
          realm.delete(lastSeries);
        }

        while (editingExercise.series.length < targetCount) {
          editingExercise.series.push(
            realm.create(Serie, {
              _id: new Realm.BSON.UUID(),
              reps,
              weight,
              completed: false,
            })
          );
        }

        editingExercise.series.forEach((serie) => {
          serie.reps = reps;
          serie.weight = weight;
        });
      } else {
        const newExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: exerciseForm.name,
          descanso: parseInt(exerciseForm.descanso) || 0,
          series: buildSeriesList(
            Math.max(1, parseInt(exerciseForm.seriesCount) || 0),
            parseInt(exerciseForm.reps) || 0,
            parseFloat(exerciseForm.weight) || 0
          ),
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
          realm.delete(exercise.series);
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
          
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => deleteRoutine(selectedRoutine)}>
              <Text style={styles.iconButtonText}>🗑️</Text>
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
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.series.length} Ser</Text></View>
                <View style={styles.dataTag}><Text style={styles.tagText}>{item.descanso} s</Text></View>
                {item.series[0] && (
                  <View style={styles.dataTag}><Text style={styles.tagText}>{item.series[0].reps} Rep x {item.series[0].weight} kg</Text></View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay ejercicios en esta rutina aún.</Text>
          }
        />

        {/* MODAL EJERCICIOS */}
        <Modal visible={isExerciseModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</Text>
              <TextInput style={styles.input} placeholder="Nombre del ejercicio" value={exerciseForm.name} onChangeText={(t) => setExerciseForm({...exerciseForm, name: t})} />
              <View style={styles.rowInputs}>
                  <TextInput style={[styles.input, {flex: 1, marginRight: 5}]} placeholder="Series" keyboardType="numeric" value={exerciseForm.seriesCount} onChangeText={(t) => setExerciseForm({...exerciseForm, seriesCount: t})} />
                <TextInput style={[styles.input, {flex: 1, marginHorizontal: 5}]} placeholder="Reps" keyboardType="numeric" value={exerciseForm.reps} onChangeText={(t) => setExerciseForm({...exerciseForm, reps: t})} />
                <TextInput style={[styles.input, {flex: 1, marginLeft: 5}]} placeholder="Peso (kg)" keyboardType="numeric" value={exerciseForm.weight} onChangeText={(t) => setExerciseForm({...exerciseForm, weight: t})} />
              </View>
                <TextInput style={styles.input} placeholder="Descanso (segundos)" keyboardType="numeric" value={exerciseForm.descanso} onChangeText={(t) => setExerciseForm({...exerciseForm, descanso: t})} />
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

        {/* MODAL EDITAR RUTINA */}
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
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.exercises.length} ejercicios • {item.createdAt.toLocaleDateString()}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={() => startRoutine(item)}
              >
                <Text style={styles.playButtonText}>Empezar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes rutinas aún. ¡Añade una!</Text>
        }
      />

      {/* MODAL CREAR/EDITAR RUTINA */}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: COLORS.subText },
  
  // Estilos del nuevo botón "Empezar"
  playButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  playButtonText: {
    color: COLORS.cardBg,
    fontWeight: '700',
    fontSize: 14,
  },
  
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
  
  modalActionsRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 
  },
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