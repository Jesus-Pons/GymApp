import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRealm, useQuery } from '@realm/react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Realm from 'realm';
import { BlurView } from 'expo-blur';

import { Routine, RoutineStatus } from '../models/Routine';
import { HistoryRoutine } from '../models/HistoryRoutine';
import { Exercise } from '../models/Exercise';
import { Serie } from '../models/Serie';

type SeriesFormItem = {
  reps: string;
  weight: string;
};

const MAX_SERIES = 10;
const MIN_SERIES = 1;

type NumberStepperProps = {
  label: string;
  valueText: string;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  suffix?: string;
};

const NumberStepper = ({ label, valueText, onChangeText, onDecrement, onIncrement, suffix }: NumberStepperProps) => {
  return (
    <View style={styles.stepperBlock}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.stepperRow}>
        <TouchableOpacity onPress={onDecrement} style={styles.stepperButton} activeOpacity={0.7}>
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>

        <View style={styles.stepperInputWrap}>
          <TextInput
            style={styles.stepperInput}
            keyboardType="numeric"
            value={valueText}
            onChangeText={onChangeText}
          />
          {suffix && <Text style={styles.stepperSuffix}>{suffix}</Text>}
        </View>

        <TouchableOpacity onPress={onIncrement} style={styles.stepperButton} activeOpacity={0.7}>
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HacerRutinaScreen = () => {
  const realm = useRealm();
  const navigation = useNavigation();

  const drafts = useQuery(Routine).filtered('status == $0', RoutineStatus.DRAFT);
  const activeRoutine = drafts.length > 0 ? drafts[0] : null;
  const templates = useQuery(Routine).filtered('status == $0', RoutineStatus.TEMPLATE);

  const [startTime, setStartTime] = useState<Date | null>(null);

  // --- ESTADOS DEL MODAL ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  const [editName, setEditName] = useState('');
  const [editSeriesCount, setEditSeriesCount] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editSeries, setEditSeries] = useState<SeriesFormItem[]>([]);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [seriesPagerWidth, setSeriesPagerWidth] = useState(0);

  const getSeriesCountValue = () => {
    const parsed = parseInt(editSeriesCount, 10);
    if (isNaN(parsed)) return MIN_SERIES;
    return Math.max(MIN_SERIES, Math.min(MAX_SERIES, parsed));
  };

  const getRestValue = () => {
    const parsed = parseInt(editRest, 10);
    if (isNaN(parsed)) return 0;
    return Math.max(0, parsed);
  };

  const setSeriesCountValue = (nextValue: number) => {
    const clamped = Math.max(MIN_SERIES, Math.min(MAX_SERIES, nextValue));
    setEditSeriesCount(String(clamped));
    normalizeSeriesCount(String(clamped));
  };

  const setRestValue = (nextValue: number) => {
    const safeValue = Math.max(0, nextValue);
    setEditRest(String(safeValue));
  };

  // --- ESTADO DEL TEMPORIZADOR ---
  const [activeRestId, setActiveRestId] = useState<string | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  const isFinishing = useRef(false);

  // --- TEMPORIZADOR DE DESCANSO ---
  useEffect(() => {
    if (activeRestId === null) {
      return;
    }

    if (restTimeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRestTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeRestId]);

  // Cerrar temporizador automáticamente cuando llega a 0
  useEffect(() => {
    if (restTimeRemaining === 0 && activeRestId !== null) {
      const timer = setTimeout(() => {
        setActiveRestId(null);
        setRestTimeRemaining(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [restTimeRemaining, activeRestId]);

  const skipRestTimer = () => {
    setActiveRestId(null);
    setRestTimeRemaining(0);
  };

  const clearDraftRoutines = () => {
    const allDrafts = realm.objects(Routine).filtered('status == $0', RoutineStatus.DRAFT);

    allDrafts.forEach((draft) => {
      draft.exercises.forEach((exercise) => {
        realm.delete(exercise.series);
      });
      realm.delete(draft.exercises);
    });

    realm.delete(allDrafts);
  };

  const cloneExerciseData = (exercise: Exercise) => ({
    _id: new Realm.BSON.UUID(),
    name: exercise.name,
    descanso: exercise.descanso,
    series: exercise.series.map((serie) => ({
      _id: new Realm.BSON.UUID(),
      reps: serie.reps,
      weight: serie.weight,
      completed: serie.completed,
    })),
  });

  const normalizeSeriesCount = (countText: string) => {
    const count = parseInt(countText, 10);

    if (isNaN(count) || count < 1) {
      return;
    }

    const cappedCount = Math.min(count, MAX_SERIES);

    if (cappedCount !== count) {
      setEditSeriesCount(String(MAX_SERIES));
    }

    setEditSeries([{reps: '1', weight: '1'}])
  };

  const syncExerciseSeries = (exercise: Exercise, seriesData: SeriesFormItem[]) => {
    while (exercise.series.length > seriesData.length) {
      const lastSeries = exercise.series[exercise.series.length - 1];
      realm.delete(lastSeries);
    }

    while (exercise.series.length < seriesData.length) {
      const seriesIndex = exercise.series.length;
      const seriesForm = seriesData[seriesIndex] ?? seriesData[seriesData.length - 1];
      exercise.series.push(
        realm.create(Serie, {
          _id: new Realm.BSON.UUID(),
          reps: parseInt(seriesForm.reps, 10) || 0,
          weight: parseFloat(seriesForm.weight.replace(',', '.')) || 0,
          completed: false,
        })
      );
    }

    exercise.series.forEach((serie, index) => {
      const seriesForm = seriesData[index] ?? seriesData[seriesData.length - 1];
      serie.reps = parseInt(seriesForm.reps, 10) || 0;
      serie.weight = parseFloat(seriesForm.weight.replace(',', '.')) || 0;
    });
  };

  const buildSeriesList = (seriesData: SeriesFormItem[]) => {
    return seriesData.map((serie) => ({
      _id: new Realm.BSON.UUID(),
      reps: parseInt(serie.reps, 10) || 0,
      weight: parseFloat(serie.weight.replace(',', '.')) || 0,
      completed: false,
    }));
  };

  // --- INTERCEPTAR NAVEGACIÓN ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!activeRoutine || isFinishing.current) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        "Cancelar Entrenamiento",
        "Si sales ahora se perderá tu progreso y no se guardará en el historial. ¿Estás seguro?",
        [
          { text: "Continuar entrenando", style: "cancel" },
          {
            text: "Sí, cancelar rutina",
            style: "destructive",
            onPress: () => {
              realm.write(() => {
                clearDraftRoutines();
              });
              setStartTime(null);
              
              isFinishing.current = true;
              navigation.dispatch(e.data.action);
            }
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, activeRoutine]);

  useEffect(() => {
    if (activeRoutine && !startTime) {
      setStartTime(new Date());
    }
  }, [activeRoutine]);

  // --- INICIAR Y FINALIZAR ---
  const handleStartRoutine = (template: Routine) => {
    realm.write(() => {
      clearDraftRoutines();

      const draft = realm.create(Routine, {
        _id: new Realm.BSON.UUID(),
        name: template.name,
        status: RoutineStatus.DRAFT,
        createdAt: new Date(),
        exercises: [],
      });

      template.exercises.forEach((exercise) => {
        const copiedExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: exercise.name,
          descanso: exercise.descanso,
          series: exercise.series.map((serie) => ({
            _id: new Realm.BSON.UUID(),
            reps: serie.reps,
            weight: serie.weight,
            completed: false,
          })),
        });

        draft.exercises.push(copiedExercise);
      });
    });
  };

  const handleFinishRoutine = () => {
    if (!activeRoutine) return;

    if (activeRoutine.exercises.length === 0) {
      Alert.alert(
        "Entrenamiento vacío",
        "Tu rutina actual no tiene ejercicios. ¿Quieres descartar este entrenamiento?",
        [
          { text: "Volver y añadir", style: "cancel" },
          {
            text: "Descartar rutina",
            style: "destructive",
            onPress: () => {
              realm.write(() => {
                clearDraftRoutines();
              });
              setStartTime(null);
              
              isFinishing.current = true;
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'RutinasList' }],
                })
              );
            }
          }
        ]
      );
      return; 
    }

    const allCompleted = activeRoutine.exercises.every((exercise) => exercise.isCompleted);
    
    if (!allCompleted) {
      Alert.alert(
        "¡Entrenamiento incompleto!", 
        "Debes completar todas las series antes de poder finalizar el entrenamiento."
      );
      return;
    }

    const endTime = new Date();
    const durationMs = startTime ? endTime.getTime() - startTime.getTime() : 60000;
    const durationMinutes = Math.max(1, Math.floor(durationMs / 60000));

    realm.write(() => {
      const historyRoutine = realm.create(HistoryRoutine, {
        _id: new Realm.BSON.UUID(),
        originalRoutineId: activeRoutine._id.toHexString(),
        name: activeRoutine.name,
        exercises: [],
        createdAt: activeRoutine.createdAt,
        completedAt: endTime,
        durationMinutes: durationMinutes,
      });

      activeRoutine.exercises.forEach((exercise) => {
        historyRoutine.exercises.push(
          realm.create(Exercise, cloneExerciseData(exercise))
        );
      });

      activeRoutine.exercises.forEach((exercise) => {
        realm.delete(exercise.series);
      });

      realm.delete(activeRoutine.exercises);
      realm.delete(activeRoutine);
    });

    setStartTime(null);

    isFinishing.current = true;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'RutinasList' }],
      })
    );

    navigation.navigate('Historial' as never);
  };

  const toggleSerieComplete = (serie: Serie, exercise: Exercise) => {
    // Capturar valores ANTES de escribir en Realm
    const serieId = serie._id.toHexString();
    const descanso = exercise.descanso;
    const wasCompleted = serie.completed;

    realm.write(() => {
      serie.completed = !serie.completed;
    });

    // Si la serie acaba de completarse, inicia el temporizador
    if (!wasCompleted && descanso > 0) {
      setActiveRestId(serieId);
      setRestTimeRemaining(descanso);
    }
  };

  // --- GESTIÓN DE EJERCICIOS (MODAL) ---
  const openEditModal = (exercise: Exercise) => {
    setModalMode('edit');
    setSelectedExercise(exercise);
    setEditName(exercise.name);
    setEditSeriesCount(exercise.series.length.toString());
    setActiveSeriesIndex(0);
    setEditSeries(
      exercise.series.map((serie) => ({
        reps: serie.reps.toString(),
        weight: serie.weight.toString(),
      }))
    );
    setEditRest(exercise.descanso.toString());
    setIsModalVisible(true);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedExercise(null);
    setEditName('');
    setEditSeriesCount('1');
    setActiveSeriesIndex(0);
    normalizeSeriesCount('1');
    setEditRest('0');
    setIsModalVisible(true);
  };

  const closeEditModal = () => {
    setIsModalVisible(false);
    setSelectedExercise(null);
  };

  const handleSaveExercise = () => {
    if (!editName.trim()) {
      Alert.alert("Error", "El nombre del ejercicio no puede estar vacío.");
      return;
    }

    const numSeries = Math.min(MAX_SERIES, parseInt(editSeriesCount, 10));
    const numRest = parseInt(editRest, 10);
    const invalidSeries = editSeries.some((serie) => {
      const reps = parseInt(serie.reps, 10);
      const weight = parseFloat(serie.weight.replace(',', '.'));

      return isNaN(reps) || isNaN(weight) || reps < 0 || weight < 0;
    });

    if (isNaN(numSeries) || isNaN(numRest) || numSeries < 1 || numRest < 0 || invalidSeries || editSeries.length !== numSeries) {
      Alert.alert("Datos inválidos", "Por favor, introduce números válidos.");
      return;
    }

    realm.write(() => {
      if (modalMode === 'edit' && selectedExercise) {
        selectedExercise.name = editName;
        selectedExercise.descanso = numRest;
        syncExerciseSeries(selectedExercise, editSeries);
      } else if (modalMode === 'create' && activeRoutine) {
        const newExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: editName,
          descanso: numRest,
          series: buildSeriesList(editSeries),
        });
        activeRoutine.exercises.push(newExercise);
      }
    });

    closeEditModal();
  };

  const handleDeleteExercise = () => {
    if (!selectedExercise) return;

    Alert.alert(
      "Eliminar ejercicio",
      "¿Estás seguro de que quieres quitar este ejercicio de tu sesión de hoy?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            realm.write(() => {
              realm.delete(selectedExercise.series);
              realm.delete(selectedExercise);
            });
            closeEditModal();
          }
        }
      ]
    );
  };

  const isRoutineReadyToFinish =
    !!activeRoutine &&
    activeRoutine.exercises.length > 0 &&
    activeRoutine.exercises.every((exercise) => exercise.isCompleted);

  useEffect(() => {
    const maxIndex = Math.max(editSeries.length - 1, 0);
    if (activeSeriesIndex > maxIndex) {
      setActiveSeriesIndex(maxIndex);
    }
  }, [editSeries.length, activeSeriesIndex]);

  // =======================================================
  return (
    <View style={styles.container}>
      {/* --- MODAL PARA AÑADIR/EDITAR EJERCICIO --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeEditModal}>
        <KeyboardAvoidingView 
          behavior="padding" 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} 
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalMode === 'create' ? 'Añadir Ejercicio' : 'Ajustar Ejercicio'}
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del Ejercicio</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="ej: Press Banca"
                  />
                </View>

                <NumberStepper
                  label="Series"
                  valueText={editSeriesCount}
                  onChangeText={(value) => {
                    const sanitized = value.replace(/[^0-9]/g, '');
                    setEditSeriesCount(sanitized);
                    if (sanitized) {
                      normalizeSeriesCount(sanitized);
                    }
                  }}
                  onDecrement={() => setSeriesCountValue(Math.max(MIN_SERIES, getSeriesCountValue() - 1))}
                  onIncrement={() => setSeriesCountValue(getSeriesCountValue() + 1)}
                />

                <NumberStepper
                  label="Descanso entre series (segundos)"
                  valueText={editRest}
                  onChangeText={(value) => {
                    const sanitized = value.replace(/[^0-9]/g, '');
                    setEditRest(sanitized);
                  }}
                  onDecrement={() => setRestValue(Math.max(0, getRestValue() - 15))}
                  onIncrement={() => setRestValue(getRestValue() + 15)}
                />

                <View style={styles.seriesEditorList}>
                  {editSeries.length === 0 ? (
                    <View style={styles.seriesEmptySpace} />
                  ) : (
                    <View
                      style={styles.seriesPagerContainer}
                      onLayout={(event) => {
                        const width = Math.floor(event.nativeEvent.layout.width);
                        if (width > 0 && width !== seriesPagerWidth) {
                          setSeriesPagerWidth(width);
                        }
                      }}
                    >
                      <View style={styles.seriesPagerHeader}>
                        <Text style={styles.seriesPagerCount}>Serie {activeSeriesIndex + 1} de {editSeries.length}</Text>
                      </View>

                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) => {
                          const width = event.nativeEvent.layoutMeasurement.width;
                          if (width <= 0) {
                            return;
                          }
                          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                          const maxIndex = Math.max(editSeries.length - 1, 0);
                          setActiveSeriesIndex(Math.min(Math.max(nextIndex, 0), maxIndex));
                        }}
                      >
                        {editSeries.map((serie, index) => (
                          <View
                            key={`${index}-${editSeriesCount}`}
                            style={[
                              styles.seriesEditorCard,
                              styles.seriesSlide,
                              seriesPagerWidth > 0 ? { width: seriesPagerWidth } : null,
                            ]}
                          >
                            <Text style={styles.seriesEditorTitle}>Serie {index + 1}</Text>
                            <View style={styles.rowInputs}>
                              <View style={{ flex: 1, marginRight: 5 }}>
                                <NumberStepper
                                  label="Reps"
                                  valueText={serie.reps}
                                  onChangeText={(value) => {
                                    const sanitized = value.replace(/[^0-9]/g, '');
                                    setEditSeries((current) => 
                                      current.map((item, itemIndex) => 
                                        itemIndex === index ? { ...item, reps: sanitized } : item
                                      )
                                    );
                                  }}
                                  onDecrement={() => {
                                    const repsValue = parseInt(serie.reps, 10) || 0;
                                    setEditSeries((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, reps: String(Math.max(0, repsValue - 1)) } : item
                                      )
                                    );
                                  }}
                                  onIncrement={() => {
                                    const repsValue = parseInt(serie.reps, 10) || 0;
                                    setEditSeries((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, reps: String(repsValue + 1) } : item
                                      )
                                    );
                                  }}
                                />
                              </View>
                              <View style={{ flex: 1, marginLeft: 5 }}>
                                <NumberStepper
                                  label="Peso (kg)"
                                  valueText={serie.weight}
                                  onChangeText={(value) => {
                                    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                    const firstDot = sanitized.indexOf('.');
                                    const formatted = firstDot === -1 ? sanitized : sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '');
                                    setEditSeries((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, weight: formatted } : item
                                      )
                                    );
                                  }}
                                  onDecrement={() => {
                                    const weightValue = Math.round((parseFloat(serie.weight.replace(',', '.')) || 0) - 1);
                                    setEditSeries((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, weight: String(weightValue) } : item
                                      )
                                    );
                                  }}
                                  onIncrement={() => {
                                    const weightValue = Math.round((parseFloat(serie.weight.replace(',', '.')) || 0) + 1);
                                    setEditSeries((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, weight: String(weightValue) } : item
                                      )
                                    );
                                  }}
                                />
                              </View>
                            </View>
                          </View>
                        ))}
                      </ScrollView>

                      {editSeries.length > 1 && (
                        <View style={styles.seriesDotsRow}>
                          {editSeries.map((_, index) => (
                            <View
                              key={`dot-${index}`}
                              style={[
                                styles.seriesDot,
                                index === activeSeriesIndex && styles.seriesDotActive,
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveExercise}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>

              {modalMode === 'edit' && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteExercise}>
                  <Text style={styles.deleteButtonText}>Eliminar este ejercicio</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- PANTALLA PRINCIPAL --- */}
      {!activeRoutine ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>¿Qué entrenamos hoy?</Text>
            <Text style={styles.subtitleNeutral}>Selecciona una plantilla para empezar</Text>
          </View>

          {templates.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emoji}>📝</Text>
              <Text style={styles.emptyText}>No tienes plantillas creadas.</Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => item._id.toHexString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.templateCard}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.templateName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.templateCount}>{item.exercises.length} ejercicios</Text>
                  </View>
                  <TouchableOpacity style={styles.startButton} onPress={() => handleStartRoutine(item)}>
                    <Text style={styles.startButtonText}>▶️ Iniciar</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      ) : (
        <>
          <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={styles.title}>{activeRoutine.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.cancelSessionBtn} 
              onPress={() => navigation.goBack()} 
            >
              <Text style={styles.cancelSessionBtnText}>✕ Cancelar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={activeRoutine.exercises}
            keyExtractor={(item) => item._id.toHexString()}
            contentContainerStyle={styles.listContainer}
            ListFooterComponent={
              <TouchableOpacity style={styles.addExerciseBtn} onPress={openCreateModal}>
                <Text style={styles.addExerciseBtnText}>+ Añadir ejercicio extra</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const completedSeriesCount = item.series.filter((serie) => serie.completed).length;
              const isCompleted = item.isCompleted;
              
              return (
                <View style={[styles.exerciseCardWrapper, isCompleted && styles.exerciseCardCompleted]}>
                  <View style={styles.exerciseCardBody}>
                    <View style={styles.exerciseHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.exerciseName, isCompleted && styles.textCompleted]}>{item.name}</Text>
                        <View style={styles.exerciseInfoRow}>
                          <Text style={styles.exerciseDetails}><Text style={styles.bold}>{item.series.length}</Text> series</Text>
                          <Text style={styles.exerciseDetails}><Text style={styles.bold}>{item.descanso}</Text> s descanso</Text>
                          <Text style={styles.exerciseDetails}><Text style={styles.bold}>{completedSeriesCount}/{item.series.length}</Text> hechas</Text>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.editExerciseButton} onPress={() => openEditModal(item)}>
                        <Text style={styles.editExerciseButtonText}>Editar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.seriesList}>
                      {item.series.map((serie, index) => {
                        const serieDone = serie.completed;

                        return (
                          <TouchableOpacity
                            key={serie._id.toHexString()}
                            style={[styles.seriesRow, serieDone && styles.seriesRowCompleted]}
                            activeOpacity={0.7}
                            onPress={() => toggleSerieComplete(serie, item)}
                          >
                            <View style={[styles.seriesCheckbox, serieDone && styles.seriesCheckboxChecked]}>
                              {serieDone && <Text style={styles.seriesCheckmark}>✓</Text>}
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={[styles.seriesTitle, serieDone && styles.textCompleted]}>Serie {index + 1}</Text>
                              <Text style={styles.seriesSubtitle}>
                                <Text style={styles.bold}>{serie.reps}</Text> reps · <Text style={styles.bold}>{serie.weight}</Text> kg
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <Modal
            visible={activeRestId !== null}
            transparent
            animationType="fade"
            statusBarTranslucent
          >
            <View style={styles.restOverlayRoot}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
              ) : (
                <View style={styles.restOverlayAndroidFallback} />
              )}
              <View style={styles.restOverlayDim} />

              <View style={styles.restOverlayContent}>
                <Text style={styles.restOverlayIcon}>⏱</Text>
                <Text style={styles.restOverlayTitle}>Descanso</Text>
                <Text style={styles.restOverlaySeconds}>{restTimeRemaining}</Text>
                <Text style={styles.restOverlaySubtitle}>segundos</Text>

                <TouchableOpacity style={styles.restOverlaySkipButton} onPress={skipRestTimer}>
                  <Text style={styles.restOverlaySkipText}>Saltar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.finishButton, isRoutineReadyToFinish ? styles.finishButtonReady : styles.finishButtonPending]}
              onPress={handleFinishRoutine}
            >
              <Text style={[styles.finishButtonText, isRoutineReadyToFinish ? styles.finishButtonTextReady : styles.finishButtonTextPending]}>
                Finalizar Entrenamiento
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitleActive: { fontSize: 16, color: '#EF4444', marginTop: 4, fontWeight: '600' },
  subtitleNeutral: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  emoji: { fontSize: 60, marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', textAlign: 'center' },
  listContainer: { padding: 16, paddingBottom: 100 },
  
  templateCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  templateName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  templateCount: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  startButton: { backgroundColor: '#3B82F6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  startButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  exerciseCardWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, elevation: 2, overflow: 'hidden' },
  exerciseCardCompleted: { opacity: 0.72, backgroundColor: '#F9FAFB' },
  exerciseCardBody: { padding: 16 },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  editExerciseButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EFF6FF', marginLeft: 12 },
  editExerciseButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 12 },
  
  exerciseName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  textCompleted: { textDecorationLine: 'line-through', color: '#6B7280' },
  exerciseInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8 },
  exerciseDetails: { fontSize: 15, color: '#4B5563' },
  bold: { fontWeight: 'bold', color: '#111827' },
  editIcon: { fontSize: 16, color: '#9CA3AF' },

  seriesList: { marginTop: 14, gap: 10 },
  seriesRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  seriesRowCompleted: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  seriesCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#FFFFFF' },
  seriesCheckboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  seriesCheckmark: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, marginTop: -1 },
  seriesTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  seriesSubtitle: { fontSize: 14, color: '#4B5563', marginTop: 2 },

  restOverlayRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  restOverlayAndroidFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.72)' },
  restOverlayDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.42)' },
  restOverlayContent: { alignItems: 'center', paddingHorizontal: 24 },
  restOverlayIcon: { fontSize: 40, color: '#3B82F6', marginBottom: 10, fontWeight: '700' },
  restOverlayTitle: { fontSize: 36, color: '#D5E2F3', fontWeight: '600', marginBottom: 6 },
  restOverlaySeconds: { fontSize: 116, lineHeight: 116, color: '#3B82F6', fontWeight: '800', marginBottom: 6 },
  restOverlaySubtitle: { fontSize: 32, color: '#7F92AE', fontWeight: '500', marginBottom: 28 },
  restOverlaySkipButton: { backgroundColor: '#1E2A3C', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 42 },
  restOverlaySkipText: { color: '#E9EEF7', fontSize: 32, fontWeight: '700' },
  
  addExerciseBtn: { backgroundColor: '#E0E7FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed' },
  addExerciseBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10 },
  finishButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  finishButtonPending: { backgroundColor: '#A7F3D0' },
  finishButtonReady: { backgroundColor: '#10B981' },
  finishButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  finishButtonTextPending: { color: '#065F46' },
  finishButtonTextReady: { color: '#FFFFFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', elevation: 20 },
  modalHeader: { marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  formContainer: { marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  seriesEditorList: { marginBottom: 8 },
  seriesEmptySpace: { height: 0 },
  seriesPagerContainer: { marginBottom: 8 },
  seriesPagerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seriesPagerHint: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  seriesPagerCount: { fontSize: 12, color: '#374151', fontWeight: '700' },
  seriesEditorCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 },
  seriesSlide: { marginBottom: 0 },
  seriesDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 4, gap: 6 },
  seriesDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  seriesDotActive: { width: 18, backgroundColor: '#3B82F6' },
  seriesEditorTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  numericInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 18, color: '#111827', fontWeight: 'bold', textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  cancelButton: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 2, backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  cancelSessionBtn: {
    backgroundColor: '#FEE2E2', 
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelSessionBtnText: {
    color: '#EF4444', 
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepperBlock: { marginBottom: 16 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  stepperButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepperButtonText: { color: '#3B82F6', fontSize: 20, fontWeight: '700', marginTop: -1 },
  stepperInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  stepperInput: { flex: 1, color: '#111827', fontSize: 18, fontWeight: '500', textAlign: 'center', paddingVertical: 0, minWidth: 24 },
  stepperSuffix: { color: '#111827', fontSize: 16, fontWeight: '500', marginLeft: 4 },
});