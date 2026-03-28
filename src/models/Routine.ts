import Realm, { ObjectSchema } from 'realm';
import { Exercise } from './Exercise';

export class Routine extends Realm.Object<Routine> {
  _id!: Realm.BSON.UUID;
  name!: string;
  exercises!: Realm.List<Exercise>;
  createdAt!: Date;

  static schema: ObjectSchema = {
    name: 'Routine',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      exercises: 'Exercise[]',
      createdAt: 'date',
    },
  };
}