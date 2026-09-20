import { getPlan, getWorkouts, upsertWorkout, deleteWorkout } from './store.js';
import { esc, uid, todayISO, formatDate, volumeOf, numberFormat, toast } from './util.js';

function newWorkoutFromDay(day) {
  return {
    id: uid(),
    date: todayISO(),
    dayId: day.id,
    dayName: day.name,
    note: '',
    entries: day.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      targetWeight: ex.targetWeight,
      sets: Array.from({ length: ex.targetSets }, () => ({ weight: ex.targetWeight ?? '', reps: ex.targetReps ?? '' }))
    }))
  };
}

function renderSetRows(entry) {
  return entry.sets.map((set, i) => `
    <tr class="set-row" data-entry="${entry.exerciseId}" data-index="${i}">
      <td class="set-label">${i + 1}</td>
      <td><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="kg" value="${esc(set.weight)}" data-field="weight" aria-label="Gewicht Satz ${i + 1}"></td>
      <td><input type="number" inputmode="numeric" min="0" placeholder="Wdh." value="${esc(set.reps)}" data-field="reps" aria-label="Wiederholungen Satz ${i + 1}"></td>
      <td><button class="btn small danger icon-btn" data-action="remove-set" aria-label="Satz löschen">✕</button></td>
    </tr>`).join('');
}

function bindWorkoutEvents(container, workout, refresh) {
  container.addEventListener('input', (event) => {
    const row = event.target.closest('.set-row');
    if (!row) return;
    const entry = workout.entries.find((e) => e.exerciseId === row.dataset.entry);
    if (!entry) return;
    entry.sets[Number(row.dataset.index)][event.target.dataset.field] = event.target.value;
  });

  container.addEventListener('change', (event) => {
    if (event.target.matches('[data-workout-field]')) {
      workout[event.target.dataset.workoutField] = event.target.value;
    }
  });

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'add-set') {
      const entry = workout.entries.find((e) => e.exerciseId === btn.dataset.entry);
      const last = entry.sets[entry.sets.length - 1];
      entry.sets.push({ weight: last?.weight ?? '', reps: last?.reps ?? '' });
      refresh();
    }

    if (action === 'remove-set') {
      const row = btn.closest('.set-row');
      const entry = workout.entries.find((e) => e.exerciseId === row.dataset.entry);
      if (entry.sets.length > 1) {
        entry.sets.splice(Number(row.dataset.index), 1);
        refresh();
      }
    }

    if (action === 'save-workout') {
      upsertWorkout(workout);
      toast('Training gespeichert');
      window.location.hash = '#/overview';
    }

    if (action === 'delete-workout') {
      if (confirm('Dieses Training wirklich löschen?')) {
        deleteWorkout(workout.id);
        toast('Training gelöscht');
        window.location.hash = '#/overview';
      }
    }
  });
}

function renderWorkoutForm(container, workout, refresh) {
  const html = `
    <section class="card workout-header">
      <label class="field">
        <span>Datum</span>
        <input type="date" value="${esc(workout.date)}" data-workout-field="date">
      </label>
      <label class="field">
        <span>Notiz (optional)</span>
        <input type="text" placeholder="z. B. Wie fühlte sich das Training an?" value="${esc(workout.note)}" data-workout-field="note">
      </label>
    </section>`;

  const body = document.createElement('div');
  body.innerHTML = html;

  workout.entries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'card workout-entry';
    const targetInfo = [
      entry.targetReps ? `Ziel: ${esc(entry.targetReps)} Wdh.` : '',
      entry.targetWeight ? `${esc(entry.targetWeight)} kg` : ''
    ].filter(Boolean).join(' · ');
    card.innerHTML = `
      <header class="entry-header">
        <h3>${esc(entry.exerciseName)}</h3>
        ${targetInfo ? `<span class="muted">${targetInfo}</span>` : ''}
      </header>
      <table class="sets-table">
        <thead><tr><th scope="col">Satz</th><th scope="col">Gewicht (kg)</th><th scope="col">Wiederholungen</th><th scope="col"></th></tr></thead>
        <tbody>${renderSetRows(entry)}</tbody>
      </table>
      <button class="btn secondary small add-set" data-action="add-set" data-entry="${entry.exerciseId}">+ Satz</button>`;
    body.appendChild(card);
  });

  const actions = document.createElement('section');
  actions.className = 'row-actions sticky-actions';
  actions.innerHTML = `
    <button class="btn danger" data-action="delete-workout">Löschen</button>
    <button class="btn primary" data-action="save-workout">Training speichern</button>`;
  body.appendChild(actions);

  container.appendChild(body);
  bindWorkoutEvents(container, workout, refresh);
}

export function renderNewWorkout(container, dayId, refresh) {
  const plan = getPlan();
  const day = plan.days.find((d) => d.id === dayId);
  if (!day) {
    container.innerHTML = '<section class="card"><p>Trainingstag nicht gefunden.</p></section>';
    return;
  }
  const workout = newWorkoutFromDay(day);
  const intro = document.createElement('section');
  intro.className = 'card new-workout-intro';
  intro.innerHTML = `<h2>Training: ${esc(day.name)}</h2><p class="muted">${day.exercises.length} Übung(en) laut Plan – trage Gewicht und Wiederholungen pro Satz ein.</p>`;
  container.appendChild(intro);
  renderWorkoutForm(container, workout, refresh);
}

export function renderEditWorkout(container, workoutId, refresh) {
  const workout = getWorkouts().find((w) => w.id === workoutId);
  if (!workout) {
    container.innerHTML = '<section class="card"><p>Training nicht gefunden.</p></section>';
    return;
  }
  const intro = document.createElement('section');
  intro.className = 'card new-workout-intro';
  intro.innerHTML = `<h2>Training bearbeiten</h2><p class="muted">${esc(formatDate(workout.date))} · ${esc(workout.dayName)} · Volumen: ${esc(numberFormat(volumeOf(workout)))} kg</p>`;
  container.appendChild(intro);
  renderWorkoutForm(container, workout, refresh);
}
