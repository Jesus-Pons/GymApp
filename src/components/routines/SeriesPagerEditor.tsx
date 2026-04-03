import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { NumberStepper } from './NumberStepper';
import { SeriesFormItem } from '../../utils/routines/seriesForm';

type SeriesPagerEditorProps = {
  series: SeriesFormItem[];
  activeSeriesIndex: number;
  seriesCountKey: string;
  onActiveSeriesIndexChange: (index: number) => void;
  onRepsChange: (index: number, value: string) => void;
  onWeightChange: (index: number, value: string) => void;
  onRepsDecrement: (index: number) => void;
  onRepsIncrement: (index: number) => void;
  onWeightDecrement: (index: number) => void;
  onWeightIncrement: (index: number) => void;
};

export const SeriesPagerEditor = ({
  series,
  activeSeriesIndex,
  seriesCountKey,
  onActiveSeriesIndexChange,
  onRepsChange,
  onWeightChange,
  onRepsDecrement,
  onRepsIncrement,
  onWeightDecrement,
  onWeightIncrement,
}: SeriesPagerEditorProps) => {
  const [pagerWidth, setPagerWidth] = useState(0);

  if (series.length === 0) {
    return <View style={styles.seriesEmptySpace} />;
  }

  return (
    <View
      style={styles.seriesPagerContainer}
      onLayout={(event) => {
        const width = Math.floor(event.nativeEvent.layout.width);
        if (width > 0 && width !== pagerWidth) {
          setPagerWidth(width);
        }
      }}
    >
      <View style={styles.seriesPagerHeader}>
        <Text style={styles.seriesPagerCount}>Serie {activeSeriesIndex + 1} de {series.length}</Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const width = event.nativeEvent.layoutMeasurement.width;
          if (width <= 0) {
            return;
          }
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          const maxIndex = Math.max(series.length - 1, 0);
          onActiveSeriesIndexChange(Math.min(Math.max(nextIndex, 0), maxIndex));
        }}
      >
        {series.map((serie, index) => (
          <View
            key={`${index}-${seriesCountKey}`}
            style={[
              styles.seriesEditorCard,
              styles.seriesSlide,
              pagerWidth > 0 ? { width: pagerWidth } : null,
            ]}
          >
            <Text style={styles.seriesEditorTitle}>Serie {index + 1}</Text>
            <View style={styles.rowInputs}>
              <View style={styles.leftColumn}>
                <NumberStepper
                  label="Reps"
                  valueText={serie.reps}
                  onChangeText={(value) => onRepsChange(index, value)}
                  onDecrement={() => onRepsDecrement(index)}
                  onIncrement={() => onRepsIncrement(index)}
                />
              </View>
              <View style={styles.rightColumn}>
                <NumberStepper
                  label="Peso (kg)"
                  valueText={serie.weight}
                  onChangeText={(value) => onWeightChange(index, value)}
                  onDecrement={() => onWeightDecrement(index)}
                  onIncrement={() => onWeightIncrement(index)}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {series.length > 1 && (
        <View style={styles.seriesDotsRow}>
          {series.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.seriesDot,
                index === activeSeriesIndex && styles.seriesDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  leftColumn: { flex: 1, marginRight: 5 },
  rightColumn: { flex: 1, marginLeft: 5 },
  seriesEmptySpace: { height: 0 },
  seriesPagerContainer: { marginBottom: 8 },
  seriesPagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seriesPagerCount: { fontSize: 12, color: '#374151', fontWeight: '700' },
  seriesEditorCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  seriesSlide: { marginBottom: 0 },
  seriesEditorTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  seriesDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    gap: 6,
  },
  seriesDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  seriesDotActive: { width: 18, backgroundColor: '#3B82F6' },
});
