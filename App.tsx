import 'react-native-gesture-handler'; 
import 'react-native-get-random-values';
import React from 'react';
import Realm from "realm";
import { RealmProvider } from '@realm/react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { Routine } from './src/models/Routine';
import { Exercise } from './src/models/Exercise';
import { HistoryRoutine } from './src/models/HistoryRoutine';

import { RutinasScreen } from './src/screens/RutinasScreen';
import { HacerRutinaScreen } from './src/screens/HacerRutinaScreen';
import { HistorialScreen } from './src/screens/HistorialScreen';

Realm.flags.THROW_ON_GLOBAL_REALM = true;

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <RealmProvider 
      schema={[Routine, Exercise, HistoryRoutine]} 
      deleteRealmIfMigrationNeeded={true}
    >
      <NavigationContainer>
        <Drawer.Navigator initialRouteName="Plantillas">
          
          <Drawer.Screen 
            name="Plantillas" 
            component={RutinasScreen} 
            options={{ title: 'Plantillas de Rutinas' }}
          />
          
          <Drawer.Screen 
            name="HacerRutina" 
            component={HacerRutinaScreen} 
            options={{ title: 'Hacer una Rutina' }}
          />
          
          <Drawer.Screen 
            name="Historial" 
            component={HistorialScreen} 
            options={{ title: 'Histórico de Rutinas' }}
          />
          
        </Drawer.Navigator>
      </NavigationContainer>
    </RealmProvider>
  );
}