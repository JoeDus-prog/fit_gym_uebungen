import { getPlan, getWorkouts } from './store.js';
import { exportData, importData } from './data.js';
import { esc, formatDate, volumeOf, numberFormat, toast } from './util.js';

function summarizeWorkout(workout) {
  const sets = workout.entries.reduce((n, e) => n + e.sets.length, 0);
  const done = workout.entries.reduce(
    (n, e) => n + e.sets.filter((s) => Number(s.weight) > 0 && Number(s.reps) > 0).length, 0
  );
  return { sets, done };
}

function appendDataCard(container) {
  const dataCard = document.createElement('section');
  dataCard.className = 'card data-card';
  dataCard.innerHTML = `
    <h2>Daten sichern</h2>
    <p class="muted">Sicherung als JSON-Datei exportieren oder eine frühere Sicherung importieren. Beim Import werden die aktuellen Daten auf diesem Gerät ersetzt.</p>
    <div class="row-actions">
      <button class="btn secondary" data-action="export">Export</button>
      <label class="btn secondary file-label">Import
        <input type="file" accept="application/json,.json" data-action="import" hidden>
      </label>
    </div>`;
  dataCard.querySelector('[data-action="export"]').addEventListener('click', exportData);
  dataCard.querySelector('input[data-action="import"]').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (getPlan().days.length > 0 || getWorkouts().length > 0) {
      const ok = confirm('Beim Import werden die aktuellen Daten auf diesem Gerät ersetzt. Fortfahren?');
      if (!ok) return;
    }
    try {
      const result = await importData(file);
      toast(`Import erfolgreich: ${result.days} Trainingstag(e), ${result.workouts} Training(s)`);
      location.reload();
    } catch (error) {
      alert(error.message || 'Import fehlgeschlagen');
    }
  });
  container.appendChild(dataCard);
}

export function renderOverview(container, refresh) {
  const workouts = [...getWorkouts()].sort((a, b) => (a.date < b.date ? 1 : -1));
  const plan = getPlan();

  if (workouts.length === 0) {
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Noch keine Trainings dokumentiert</h2>
        <p>Starte über den Reiter „Training“ ein Training aus deinem Übungsplan. Hier erscheint danach die Übersicht.</p>
      </section>`;
    appendDataCard(container);
    return;
  }

  const totalVolume = workouts.reduce((sum, w) => sum + volumeOf(w), 0);
  const totalSets = workouts.reduce((sum, w) => sum + summarizeWorkout(w).done, 0);

  const stats = document.createElement('section');
  stats.className = 'card stats';
  stats.innerHTML = `
    <h2>Gesamt</h2>
    <div class="stats-grid">
      <div class="stat"><strong>${workouts.length}</strong><span class="muted">Trainings</span></div>
      <div class="stat"><strong>${esc(numberFormat(totalSets))}</strong><span class="muted">dokumentierte Sätze</span></div>
      <div class="stat"><strong>${esc(numberFormat(Math.round(totalVolume)))}</strong><span class="muted">kg Volumen</span></div>
    </div>`;
  container.appendChild(stats);

  const perDay = new Map();
  workouts.forEach((w) => {
    if (!perDay.has(w.dayName)) perDay.set(w.dayName, []);
    perDay.get(w.dayName).push(w);
  });
  const dayStats = document.createElement('section');
  dayStats.className = 'card';
  dayStats.innerHTML = `
    <h2>Pro Trainingstag</h2>
    <ul class="day-stats-list">
      ${[...perDay.entries()].map(([name, list]) => {
        const vol = list.reduce((s, w) => s + volumeOf(w), 0);
        return `<li><span>${esc(name)}</span><span class="muted">${list.length} × · Ø ${esc(numberFormat(Math.round(vol / list.length)))} kg</span></li>`;
      }).join('')}
    </ul>`;
  container.appendChild(dayStats);

  appendDataCard(container);

  const list = document.createElement('section');
  list.className = 'workout-list';
  list.innerHTML = '<h2>Vergangene Trainings</h2>';
  workouts.forEach((w) => {
    const summary = summarizeWorkout(w);
    const card = document.createElement('article');
    card.className = 'card workout-summary';
    card.innerHTML = `
      <a href="#/workout/${w.id}" class="workout-link">
        <header>
          <strong>${esc(w.dayName)}</strong>
          <span class="muted">${esc(formatDate(w.date))}</span>
        </header>
        <div class="workout-meta muted">
          ${summary.done}/${summary.sets} Sätze · ${esc(numberFormat(Math.round(volumeOf(w))))} kg${w.note ? ` · ${esc(w.note)}` : ''}
        </div>
      </a>`;
    list.appendChild(card);
  });
  container.appendChild(list);
}

export function renderWorkoutPicker(container) {
  const plan = getPlan();
  if (plan.days.length === 0) {
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Kein Übungsplan vorhanden</h2>
        <p>Lege zuerst im Reiter „Plan“ Trainingstage mit Übungen an.</p>
      </section>`;
    return;
  }
  container.innerHTML = '<h2 class="picker-title">Welchen Trainingstag trainierst du heute?</h2>';
  const list = document.createElement('section');
  list.className = 'plan-list';
  plan.days.forEach((day) => {
    const card = document.createElement('article');
    card.className = 'card day-pick-card';
    card.innerHTML = `
      <a class="workout-link" href="#/workout/new/${day.id}">
        <header><strong>${esc(day.name)}</strong></header>
        <div class="muted">${day.exercises.length} Übung(en) · ${day.exercises.reduce((n, e) => n + e.targetSets, 0)} Sätze</div>
      </a>`;
    list.appendChild(card);
  });
  container.appendChild(list);
}
