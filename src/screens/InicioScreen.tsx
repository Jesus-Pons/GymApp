import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@realm/react';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';

import { HistoryRoutine } from '../models/HistoryRoutine';

export const InicioScreen = () => {
  const allHistory = useQuery(HistoryRoutine);

  const iconColor = '#6C757D';

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

        {/* SECCIÓN: SEMANA ACTUAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esta semana</Text>
          <View style={styles.statsRow}>
            {weeklyStats.map((item) => (
              <StatCard key={item.title} icon={item.icon} title={item.title} value={item.value} />
            ))}
          </View>
        </View>

        {/* SECCIÓN: HISTÓRICO TOTAL */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#6C757D' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#F3F5F7',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  statValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  statTitle: { fontSize: 11, letterSpacing: 0.9, color: '#6C757D', fontWeight: '700', marginTop: 3, textAlign: 'center' },
});