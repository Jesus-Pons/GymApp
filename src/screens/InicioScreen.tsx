import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles,iconColor } from '../styles/InicioScreen.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@realm/react';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';

import { HistoryRoutine } from '../models/HistoryRoutine';

export const InicioScreen = () => {
  const allHistory = useQuery(HistoryRoutine);

  

  const DumbbellIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M14.4 14.4 9.6 9.6" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m21.5 21.5-1.4-1.4" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.9 3.9 2.5 2.5" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );

  const CalendarIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 2v4" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={iconColor} strokeWidth={2} />
      <Path d="M3 10h18" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );

  const ClockIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={iconColor} strokeWidth={2} />
      <Polyline points="12 6 12 12 16 14" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );

  const stats = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let weekWorkouts = 0;
    let weekMinutes = 0;
    let weekWeight = 0;

    let totalWorkouts = allHistory.length;
    let totalMinutes = 0;
    let totalWeight = 0;

    allHistory.forEach(routine => {
      let routineWeight = 0;
      
      routine.exercises.forEach(ex => {
        ex.series.forEach(serie => {
          if (serie.completed) {
            routineWeight += (serie.reps * serie.weight);
          }
        });
      });

      totalMinutes += routine.durationMinutes;
      totalWeight += routineWeight;

      if (routine.completedAt >= startOfWeek) {
        weekWorkouts += 1;
        weekMinutes += routine.durationMinutes;
        weekWeight += routineWeight;
      }
    });

    return {
      week: { workouts: weekWorkouts, minutes: weekMinutes, weight: weekWeight },
      total: { workouts: totalWorkouts, minutes: totalMinutes, weight: totalWeight }
    };
  }, [allHistory]);

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatWeight = (kg: number) => {
    return `${Math.round(kg).toLocaleString('es-ES')} kg`;
  };

  const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <View style={styles.statCard}>
      <View style={styles.iconPill}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const weeklyStats = [
    { icon: <DumbbellIcon />, title: 'SESIONES', value: stats.week.workouts },
    { icon: <CalendarIcon />, title: 'VOLUMEN', value: formatWeight(stats.week.weight) },
    { icon: <ClockIcon />, title: 'TIEMPO', value: formatTime(stats.week.minutes) },
  ];

  const totalStats = [
    { icon: <DumbbellIcon />, title: 'SESIONES', value: stats.total.workouts },
    { icon: <CalendarIcon />, title: 'VOLUMEN', value: formatWeight(stats.total.weight) },
    { icon: <ClockIcon />, title: 'TIEMPO', value: formatTime(stats.total.minutes) },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>¡Bienvenido!</Text>
          <Text style={styles.subtitle}>Aquí tienes el resumen de tu progreso.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esta semana</Text>
          <View style={styles.statsRow}>
            {weeklyStats.map((item) => (
              <StatCard key={item.title} icon={item.icon} title={item.title} value={item.value} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico Total</Text>
          <View style={styles.statsRow}>
            {totalStats.map((item) => (
              <StatCard key={item.title} icon={item.icon} title={item.title} value={item.value} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};