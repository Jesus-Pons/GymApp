import Realm from 'realm';

import { Exercise } from '../../models/Exercise';
import { Routine, RoutineStatus } from '../../models/Routine';

export const clearDraftRoutines = (realm: Realm) => {
  const allDrafts = realm.objects(Routine).filtered('status == $0', RoutineStatus.DRAFT);

  allDrafts.forEach((draft) => {
    draft.exercises.forEach((exercise) => {
      realm.delete(exercise.series);
    });
    realm.delete(draft.exercises);
  });

  realm.delete(allDrafts);
};

export const cloneExerciseData = (exercise: Exercise, preserveCompletedState = true) => ({
  _id: new Realm.BSON.UUID(),
  name: exercise.name,
  descanso: exercise.descanso,
  series: exercise.series.map((serie) => ({
    _id: new Realm.BSON.UUID(),
    reps: serie.reps,
    weight: serie.weight,
    completed: preserveCompletedState ? serie.completed : false,
  })),
});

export const createDraftFromTemplate = (
  realm: Realm,
  template: Routine,
  clearExistingDrafts = false
): Routine => {
  if (clearExistingDrafts) {
    clearDraftRoutines(realm);
  }

  const draft = realm.create(Routine, {
    _id: new Realm.BSON.UUID(),
    name: template.name,
    status: RoutineStatus.DRAFT,
    createdAt: new Date(),
    exercises: [],
  });

  template.exercises.forEach((exercise) => {
    const copiedExercise = realm.create(Exercise, cloneExerciseData(exercise, false));
    draft.exercises.push(copiedExercise);
  });

  return draft;
};
