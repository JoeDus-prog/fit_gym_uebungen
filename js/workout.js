import { getPlan, getWorkouts, upsertWorkout, deleteWorkout } from './store.js';
import { esc, uid, todayISO, formatDate, volumeOf, numberFormat, targetSecondsOf } from './util.js';

function newWorkoutFromDay(day) {
  return {
    id: uid(),
    date: todayISO(),
    dayId: day.id,
    dayName: day.name,
    note: '',
    entries: day.exercises.map((ex) => {
      const goalMode = ex.goalMode === 'time' ? 'time' : 'weight';
      const makeSet = () => (goalMode === 'time'
        ? { weight: ex.targetWeight ?? '', seconds: targetSecondsOf(ex) || '' }
        : { weight: ex.targetWeight ?? '', reps: ex.targetReps ?? '' });
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        goalMode,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps ?? null,
        targetWeight: ex.targetWeight ?? null,
        targetSeconds: ex.targetSeconds ?? null,
        sets: Array.from({ length: ex.targetSets }, makeSet)
      };
    })
  };
}

function renderSetRows(entry) {
  const timed = entry.goalMode === 'time';
  return entry.sets.map((set, i) => {
    const valueCells = timed
      ? `<td><input type="number" inputmode="numeric" min="0" placeholder="Sek." value="${esc(set.seconds)}" data-field="seconds" aria-label="Dauer in Sekunden Satz ${i + 1}"></td>
        <td><input type="number" inputmode="numeric" min="0" placeholder="Wdh." value="${esc(set.reps)}" data-field="reps" aria-label="Wiederholungen Satz ${i + 1}"></td>`
      : `<td><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="kg" value="${esc(set.weight)}" data-field="weight" aria-label="Gewicht Satz ${i + 1}"></td>
        <td><input type="number" inputmode="numeric" min="0" placeholder="Wdh." value="${esc(set.reps)}" data-field="reps" aria-label="Wiederholungen Satz ${i + 1}"></td>`;
    return `
      <tr class="set-row" data-entry="${entry.exerciseId}" data-index="${i}">
        <td class="set-label">${i + 1}</td>
        ${valueCells}
        <td><button class="btn small danger icon-btn" data-action="remove-set" aria-label="Satz l\u00f6schen">\u2715</button></td>
      </tr>`;
  }).join('');
}

function bindWorkoutEvents(root, workout, refresh) {
  root.addEventListener('input', (event) => {
    const row = event.target.closest('.set-row');
    if (!row) return;
    const entry = workout.entries.find((e) => e.exerciseId === row.dataset.entry);
    if (!entry) return;
    const set = entry.sets[Number(row.dataset.index)];
    const field = event.target.dataset.field;
    if (field === 'weight' || field === 'reps' || field === 'seconds') {
      set[field] = event.target.value;
    } else if (field === 'seconds') {
      set.seconds = event.target.value;
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-workout-field]')) {
      workout[event.target.dataset.workoutField] = event.target.value;
    }
  });

  root.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'add-set') {
      const entry = workout.entries.find((e) => e.exerciseId === btn.dataset.entry);
      if (!entry) return;
      const last = entry.sets[entry.sets.length - 1];
      entry.sets.push(entry.goalMode === 'time'
        ? { weight: last?.weight ?? '', seconds: last?.seconds ?? '' }
        : { weight: last?.weight ?? '', reps: last?.reps ?? '' });
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
      if (confirm('Dieses Training wirklich l\u00f6schen?')) {
        deleteWorkout(workout.id);
        toast('Training gel\u00f6scht');
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
        <input type="text" placeholder="z. B. Wie f\u00fchlte sich das Training an?" value="${esc(workout.note)}" data-workout-field="note">
      </label>
    </section>`;

  const body = document.createElement('div');
  body.innerHTML = html;

  workout.entries.forEach((entry) => {
    const timed = entry.goalMode === 'time';
    const card = document.createElement('article');
    card.className = 'card workout-entry';
    const targetInfo = timed
      ? [
        targetSecondsOf(entry) > 0 ? `Ziel: ${esc(targetSecondsOf(entry))} Sek.` : '',
        entry.targetWeight ? `${esc(entry.targetWeight)} kg` : ''
      ].filter(Boolean).join(' · ')
      : [
        entry.targetReps ? `Ziel: ${esc(entry.targetReps)} Wdh.` : '',
        entry.targetWeight ? `${esc(entry.targetWeight)} kg` : ''
      ].filter(Boolean).join(' \u00b7 ');
    card.innerHTML = `
      <header class="entry-header">
        <h3>${esc(entry.exerciseName)}</h3>
        ${targetInfo ? `<span class="muted">${targetInfo}</span>` : ''}
      </header>
      <table class="sets-table">
        <thead><tr><th scope="col">Satz</th><th scope="col">${timed ? 'Dauer (Sekunden)' : 'Gewicht (kg)'}</th><th scope="col">Wiederholungen</th><th scope="col"></th></tr></thead>
        <tbody>${renderSetRows(entry)}</tbody>
      </table>
      <button class="btn secondary small add-set-btn" data-action="add-set" data-entry="${entry.exerciseId}">+ Satz</button>`;
    body.appendChild(card);
  });

  const actions = document.createElement('section');
  actions.className = 'row-actions sticky-actions';
  actions.innerHTML = `
    <button class="btn danger" data-action="delete-workout">L\u00f6schen</button>
    <button class="btn primary" data-action="save-workout">Training speichern</button>`;
  body.appendChild(actions);

  container.appendChild(body);
  bindWorkoutEvents(body, workout, refresh);
}

function renderWorkoutScreen(container, workout, introHtml) {
  const intro = document.createElement('section');
  intro.className = 'card new-workout-intro';
  intro.innerHTML = introHtml;
  container.appendChild(intro);

  const formHost = document.createElement('div');
  container.appendChild(formHost);

  const refresh = () => {
    formHost.innerHTML = '';
    renderWorkoutForm(formHost, workout, refresh);
  };
  refresh();
}

export function renderNewWorkout(container, dayId) {
  const plan = getPlan();
  const day = plan.days.find((d) => d.id === dayId);
  if (!day) {
    container.innerHTML = '<section class="card"><p>Trainingstag nicht gefunden.</p></section>';
    return;
  }
  const existing = getWorkouts().find((w) => w.dayId === day.id && w.date === todayISO());
  const workout = existing || newWorkoutFromDay(day);
  renderWorkoutScreen(container, workout, `<h2>Training: ${esc(day.name)}</h2><p class="muted">${day.exercises.length} Übung(en) laut Plan – trage Gewicht und Wiederholungen bzw. Dauer in Sekunden pro Satz ein.</p>`);
}

export function renderEditWorkout(container, workoutId) {
  const workout = getWorkouts().find((w) => w.id === workoutId);
  if (!workout) {
    container.innerHTML = '<section class="card"><p>Training nicht gefunden.</p></section>';
    return;
  }
  renderWorkoutScreen(container, workout, `<h2>Training bearbeiten</h2><p class="muted">${esc(formatDate(workout.date))} \u00b7 ${esc(workout.dayName)} \u00b7 Volumen: ${esc(numberFormat(volumeOf(workout)))} kg</p>`);
}
