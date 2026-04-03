import Realm from 'realm';

import { Exercise } from '../../models/Exercise';
import { Serie } from '../../models/Serie';

export type SeriesFormItem = {
  reps: string;
  weight: string;
};

export const MAX_SERIES = 10;
export const MIN_SERIES = 1;
export const REST_STEP = 15;

const DEFAULT_SERIE: SeriesFormItem = {
  reps: '1',
  weight: '1',
};

export const sanitizeIntText = (value: string) => value.replace(/[^0-9]/g, '');

export const sanitizeWeightText = (value: string) => {
  const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  const firstDot = sanitized.indexOf('.');

  if (firstDot === -1) {
    return sanitized;
  }

  return sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '');
};

export const normalizeSeriesFormCount = (
  currentSeries: SeriesFormItem[],
  countText: string,
  minSeries = MIN_SERIES,
  maxSeries = MAX_SERIES
): { countText: string; series: SeriesFormItem[] } | null => {
  const parsedCount = parseInt(countText, 10);

  if (isNaN(parsedCount) || parsedCount < minSeries) {
    return null;
  }

  const cappedCount = Math.max(minSeries, Math.min(maxSeries, parsedCount));
  const lastSeries = currentSeries[currentSeries.length - 1] ?? DEFAULT_SERIE;

  const nextSeries = Array.from({ length: cappedCount }, (_, index) => currentSeries[index] ?? lastSeries).map((serie) => ({
    reps: serie.reps,
    weight: serie.weight,
  }));

  return {
    countText: String(cappedCount),
    series: nextSeries,
  };
};

export const buildSeriesList = (seriesData: SeriesFormItem[], completed = false) => {
  return seriesData.map((serie) => ({
    _id: new Realm.BSON.UUID(),
    reps: parseInt(serie.reps, 10) || 0,
    weight: parseFloat(serie.weight.replace(',', '.')) || 0,
    completed,
  }));
};

export const syncExerciseSeries = (
  realm: Realm,
  exercise: Exercise,
  seriesData: SeriesFormItem[]
) => {
  while (exercise.series.length > seriesData.length) {
    const lastSeries = exercise.series[exercise.series.length - 1];
    realm.delete(lastSeries);
  }

  while (exercise.series.length < seriesData.length) {
    const seriesIndex = exercise.series.length;
    const seriesForm = seriesData[seriesIndex] ?? seriesData[seriesData.length - 1];

    exercise.series.push(
      realm.create(Serie, {
        _id: new Realm.BSON.UUID(),
        reps: parseInt(seriesForm.reps, 10) || 0,
        weight: parseFloat(seriesForm.weight.replace(',', '.')) || 0,
        completed: false,
      })
    );
  }

  exercise.series.forEach((serie, index) => {
    const seriesForm = seriesData[index] ?? seriesData[seriesData.length - 1];
    serie.reps = parseInt(seriesForm.reps, 10) || 0;
    serie.weight = parseFloat(seriesForm.weight.replace(',', '.')) || 0;
  });
};
