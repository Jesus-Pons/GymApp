import Realm, { ObjectSchema } from 'realm';
import { Exercise } from './Exercise';

export class HistoryRoutine extends Realm.Object<HistoryRoutine> {
  _id!: Realm.BSON.UUID;
  originalRoutineId?: string;
  name!: string;
  exercises!: Realm.List<Exercise>;
  createdAt!: Date;
  completedAt!: Date;
  durationMinutes!: number;

  static schema: ObjectSchema = {
    name: 'HistoryRoutine',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      originalRoutineId: 'string?',
      name: 'string',
      exercises: 'Exercise[]',
      createdAt: 'date',
      completedAt: 'date',
      durationMinutes: 'int',
    },
  };
}