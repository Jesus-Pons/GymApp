import 'react-native-gesture-handler'; 
import 'react-native-get-random-values';
import React from 'react';
import Realm from "realm";
import { RealmProvider } from '@realm/react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

import { Routine } from './src/models/Routine';
import { Exercise } from './src/models/Exercise';
import { HistoryRoutine } from './src/models/HistoryRoutine';
import { Serie } from './src/models/Serie';

import { RutinasScreen } from './src/screens/RutinasScreen';
import { HacerRutinaScreen } from './src/screens/HacerRutinaScreen';
import { HistorialScreen } from './src/screens/HistorialScreen';
import { InicioScreen } from './src/screens/InicioScreen'; 

Realm.flags.THROW_ON_GLOBAL_REALM = true;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9.5 12 3l9 6.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 10.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DumbbellIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M14.4 14.4 9.6 9.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m21.5 21.5-1.4-1.4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.9 3.9 2.5 2.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

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
      schema={[Routine, Exercise, Serie, HistoryRoutine]} 
      deleteRealmIfMigrationNeeded={true}
    >
      <NavigationContainer>
        <Tab.Navigator 
          initialRouteName="Inicio"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
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
              tabBarIcon: ({ color }) => <HomeIcon color={color} />
            }}
          />
          <Tab.Screen 
            name="RutinasTab" 
            component={RutinasStack} 
            options={{ 
              title: 'Rutinas',
              tabBarIcon: ({ color }) => <DumbbellIcon color={color} />
            }}
          />
          <Tab.Screen 
            name="Historial" 
            component={HistorialScreen} 
            options={{ 
              title: 'Historial',
              tabBarIcon: ({ color }) => <ClockIcon color={color} />
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </RealmProvider>
  );
}