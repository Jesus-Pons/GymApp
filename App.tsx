import 'react-native-gesture-handler'; 
import 'react-native-get-random-values';
import React from 'react';
import { Text } from 'react-native';
import Realm from "realm";
import { RealmProvider } from '@realm/react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Modelos
import { Routine } from './src/models/Routine';
import { Exercise } from './src/models/Exercise';
import { HistoryRoutine } from './src/models/HistoryRoutine';

// Pantallas
import { RutinasScreen } from './src/screens/RutinasScreen';
import { HacerRutinaScreen } from './src/screens/HacerRutinaScreen';
import { HistorialScreen } from './src/screens/HistorialScreen';
import { InicioScreen } from './src/screens/InicioScreen'; 

Realm.flags.THROW_ON_GLOBAL_REALM = true;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Creamos un Stack para Rutinas. Así podemos ir de Rutinas -> Hacer Rutina sin perder el contexto.
function RutinasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RutinasList" component={RutinasScreen} />
      <Stack.Screen name="HacerRutina" component={HacerRutinaScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <RealmProvider 
      schema={[Routine, Exercise, HistoryRoutine]} 
      deleteRealmIfMigrationNeeded={true}
    >
      <NavigationContainer>
        <Tab.Navigator 
          initialRouteName="Inicio"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF', // Azul activo
            tabBarInactiveTintColor: '#8E8E93', // Gris inactivo
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E5EA',
              paddingBottom: 8,
              paddingTop: 8,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            }
          }}
        >
          <Tab.Screen 
            name="Inicio" 
            component={InicioScreen} 
            options={{ 
              title: 'Inicio',
              tabBarIcon: ({ color }) => <Text style={{fontSize: 22, color}}>🏠</Text> // Emoji temporal
            }}
          />
          <Tab.Screen 
            name="RutinasTab" 
            component={RutinasStack} 
            options={{ 
              title: 'Rutinas',
              tabBarIcon: ({ color }) => <Text style={{fontSize: 22, color}}>📋</Text>
            }}
          />
          <Tab.Screen 
            name="Historial" 
            component={HistorialScreen} 
            options={{ 
              title: 'Historial',
              tabBarIcon: ({ color }) => <Text style={{fontSize: 22, color}}>⏱️</Text>
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </RealmProvider>
  );
}