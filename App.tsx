import 'react-native-get-random-values';
import Realm from "realm";
Realm.flags.THROW_ON_GLOBAL_REALM = true;
import React from 'react';
import { RealmProvider } from '@realm/react';
import { Routine } from './src/models/Routine';
import { Exercise } from './src/models/Exercise';
import { HomeScreen } from './src/screens/HomeScreen';


export default function App() {
  return (
    <RealmProvider 
      schema={[Routine, Exercise]} 
      deleteRealmIfMigrationNeeded={true}
    >
      <HomeScreen />
    </RealmProvider>
  );
}