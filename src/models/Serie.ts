import Realm, { ObjectSchema } from 'realm';

export class Serie extends Realm.Object<Serie> {
  _id!: Realm.BSON.UUID;
  reps!: number;
  weight!: number;
  completed!: boolean;

  static schema: ObjectSchema = {
    name: 'Serie',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      reps: 'int',
      weight: 'float',
      completed: 'bool',
    },
  };
}