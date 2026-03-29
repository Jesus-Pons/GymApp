import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRealm, useQuery } from '@realm/react';
import { useNavigation } from '@react-navigation/native';
import Realm from 'realm';

import { Routine, RoutineStatus } from '../models/Routine';
import { HistoryRoutine } from '../models/HistoryRoutine';
import { Exercise } from '../models/Exercise';

export const HacerRutinaScreen = () => {
  const realm = useRealm();
  const navigation = useNavigation();

  const drafts = useQuery(Routine).filtered('status == $0', RoutineStatus.DRAFT);
  const activeRoutine = drafts.length > 0 ? drafts[0] : null;
  const templates = useQuery(Routine).filtered('status == $0', RoutineStatus.TEMPLATE);

  const [startTime, setStartTime] = useState<Date | null>(null);

  // --- NUEVO: ESTADO FRONTEND PARA LOS CHECKS ---
  // Guardamos las IDs (en texto) de los ejercicios que se han marcado
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  // --- ESTADOS DEL MODAL ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  const [editName, setEditName] = useState('');
  const [editSeries, setEditSeries] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');

  useEffect(() => {
    if (activeRoutine && !startTime) {
      setStartTime(new Date());
    }
  }, [activeRoutine]);

  // --- INICIAR Y FINALIZAR ---
  const handleStartRoutine = (template: Routine) => {
    // Limpiamos los checks anteriores por si acaso
    setCompletedExercises(new Set()); 

    realm.write(() => {
      const draft = realm.create(Routine, {
        _id: new Realm.BSON.UUID(),
        name: template.name,
        status: RoutineStatus.DRAFT,
        createdAt: new Date(),
        exercises: [] 
      });

      template.exercises.forEach(ex => {
        draft.exercises.push(realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: ex.name,
          series: ex.series,
          reps: ex.reps,
          weight: ex.weight
        }));
      });
    });
  };

