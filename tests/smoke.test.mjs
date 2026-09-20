import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storeSrc = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
const utilSrc = readFileSync(new URL('../js/util.js', import.meta.url), 'utf8');

const storeModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    `const storage = new Map();
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
${storeSrc}`,
    'utf8'
  ).toString('base64')}`
);

const utilModule = await import(
  `data:text/javascript;base64,${Buffer.from(utilSrc, 'utf8').toString('base64')}`
);

const { getPlan, savePlan, getWorkouts, upsertWorkout, deleteWorkout, emptyPlan } = storeModule;
const { volumeOf, formatDate, esc } = utilModule;

test('Plan speichern und laden', () => {
  const plan = { days: [{ id: 'd1', name: 'Tag A', exercises: [] }] };
  savePlan(plan);
  assert.equal(getPlan().days[0].name, 'Tag A');
});

test('Ungültiger Plan fällt auf leeren Plan zurück', () => {
  savePlan({ days: 'kein-array' });
  assert.deepEqual(getPlan(), emptyPlan());
});

test('Workout anlegen, aktualisieren, löschen', () => {
  const workout = {
    id: 'w1',
    date: '2025-01-10',
    dayName: 'Tag A',
    entries: [{ exerciseName: 'Bankdrücken', sets: [{ weight: 40, reps: 10 }] }]
  };
  upsertWorkout(workout);
  assert.equal(getWorkouts().length, 1);
  workout.dayName = 'Tag B';
  upsertWorkout(workout);
  assert.equal(getWorkouts().length, 1);
  assert.equal(getWorkouts()[0].dayName, 'Tag B');
  deleteWorkout('w1');
  assert.equal(getWorkouts().length, 0);
});

test('Volumen wird korrekt berechnet', () => {
  const workout = {
    entries: [
      { sets: [{ weight: 40, reps: 10 }, { weight: 42.5, reps: 8 }] },
      { sets: [{ weight: 0, reps: 5 }] }
    ]
  };
  assert.equal(volumeOf(workout), 400 + 340);
});

test('Datum wird deutsch formatiert', () => {
  assert.match(formatDate('2025-01-10'), /10\.01\.2025/);
});

test('HTML wird maskiert', () => {
  assert.equal(esc('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
