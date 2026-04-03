import Realm from 'realm';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useQuery, useRealm } from '@realm/react';

import { Routine, RoutineStatus } from '../models/Routine';
import { Exercise } from '../models/Exercise';
import { styles } from '../styles/RutinasScreen.styles';
import { NumberStepper } from '../components/routines/NumberStepper';
import { SeriesPagerEditor } from '../components/routines/SeriesPagerEditor';
import {
  SeriesFormItem,
  MAX_SERIES,
  MIN_SERIES,
  REST_STEP,
  buildSeriesList,
  normalizeSeriesFormCount,
  sanitizeIntText,
  sanitizeWeightText,
  syncExerciseSeries,
} from '../utils/routines/seriesForm';
import { createDraftFromTemplate } from '../utils/routines/drafts';

export const RutinasScreen = () => {
  const realm = useRealm();
  const navigation = useNavigation<any>();

  const routines = useQuery(Routine, (collection) =>
    collection.filtered('status == $0', RoutineStatus.TEMPLATE)
  );

  const drafts = useQuery(Routine, (collection) =>
    collection.filtered('status == $0', RoutineStatus.DRAFT)
  );

  useEffect(() => {
    if (drafts.length > 0) {
      navigation.navigate('HacerRutina');
    }
  }, [drafts.length, navigation]);

  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  const [isRoutineModalVisible, setRoutineModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineName, setRoutineName] = useState('');

  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '', seriesCount: '', descanso: '' });
  const [seriesForm, setSeriesForm] = useState<SeriesFormItem[]>([]);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const swipeablesRef = useRef<Map<string, any>>(new Map());

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

  const normalizeSeriesCount = (countText: string) => {
    const normalized = normalizeSeriesFormCount(seriesForm, countText, MIN_SERIES, MAX_SERIES);

    if (!normalized) {
      return;
    }

    setExerciseForm((current) => ({ ...current, seriesCount: normalized.countText }));
    setSeriesForm(normalized.series);
  };

  const setSeriesCountValue = (nextValue: number) => {
    const clamped = Math.max(MIN_SERIES, Math.min(MAX_SERIES, nextValue));
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

    normalizeSeriesCount(sanitized);
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

  const startRoutine = (templateRoutine: Routine) => {
    let draftId = '';

    realm.write(() => {
      const draftRoutine = createDraftFromTemplate(realm, templateRoutine);
      draftId = draftRoutine._id.toHexString();
    });

    navigation.navigate('HacerRutina', { routineId: draftId });
  };

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
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          realm.write(() => {
            routine.exercises.forEach((exercise) => {
              realm.delete(exercise.series);
            });
            realm.delete(routine.exercises);
            realm.delete(routine);
          });
          setSelectedRoutine(null);
          setRoutineModalVisible(false);
        },
      },
    ]);
  };

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
      setSeriesForm([{ reps: '1', weight: '1' }]);
      setActiveSeriesIndex(0);
    }
    setExerciseModalVisible(true);
  };

  const saveExercise = () => {
    if (!exerciseForm.name.trim() || !selectedRoutine) {
      return Alert.alert('Error', 'El nombre del ejercicio es obligatorio');
    }

    const targetCount = Math.max(MIN_SERIES, Math.min(MAX_SERIES, parseInt(exerciseForm.seriesCount, 10) || 0));
    const descanso = parseInt(exerciseForm.descanso, 10) || 0;
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
        syncExerciseSeries(realm, editingExercise, seriesForm);
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

  useEffect(() => {
    const maxIndex = Math.max(seriesForm.length - 1, 0);
    if (activeSeriesIndex > maxIndex) {
      setActiveSeriesIndex(maxIndex);
    }
  }, [seriesForm.length, activeSeriesIndex]);

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
            <Text style={styles.emptyText}>No hay ejercicios en esta rutina aun.</Text>
          }
        />

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
                    onChangeText={(t) => setExerciseForm({ ...exerciseForm, name: t })}
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
                  <SeriesPagerEditor
                    series={seriesForm}
                    activeSeriesIndex={activeSeriesIndex}
                    seriesCountKey={exerciseForm.seriesCount}
                    onActiveSeriesIndexChange={setActiveSeriesIndex}
                    onRepsChange={(index, value) => {
                      const sanitized = sanitizeIntText(value);
                      setSeriesForm((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, reps: sanitized } : item
                        )
                      );
                    }}
                    onWeightChange={(index, value) => {
                      const sanitized = sanitizeWeightText(value);
                      setSeriesForm((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weight: sanitized } : item
                        )
                      );
                    }}
                    onRepsDecrement={(index) => updateSeriesNumber(index, 'reps', (parseInt(seriesForm[index]?.reps ?? '0', 10) || 0) - 1)}
                    onRepsIncrement={(index) => updateSeriesNumber(index, 'reps', (parseInt(seriesForm[index]?.reps ?? '0', 10) || 0) + 1)}
                    onWeightDecrement={(index) => updateSeriesNumber(index, 'weight', Math.round((parseFloat((seriesForm[index]?.weight ?? '0').replace(',', '.')) || 0) - 1))}
                    onWeightIncrement={(index) => updateSeriesNumber(index, 'weight', Math.round((parseFloat((seriesForm[index]?.weight ?? '0').replace(',', '.')) || 0) + 1))}
                  />
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
          <Text style={styles.emptyText}>No tienes rutinas aun. Anade una.</Text>
        }
      />

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
