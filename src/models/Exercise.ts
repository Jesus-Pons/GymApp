import Realm, { ObjectSchema } from 'realm';
import { Serie } from './Serie';

export class Exercise extends Realm.Object<Exercise> {
  _id!: Realm.BSON.UUID;
  name!: string;
  series!: Realm.List<Serie>;
  descanso!: number;

  get isCompleted(): boolean {
    if (!this.series || this.series.length === 0) return false;
    return this.series.every(serie => serie.completed);
  }

  static schema: ObjectSchema = {
    name: 'Exercise',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      series: 'Serie[]',
      descanso: 'int',

    },
  };
}