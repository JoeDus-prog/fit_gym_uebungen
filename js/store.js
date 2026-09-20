const PLAN_KEY = 'gym.plan.v1';
const WORKOUTS_KEY = 'gym.workouts.v1';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function emptyPlan() {
  return { days: [] };
}

export function getPlan() {
  const plan = readJSON(PLAN_KEY, null);
  if (!plan || !Array.isArray(plan.days)) return emptyPlan();
  return plan;
}

export function savePlan(plan) {
  writeJSON(PLAN_KEY, plan);
}

export function getWorkouts() {
  const workouts = readJSON(WORKOUTS_KEY, []);
  return Array.isArray(workouts) ? workouts : [];
}

export function upsertWorkout(workout) {
  const workouts = getWorkouts();
  const index = workouts.findIndex((w) => w.id === workout.id);
  if (index >= 0) workouts[index] = workout;
  else workouts.push(workout);
  writeJSON(WORKOUTS_KEY, workouts);
}

export function deleteWorkout(id) {
  writeJSON(WORKOUTS_KEY, getWorkouts().filter((w) => w.id !== id));
}