const handleFinishRoutine = () => {
    if (!activeRoutine) return;

    // --- NUEVA VALIDACIÓN: ¿Está vacía la rutina? ---
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
              // Borramos el DRAFT sin guardarlo en el historial
              realm.write(() => {
                realm.delete(activeRoutine);
              });
              setStartTime(null);
              setCompletedExercises(new Set());
            }
          }
        ]
      );
      return; // Detenemos la ejecución aquí
    }

    // --- VALIDACIÓN FRONTEND: Comprobar checks (solo si hay ejercicios) ---
    const allCompleted = activeRoutine.exercises.every(ex => 
      completedExercises.has(ex._id.toHexString())
    );
    
    if (!allCompleted) {
      Alert.alert(
        "¡Entrenamiento incompleto!", 
        "Debes marcar todos los ejercicios con el check (✅) antes de poder finalizar el entrenamiento."
      );
      return;
    }

    // --- GUARDADO NORMAL ---
    Alert.alert(
      "Finalizar Entrenamiento",
      "¡Buen trabajo! ¿Guardamos el entrenamiento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, finalizar",
          style: "default",
          onPress: () => {
            const endTime = new Date();
            const durationMs = startTime ? endTime.getTime() - startTime.getTime() : 60000;
            const durationMinutes = Math.max(1, Math.floor(durationMs / 60000)); 

            realm.write(() => {
              realm.create(HistoryRoutine, {
                _id: new Realm.BSON.UUID(),
                originalRoutineId: activeRoutine.name,
                name: activeRoutine.name,
                exercises: activeRoutine.exercises, 
                createdAt: activeRoutine.createdAt,
                completedAt: endTime,
                durationMinutes: durationMinutes,
              });

              realm.delete(activeRoutine);
            });

            setStartTime(null);
            setCompletedExercises(new Set()); 
            navigation.navigate('Historial' as never);
          }
        }
      ]
    );
  };

  // --- TOGGLE CHECKBOX (Frontend Solo) ---
  const toggleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises(prevSet => {
      const newSet = new Set(prevSet);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId); // Si estaba marcado, lo desmarcamos
      } else {
        newSet.add(exerciseId); // Si no estaba, lo marcamos
      }
      return newSet;
    });
  };

  // --- GESTIÓN DE EJERCICIOS (MODAL) ---
  const openEditModal = (exercise: Exercise) => {
    setModalMode('edit');
    setSelectedExercise(exercise);
    setEditName(exercise.name);
    setEditSeries(exercise.series.toString());
    setEditReps(exercise.reps.toString());
    setEditWeight(exercise.weight.toString());
    setIsModalVisible(true);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedExercise(null);
    setEditName('');
    setEditSeries('');
    setEditReps('');
    setEditWeight('');
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

    const numSeries = parseInt(editSeries, 10);
    const numReps = parseInt(editReps, 10);
    const numWeight = parseFloat(editWeight.replace(',', '.'));

    if (isNaN(numSeries) || isNaN(numReps) || isNaN(numWeight) || numSeries < 0 || numReps < 0 || numWeight < 0) {
      Alert.alert("Datos inválidos", "Por favor, introduce números válidos.");
      return;
    }

    realm.write(() => {
      if (modalMode === 'edit' && selectedExercise) {
        selectedExercise.name = editName;
        selectedExercise.series = numSeries;
        selectedExercise.reps = numReps;
        selectedExercise.weight = numWeight;
      } else if (modalMode === 'create' && activeRoutine) {
        const newExercise = realm.create(Exercise, {
          _id: new Realm.BSON.UUID(),
          name: editName,
          series: numSeries,
          reps: numReps,
          weight: numWeight,
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
            const exerciseId = selectedExercise._id.toHexString();
            realm.write(() => {
              realm.delete(selectedExercise);
            });
            
            // Si estaba marcado como completado, lo quitamos del Set de checks
            setCompletedExercises(prev => {
              const newSet = new Set(prev);
              newSet.delete(exerciseId);
              return newSet;
            });
            
            closeEditModal();
          }
        }
      ]
    );
  };

  // =======================================================
  return (
    <View style={styles.container}>
      {/* --- MODAL PARA AÑADIR/EDITAR EJERCICIO --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeEditModal}>
        <KeyboardAvoidingView 
  behavior="padding" // Usamos padding en vez de height o undefined
  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Empujoncito extra en Android
  style={styles.modalOverlay}
>
          <View style={styles.modalContent}>
            <ScrollView 
  showsVerticalScrollIndicator={false} 
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{ flexGrow: 1 }} // <-- Añade esta propiedad
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

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Series</Text>
                    <TextInput style={styles.numericInput} keyboardType="numeric" value={editSeries} onChangeText={setEditSeries} placeholder="3" />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Reps</Text>
                    <TextInput style={styles.numericInput} keyboardType="numeric" value={editReps} onChangeText={setEditReps} placeholder="10" />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Kg</Text>
                    <TextInput style={styles.numericInput} keyboardType="decimal-pad" value={editWeight} onChangeText={setEditWeight} placeholder="60" />
                  </View>
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
                  <Text style={styles.deleteButtonText}>🗑️ Eliminar este ejercicio</Text>
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
          <View style={styles.header}>
            <Text style={styles.title}>{activeRoutine.name}</Text>
            <Text style={styles.subtitleActive}>Entrenamiento en curso 🔥</Text>
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
              const isChecked = completedExercises.has(item._id.toHexString());
              
              return (
                <View style={[styles.exerciseCardWrapper, isChecked && styles.exerciseCardCompleted]}>
                  
                  <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={() => toggleExerciseComplete(item._id.toHexString())}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ flex: 1, padding: 16, paddingLeft: 0 }} 
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exerciseName, isChecked && styles.textCompleted]}>{item.name}</Text>
                    <View style={styles.exerciseInfoRow}>
                      <Text style={styles.exerciseDetails}><Text style={styles.bold}>{item.series}</Text> series</Text>
                      <Text style={styles.exerciseDetails}><Text style={styles.bold}>{item.reps}</Text> reps</Text>
                      <Text style={styles.exerciseDetails}><Text style={styles.bold}>{item.weight}</Text> kg</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={{ paddingRight: 16, justifyContent: 'center' }}>
                    <Text style={styles.editIcon}></Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.finishButton, 
                // Se pone gris si NO hay ejercicios, O si faltan checks por marcar
                (activeRoutine.exercises.length === 0 || completedExercises.size !== activeRoutine.exercises.length) 
                  && { backgroundColor: '#9CA3AF' }
              ]} 
              onPress={handleFinishRoutine}
            >
              <Text style={styles.finishButtonText}>🏁 Finalizar Entrenamiento</Text>
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

  exerciseCardWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row', elevation: 2 },
  exerciseCardCompleted: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  
  checkboxContainer: { padding: 16, justifyContent: 'center', alignItems: 'center' },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkmark: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginTop: -2 },
  
  exerciseName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  textCompleted: { textDecorationLine: 'line-through', color: '#6B7280' },
  exerciseInfoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginRight: 10 },
  exerciseDetails: { fontSize: 15, color: '#4B5563' },
  bold: { fontWeight: 'bold', color: '#111827' },
  editIcon: { fontSize: 16, color: '#9CA3AF' },
  
  addExerciseBtn: { backgroundColor: '#E0E7FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed' },
  addExerciseBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10 },
  finishButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  finishButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', elevation: 20 },
  modalHeader: { marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  formContainer: { marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
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
});