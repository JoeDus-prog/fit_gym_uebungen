import { getPlan, getWorkouts, upsertWorkout, deleteWorkout } from './store.js';
import { esc, uid, todayISO, formatDate, volumeOf, numberFormat, formatTime, targetSecondsOf } from './util.js';

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
        targetMinutes: ex.targetMinutes ?? null,
        targetSeconds: ex.targetSeconds ?? null,
        sets: Array.from({ length: ex.targetSets }, makeSet)
      };
    })
  };
}

function renderSetRows(entry) {
  const timed = entry.goalMode === 'time';
  return entry.sets.map((set, i) => {
    const seconds = Number(set.seconds) || 0;
    const valueCell = timed
      ? `<td class="time-cell"><input type="number" inputmode="numeric" min="0" placeholder="min" value="${esc(Math.floor(seconds / 60))}" data-field="min" aria-label="Minuten Satz ${i + 1}"><span class="muted time-colon">:</span><input type="number" inputmode="numeric" min="0" max="59" placeholder="s" value="${esc(seconds % 60)}" data-field="sec" aria-label="Sekunden Satz ${i + 1}"></td>`
      : `<td><input type="number" inputmode="numeric" min="0" placeholder="Wdh." value="${esc(set.reps)}" data-field="reps" aria-label="Wiederholungen Satz ${i + 1}"></td>`;
    return `
      <tr class="set-row" data-entry="${entry.exerciseId}" data-index="${i}">
        <td class="set-label">${i + 1}</td>
        <td><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="kg" value="${esc(set.weight)}" data-field="weight" aria-label="Gewicht Satz ${i + 1}"></td>
        ${valueCell}
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
    if (field === 'weight' || field === 'reps') {
      set[field] = event.target.value;
    } else if (field === 'min' || field === 'sec') {
      const seconds = Number(set.seconds) || 0;
      const minutes = field === 'min' ? Number(event.target.value) || 0 : Math.floor(seconds / 60);
      const rest = field === 'sec' ? Number(event.target.value) || 0 : seconds % 60;
      set.seconds = minutes * 60 + rest;
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
      ? (targetSecondsOf(entry) > 0 ? `Ziel: ${esc(formatTime(targetSecondsOf(entry)))}` : '')
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
        <thead><tr><th scope="col">Satz</th><th scope="col">Gewicht (kg)</th><th scope="col">${timed ? 'Dauer (min : s)' : 'Wiederholungen'}</th><th scope="col"></th></tr></thead>
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
  const intro = document.createElement('section');
  intro.className = 'card new-workout-intro';
  intro.innerHTML = `<h2>Training: ${esc(day.name)}</h2><p class="muted">${day.exercises.length} Übung(en) laut Plan – trage Gewicht und Wiederholungen pro Satz ein.</p>`;
  container.appendChild(intro);
  renderWorkoutForm(container, workout, refresh);
  const workout = newWorkoutFromDay(day);
  renderWorkoutScreen(container, workout, `<h2>Training: ${esc(day.name)}</h2><p class="muted">${day.exercises.length} \u00dcbung(en) laut Plan \u2013 trage Gewicht und Wiederholungen bzw. Dauer pro Satz ein.</p>`);
}

export function renderEditWorkout(container, workoutId) {
  const workout = getWorkouts().find((w) => w.id === workoutId);
  if (!workout) {
    container.innerHTML = '<section class="card"><p>Training nicht gefunden.</p></section>';
    return;
  }
  renderWorkoutScreen(container, workout, `<h2>Training bearbeiten</h2><p class="muted">${esc(formatDate(workout.date))} \u00b7 ${esc(workout.dayName)} \u00b7 Volumen: ${esc(numberFormat(volumeOf(workout)))} kg</p>`);
}
