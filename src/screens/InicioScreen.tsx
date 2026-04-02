import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@realm/react';

import { HistoryRoutine } from '../models/HistoryRoutine';

export const InicioScreen = () => {
  const allHistory = useQuery(HistoryRoutine);

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

  const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: string }) => (
    <View style={styles.statCard}>
      <View style={styles.iconPill}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const weeklyStats = [
    { icon: '🏋️', title: 'SESIONES', value: stats.week.workouts },
    { icon: '⚖️', title: 'VOLUMEN', value: formatWeight(stats.week.weight) },
    { icon: '⏱️', title: 'TIEMPO', value: formatTime(stats.week.minutes) },
  ];

  const totalStats = [
    { icon: '🏋️', title: 'SESIONES', value: stats.total.workouts },
    { icon: '⚖️', title: 'VOLUMEN', value: formatWeight(stats.total.weight) },
    { icon: '⏱️', title: 'TIEMPO', value: formatTime(stats.total.minutes) },
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
  icon: { fontSize: 13 },
  statValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  statTitle: { fontSize: 11, letterSpacing: 0.9, color: '#6C757D', fontWeight: '700', marginTop: 3, textAlign: 'center' },
});