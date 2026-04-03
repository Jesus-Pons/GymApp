import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRealm, useQuery } from '@realm/react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Realm from 'realm';
import { BlurView } from 'expo-blur';

import { Routine, RoutineStatus } from '../models/Routine';
import { HistoryRoutine } from '../models/HistoryRoutine';
import { Exercise } from '../models/Exercise';
import { Serie } from '../models/Serie';
import { styles } from '../styles/HacerRutinaScreen.styles';
import { NumberStepper } from '../components/routines/NumberStepper';
import { SeriesPagerEditor } from '../components/routines/SeriesPagerEditor';
import {
  SeriesFormItem,
  MAX_SERIES,
  MIN_SERIES,
  buildSeriesList,
  normalizeSeriesFormCount,
  sanitizeIntText,
  sanitizeWeightText,
  syncExerciseSeries,
} from '../utils/routines/seriesForm';
import { clearDraftRoutines, cloneExerciseData, createDraftFromTemplate } from '../utils/routines/drafts';

export const HacerRutinaScreen = () => {
  const realm = useRealm();
  const navigation = useNavigation();

  const drafts = useQuery(Routine).filtered('status == $0', RoutineStatus.DRAFT);
  const activeRoutine = drafts.length > 0 ? drafts[0] : null;
  const templates = useQuery(Routine).filtered('status == $0', RoutineStatus.TEMPLATE);

  const [startTime, setStartTime] = useState<Date | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [editName, setEditName] = useState('');
  const [editSeriesCount, setEditSeriesCount] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editSeries, setEditSeries] = useState<SeriesFormItem[]>([]);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);

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

  const normalizeSeriesCount = (countText: string) => {
    const normalized = normalizeSeriesFormCount(editSeries, countText, MIN_SERIES, MAX_SERIES);

    if (!normalized) {
      return;
    }

    setEditSeriesCount(normalized.countText);
    setEditSeries(normalized.series);
  };

  const setSeriesCountValue = (nextValue: number) => {
    const clamped = Math.max(MIN_SERIES, Math.min(MAX_SERIES, nextValue));
    normalizeSeriesCount(String(clamped));
  };

  const setRestValue = (nextValue: number) => {
    const safeValue = Math.max(0, nextValue);
    setEditRest(String(safeValue));
  };

  const [activeRestId, setActiveRestId] = useState<string | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  const isFinishing = useRef(false);

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
  }, [activeRestId, restTimeRemaining]);

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

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!activeRoutine || isFinishing.current) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Cancelar Entrenamiento',
        'Si sales ahora se perdera tu progreso y no se guardara en el historial. Estas seguro?',
        [
          { text: 'Continuar entrenando', style: 'cancel' },
          {
            text: 'Si, cancelar rutina',
            style: 'destructive',
            onPress: () => {
              realm.write(() => {
                clearDraftRoutines(realm);
              });
              setStartTime(null);

              isFinishing.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, activeRoutine, realm]);

  useEffect(() => {
    if (activeRoutine && !startTime) {
      setStartTime(new Date());
    }
  }, [activeRoutine, startTime]);

  const handleStartRoutine = (template: Routine) => {
    realm.write(() => {
      createDraftFromTemplate(realm, template, true);
    });
  };

  const handleFinishRoutine = () => {
    if (!activeRoutine) return;

    if (activeRoutine.exercises.length === 0) {
      Alert.alert(
        'Entrenamiento vacio',
        'Tu rutina actual no tiene ejercicios. Quieres descartar este entrenamiento?',
        [
          { text: 'Volver y anadir', style: 'cancel' },
          {
            text: 'Descartar rutina',
            style: 'destructive',
            onPress: () => {
              realm.write(() => {
                clearDraftRoutines(realm);
              });
              setStartTime(null);

              isFinishing.current = true;
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'RutinasList' }],
                })
              );
            },
          },
        ]
      );
      return;
    }

    const allCompleted = activeRoutine.exercises.every((exercise) => exercise.isCompleted);

    if (!allCompleted) {
      Alert.alert(
        'Entrenamiento incompleto',
        'Debes completar todas las series antes de poder finalizar el entrenamiento.'
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
        historyRoutine.exercises.push(realm.create(Exercise, cloneExerciseData(exercise)));
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
    const serieId = serie._id.toHexString();
    const descanso = exercise.descanso;
    const wasCompleted = serie.completed;

    realm.write(() => {
      serie.completed = !serie.completed;
    });

    if (!wasCompleted && descanso > 0) {
      setActiveRestId(serieId);
      setRestTimeRemaining(descanso);
    }
  };

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
    setEditSeries([{ reps: '1', weight: '1' }]);
    setEditRest('0');
    setIsModalVisible(true);
  };

  const closeEditModal = () => {
    setIsModalVisible(false);
    setSelectedExercise(null);
  };

  const handleSaveExercise = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'El nombre del ejercicio no puede estar vacio.');
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
      Alert.alert('Datos invalidos', 'Por favor, introduce numeros validos.');
      return;
    }

    realm.write(() => {
      if (modalMode === 'edit' && selectedExercise) {
        selectedExercise.name = editName;
        selectedExercise.descanso = numRest;
        syncExerciseSeries(realm, selectedExercise, editSeries);
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
      'Eliminar ejercicio',
      'Estas seguro de que quieres quitar este ejercicio de tu sesion de hoy?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            realm.write(() => {
              realm.delete(selectedExercise.series);
              realm.delete(selectedExercise);
            });
            closeEditModal();
          },
        },
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

  return (
    <View style={styles.container}>
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeEditModal}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalMode === 'create' ? 'Anadir Ejercicio' : 'Ajustar Ejercicio'}
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
                    const sanitized = sanitizeIntText(value);
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
                    const sanitized = sanitizeIntText(value);
                    setEditRest(sanitized);
                  }}
                  onDecrement={() => setRestValue(Math.max(0, getRestValue() - 15))}
                  onIncrement={() => setRestValue(getRestValue() + 15)}
                />

                <View style={styles.seriesEditorList}>
                  <SeriesPagerEditor
                    series={editSeries}
                    activeSeriesIndex={activeSeriesIndex}
                    seriesCountKey={editSeriesCount}
                    onActiveSeriesIndexChange={setActiveSeriesIndex}
                    onRepsChange={(index, value) => {
                      const sanitized = sanitizeIntText(value);
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, reps: sanitized } : item
                        )
                      );
                    }}
                    onWeightChange={(index, value) => {
                      const sanitized = sanitizeWeightText(value);
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weight: sanitized } : item
                        )
                      );
                    }}
                    onRepsDecrement={(index) => {
                      const repsValue = parseInt(editSeries[index]?.reps ?? '0', 10) || 0;
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, reps: String(Math.max(0, repsValue - 1)) } : item
                        )
                      );
                    }}
                    onRepsIncrement={(index) => {
                      const repsValue = parseInt(editSeries[index]?.reps ?? '0', 10) || 0;
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, reps: String(repsValue + 1) } : item
                        )
                      );
                    }}
                    onWeightDecrement={(index) => {
                      const weightValue = Math.round((parseFloat((editSeries[index]?.weight ?? '0').replace(',', '.')) || 0) - 1);
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weight: String(weightValue) } : item
                        )
                      );
                    }}
                    onWeightIncrement={(index) => {
                      const weightValue = Math.round((parseFloat((editSeries[index]?.weight ?? '0').replace(',', '.')) || 0) + 1);
                      setEditSeries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weight: String(weightValue) } : item
                        )
                      );
                    }}
                  />
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

      {!activeRoutine ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Que entrenamos hoy?</Text>
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
                <Text style={styles.addExerciseBtnText}>+ Anadir ejercicio extra</Text>
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
