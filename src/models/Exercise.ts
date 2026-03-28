import Realm, { ObjectSchema } from 'realm';

export class Exercise extends Realm.Object<Exercise> {
  _id!: Realm.BSON.UUID;
  name!: string;
  series!: number;
  reps!: number;
  weight!: number;

  static schema: ObjectSchema = {
    name: 'Exercise',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      series: 'int',
      reps: 'int',
      weight: 'float',
    },
  };
}