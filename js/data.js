import { getPlan, getWorkouts, savePlan, saveWorkouts } from './store.js';
import { todayISO } from './util.js';

const EXPORT_VERSION = 1;

export function buildExport() {
  return {
    app: 'gym-trainingsplan',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan: getPlan(),
    workouts: getWorkouts()
  };
}

export function exportData() {
  const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gym-trainingsplan-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ungültige Sicherungsdatei');
  }
  if (
    !data ||
    typeof data !== 'object' ||
    data.app !== 'gym-trainingsplan' ||
    !data.plan ||
    !Array.isArray(data.plan.days) ||
    !Array.isArray(data.workouts)
  ) {
    throw new Error('Ungültige Sicherungsdatei');
  }
  return data;
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseImport(reader.result);
        savePlan(data.plan);
        saveWorkouts(data.workouts);
        resolve({ days: data.plan.days.length, workouts: data.workouts.length });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file);
  });
}
