import Realm from "realm";
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

// Importamos los hooks de Realm
import { useQuery, useRealm } from '@realm/react';

// Importamos nuestros modelos y el enumerador de estado
import { Routine, RoutineStatus } from '../models/Routine';
import { Exercise } from '../models/Exercise';
import { Serie } from '../models/Serie';

type SeriesFormItem = {
  reps: string;
  weight: string;
};

const MAX_SERIES = 10;
const MIN_SERIES = 1;
const REST_STEP = 15;

type NumberStepperProps = {
  label: string;
  valueText: string;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  suffix?: string;
  onBlur?: () => void;
};

const NumberStepper = ({ label, valueText, onChangeText, onDecrement, onIncrement, suffix, onBlur }: NumberStepperProps) => {
  return (
    <View style={styles.stepperBlock}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperButton} onPress={onDecrement}>
          <Text style={styles.stepperButtonText}>-</Text>
        </TouchableOpacity>

        <View style={styles.stepperInputWrap}>
          <TextInput
            style={styles.stepperInput}
            value={valueText}
            onChangeText={onChangeText}
            onBlur={onBlur}
            keyboardType="numeric"
            textAlign="center"
          />
          {!!suffix && <Text style={styles.stepperSuffix}>{suffix}</Text>}
        </View>

        <TouchableOpacity style={styles.stepperButton} onPress={onIncrement}>
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  const [exerciseForm, setExerciseForm] = useState({ name: '', seriesCount: '', descanso: '' });
  const [seriesForm, setSeriesForm] = useState<SeriesFormItem[]>([]);
  const swipeablesRef = useRef<Map<string, any>>(new Map());

  const sanitizeIntText = (value: string) => value.replace(/[^0-9]/g, '');

  const sanitizeWeightText = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const firstDot = sanitized.indexOf('.');

    if (firstDot === -1) {
      return sanitized;
    }

    return sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '');
  };

  const getSeriesCountValue = () => {
    const parsed = parseInt(exerciseForm.seriesCount, 10);
    if (isNaN(parsed)) return MIN_SERIES;
    return Math.max(MIN_SERIES, Math.min(MAX_SERIES, parsed));
  };

  const getRestValue = () => {
    const parsed = parseInt(exerciseForm.descanso, 10);
    if (isNaN(parsed)) return 0;
    return Math.max(0, parsed);
  };

  const setSeriesCountValue = (nextValue: number) => {
    const clamped = Math.max(MIN_SERIES, Math.min(MAX_SERIES, nextValue));
    setExerciseForm((current) => ({ ...current, seriesCount: String(clamped) }));
    normalizeSeriesCount(String(clamped));
  };

  const setRestValue = (nextValue: number) => {
    const safeValue = Math.max(0, nextValue);
    setExerciseForm((current) => ({ ...current, descanso: String(safeValue) }));
  };

  const handleSeriesCountTextChange = (value: string) => {
    const sanitized = sanitizeIntText(value);

    if (!sanitized) {
      setExerciseForm((current) => ({ ...current, seriesCount: '' }));
      setSeriesForm([]);
      return;
    }

    const clamped = Math.max(MIN_SERIES, Math.min(MAX_SERIES, parseInt(sanitized, 10)));
    setExerciseForm((current) => ({ ...current, seriesCount: String(clamped) }));
    normalizeSeriesCount(String(clamped));
  };

  const handleRestTextChange = (value: string) => {
    const sanitized = sanitizeIntText(value);
    setExerciseForm((current) => ({ ...current, descanso: sanitized }));
  };

  const snapRestToStep = () => {
    const current = parseInt(exerciseForm.descanso, 10);
    const safeCurrent = isNaN(current) ? 0 : Math.max(0, current);
    const snapped = Math.round(safeCurrent / REST_STEP) * REST_STEP;
    setRestValue(snapped);
  };

  const updateSeriesNumber = (index: number, field: keyof SeriesFormItem, value: number) => {
    const safeValue = Math.max(0, value);
    setSeriesForm((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: String(safeValue) }
          : item
      )
    );
  };

  const normalizeSeriesCount = (countText: string) => {
    const count = parseInt(countText, 10);

    if (isNaN(count) || count < MIN_SERIES) {
      return;
    }

    const cappedCount = Math.min(count, MAX_SERIES);

    if (cappedCount !== count) {
      setExerciseForm((current) => ({ ...current, seriesCount: String(MAX_SERIES) }));
    }

    setSeriesForm((current) => {
      const lastSeries = current[current.length - 1] ?? { reps: '', weight: '' };

      return Array.from({ length: cappedCount }, (_, index) => current[index] ?? lastSeries)
        .map((serie) => ({
          reps: serie.reps,
          weight: serie.weight,
        }));
    });
  };

  const buildSeriesList = (seriesData: SeriesFormItem[], completed = false) => {
    return seriesData.map((serie) => ({
      _id: new Realm.BSON.UUID(),
      reps: parseInt(serie.reps, 10) || 0,
      weight: parseFloat(serie.weight.replace(',', '.')) || 0,
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
        descanso: exercise.descanso.toString(),
      });
      setSeriesForm(
        exercise.series.map((serie) => ({
          reps: serie.reps.toString(),
          weight: serie.weight.toString(),
        }))
      );
    } else {
      setEditingExercise(null);
      setExerciseForm({ name: '', seriesCount: String(MIN_SERIES), descanso: '0' });
      setSeriesForm([{ reps: '0', weight: '0' }]);
    }
    setExerciseModalVisible(true);
  };

  const saveExercise = () => {
    if (!exerciseForm.name.trim() || !selectedRoutine) {
      return Alert.alert('Error', 'El nombre del ejercicio es obligatorio');
    }

    const targetCount = Math.max(MIN_SERIES, Math.min(MAX_SERIES, parseInt(exerciseForm.seriesCount) || 0));
    const descanso = parseInt(exerciseForm.descanso) || 0;
    const invalidSeries = seriesForm.some((serie) => {
      const reps = parseInt(serie.reps, 10);
      const weight = parseFloat(serie.weight.replace(',', '.'));

      return isNaN(reps) || isNaN(weight) || reps < 0 || weight < 0;
    });

    if (seriesForm.length !== targetCount || invalidSeries) {
      return Alert.alert('Error', 'Revisa los datos de cada serie.');
    }

    realm.write(() => {
      if (editingExercise) {
        editingExercise.name = exerciseForm.name;
        editingExercise.descanso = descanso;

        while (editingExercise.series.length > targetCount) {
          const lastSeries = editingExercise.series[editingExercise.series.length - 1];
          realm.delete(lastSeries);
        }

        while (editingExercise.series.length < targetCount) {
          const seriesIndex = editingExercise.series.length;
          const seriesData = seriesForm[seriesIndex] ?? seriesForm[seriesForm.length - 1];
          editingExercise.series.push(
            realm.create(Serie, {
              _id: new Realm.BSON.UUID(),
              reps: parseInt(seriesData.reps, 10) || 0,
              weight: parseFloat(seriesData.weight.replace(',', '.')) || 0,
              completed: false,
            })
          );
        }

        editingExercise.series.forEach((serie, index) => {
          const seriesData = seriesForm[index] ?? seriesForm[seriesForm.length - 1];
          serie.reps = parseInt(seriesData.reps, 10) || 0;
          serie.weight = parseFloat(seriesData.weight.replace(',', '.')) || 0;
        });
      } else {
        const newExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: exerciseForm.name,
          descanso,
          series: buildSeriesList(seriesForm),
        });
        selectedRoutine.exercises.push(newExercise);
      }
    });
    setExerciseModalVisible(false);
  };

  const deleteExercise = (exercise: Exercise) => {
    realm.write(() => {
      realm.delete(exercise.series);
      realm.delete(exercise);
    });
    setExerciseModalVisible(false);
  };

  const renderExerciseSwipeAction = (exercise: Exercise) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      onPress={() => deleteExercise(exercise)}
      activeOpacity={0.85}
    >
      <Text style={styles.swipeDeleteText}>Eliminar</Text>
    </TouchableOpacity>
  );

  const closeAllSwipeables = (exceptId?: string) => {
    swipeablesRef.current.forEach((ref, id) => {
      if (id !== exceptId && ref) {
        ref.close();
      }
    });
  };

  // ==========================================
  // VISTA DE EJERCICIOS (DETALLE DE RUTINA)
  // ==========================================
  if (selectedRoutine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              closeAllSwipeables();
              setSelectedRoutine(null);
            }} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openRoutineModal(selectedRoutine)} style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{selectedRoutine.name}</Text>
          </TouchableOpacity>
          
          <View style={styles.headerRightActions}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => {
                closeAllSwipeables();
                deleteRoutine(selectedRoutine);
              }}
            >
              <Text style={styles.deleteButtonTextMinimal}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButtonMinimal} 
              onPress={() => {
                closeAllSwipeables();
                openExerciseModal();
              }}
            >
              <Text style={styles.addButtonTextMinimal}>+ Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={selectedRoutine.exercises}
          keyExtractor={(item) => item._id.toHexString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          onScroll={() => closeAllSwipeables()}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => {
                if (ref) {
                  swipeablesRef.current.set(item._id.toHexString(), ref);
                }
              }}
              onSwipeableOpen={() => closeAllSwipeables(item._id.toHexString())}
              renderRightActions={() => renderExerciseSwipeAction(item)}
              overshootRight={false}
            >
              <TouchableOpacity 
                onPress={() => {
                  closeAllSwipeables();
                  openExerciseModal(item);
                }} 
                activeOpacity={0.7} 
                style={styles.exerciseItem}
              >
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>{item.name}</Text>
                </View>
                <View style={styles.tagContainer}>
                  <View style={styles.dataTag}><Text style={styles.tagText}>{item.series.length} Ser</Text></View>
                  <View style={styles.dataTag}><Text style={styles.tagText}>{item.descanso} s</Text></View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay ejercicios en esta rutina aún.</Text>
          }
        />

        {/* MODAL EJERCICIOS */}
        <Modal visible={isExerciseModalVisible} transparent animationType="fade">
          <KeyboardAvoidingView 
            behavior="padding" 
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del ejercicio</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Press banca"
                    value={exerciseForm.name}
                    onChangeText={(t) => setExerciseForm({...exerciseForm, name: t})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <NumberStepper
                    label="Series"
                    valueText={exerciseForm.seriesCount || ''}
                    onChangeText={handleSeriesCountTextChange}
                    onDecrement={() => setSeriesCountValue(getSeriesCountValue() - 1)}
                    onIncrement={() => setSeriesCountValue(getSeriesCountValue() + 1)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <NumberStepper
                    label="Descanso (segundos)"
                    valueText={exerciseForm.descanso || '0'}
                    onChangeText={handleRestTextChange}
                    onBlur={snapRestToStep}
                    onDecrement={() => setRestValue(getRestValue() - REST_STEP)}
                    onIncrement={() => setRestValue(getRestValue() + REST_STEP)}
                  />
                </View>

                <View style={styles.seriesEditorList}>
                  {seriesForm.map((serie, index) => (
                    <View key={`${index}-${exerciseForm.seriesCount}`} style={styles.seriesEditorCard}>
                      <Text style={styles.seriesEditorTitle}>Serie {index + 1}</Text>
                      <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 5 }]}>
                          <NumberStepper
                            label="Reps"
                            valueText={serie.reps}
                            onChangeText={(value) => {
                              const sanitized = sanitizeIntText(value);
                              setSeriesForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reps: sanitized } : item));
                            }}
                            onDecrement={() => updateSeriesNumber(index, 'reps', (parseInt(serie.reps, 10) || 0) - 1)}
                            onIncrement={() => updateSeriesNumber(index, 'reps', (parseInt(serie.reps, 10) || 0) + 1)}
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 5 }]}>
                          <NumberStepper
                            label="Peso (kg)"
                            valueText={serie.weight}
                            onChangeText={(value) => {
                              const sanitized = sanitizeWeightText(value);
                              setSeriesForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, weight: sanitized } : item));
                            }}
                            onDecrement={() => updateSeriesNumber(index, 'weight', Math.round((parseFloat(serie.weight.replace(',', '.')) || 0) - 1))}
                            onIncrement={() => updateSeriesNumber(index, 'weight', Math.round((parseFloat(serie.weight.replace(',', '.')) || 0) + 1))}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
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
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL EDITAR RUTINA */}
        <Modal visible={isRoutineModalVisible} transparent animationType="fade">
            <KeyboardAvoidingView 
              behavior="padding" 
              style={styles.modalOverlay}
            >
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
            </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL (LISTADO DE RUTINAS)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { justifyContent: 'space-between' }]}>
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
        <KeyboardAvoidingView 
          behavior="padding" 
          style={styles.modalOverlay}
        >
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
        </KeyboardAvoidingView>
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
  deleteButtonTextMinimal: { color: COLORS.danger, fontWeight: '600', fontSize: 16  },
  
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
  swipeDeleteAction: { backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  swipeDeleteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', marginTop: 60, color: COLORS.subText, fontSize: 16, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 24, elevation: 10, maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 30 },
  modalFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.text },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { 
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 15, color: COLORS.text
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  stepperBlock: { marginBottom: 0 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  stepperButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E6EEF8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepperButtonText: { color: COLORS.primary, fontSize: 20, fontWeight: '700', marginTop: -1 },
  stepperInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  stepperInput: { flex: 1, color: COLORS.text, fontSize: 20, fontWeight: '500', textAlign: 'center', paddingVertical: 0, minWidth: 24 },
  stepperSuffix: { color: COLORS.text, fontSize: 16, fontWeight: '500', marginLeft: 4 },
  seriesEditorList: { marginBottom: 4 },
  seriesEditorCard: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 12 },
  seriesEditorTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  
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