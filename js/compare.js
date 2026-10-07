import { getWorkouts } from './store.js';
import { esc, numberFormat } from './util.js';

function dayKey(workout) {
  return workout.dayId || workout.dayName;
}

function setMainValue(set, goalMode) {
  if (goalMode === 'time') return Number(set.seconds) || 0;
  return Number(set.weight) || 0;
}

function setSecondaryValue(set, goalMode) {
  if (goalMode === 'time') return Number(set.weight) || 0;
  return Number(set.reps) || 0;
}

function bestSet(entry) {
  return entry.sets.reduce((best, set) => {
    const main = setMainValue(set, entry.goalMode);
    if (!best || main > best.main) {
      return { main, secondary: setSecondaryValue(set, entry.goalMode) };
    }
    return best;
  }, null);
}

function formatUnit(goalMode) {
  return goalMode === 'time' ? 'Sek.' : 'kg';
}

function formatSecondary(entry, set) {
  if (entry.goalMode === 'time') return `${numberFormat(set.weight)} kg`;
  return `${numberFormat(set.reps)} Wdh.`;
}

function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function collectExerciseSessions(dayWorkouts) {
  const byName = new Map();
  dayWorkouts.forEach((w) => {
    w.entries.forEach((entry) => {
      if (!byName.has(entry.exerciseName)) byName.set(entry.exerciseName, []);
      byName.get(entry.exerciseName).push({ workout: w, entry });
    });
  });
  return [...byName.entries()].map(([name, sessions]) => ({
    name,
    goalMode: sessions[0].entry.goalMode,
    sessions
  }));
}

function renderLineChart(sessions, goalMode) {
  const width = 320;
  const height = 150;
  const padX = 28;
  const padTop = 18;
  const padBottom = 26;
  const values = sessions.map((s) => bestSet(s.entry)?.main || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || Math.max(max, 1);
  const yMax = max + span * 0.15;
  const yMin = Math.max(0, min - span * 0.15);
  const yRange = yMax - yMin || 1;
  const n = sessions.length;
  const stepX = n > 1 ? (width - padX * 2) / (n - 1) : 0;
  const xOf = (i) => (n > 1 ? padX + i * stepX : (width - padX * 2) / 2 + padX);
  const yOf = (v) => padTop + (1 - (v - yMin) / yRange) * (height - padTop - padBottom);
  const points = sessions.map((s, i) => ({ x: xOf(i), y: yOf(bestSet(s.entry)?.main || 0), i }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const gridYs = [0, 0.5, 1].map((t) => padTop + t * (height - padTop - padBottom));
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Verlauf ${esc(formatUnit(goalMode))}">
      ${gridYs.map((y) => `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" class="chart-grid"></line>`).join('')}
      <text x="${padX - 4}" y="${gridYs[0] + 4}" text-anchor="end" class="chart-label">${esc(numberFormat(Math.round(yMax)))}</text>
      <text x="${padX - 4}" y="${gridYs[2] + 4}" text-anchor="end" class="chart-label">${esc(numberFormat(Math.round(yMin)))}</text>
      ${n > 1 ? `<path d="${path}" class="chart-line"></path>` : ''}
      ${points.map((p) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="chart-dot"></circle>
        <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" class="chart-value">${esc(numberFormat(values[p.i]))}</text>
        <text x="${p.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-label">${esc(shortDate(sessions[p.i].workout.date))}</text>
      `).join('')}
    </svg>`;
}

function renderExerciseCard(exercise) {
  const { sessions, goalMode } = exercise;
  const card = document.createElement('article');
  card.className = 'card compare-exercise';
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  let deltaHtml = '';
  if (prev) {
    const lastBest = bestSet(last.entry);
    const prevBest = bestSet(prev.entry);
    const diff = (lastBest?.main || 0) - (prevBest?.main || 0);
    const diffSec = (lastBest?.secondary || 0) - (prevBest?.secondary || 0);
    const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
    const unit = formatUnit(goalMode);
    deltaHtml = `
      <div class="compare-delta ${trend}">
        <span class="delta-arrow">${arrow}</span>
        <span>${diff === 0 ? 'gleich' : `${diff > 0 ? '+' : ''}${numberFormat(diff)} ${unit}`}</span>
        ${diffSec !== 0 ? `<span class="muted">${diffSec > 0 ? '+' : ''}${numberFormat(diffSec)} ${goalMode === 'time' ? 'kg' : 'Wdh.'}</span>` : ''}
        <span class="muted">vs. ${esc(shortDate(prev.workout.date))}</span>
      </div>`;
  } else {
    deltaHtml = '<p class="muted">Erster dokumentierter Durchgang dieser Übung.</p>';
  }
  const maxSets = Math.max(...sessions.map((s) => s.entry.sets.length));
  card.innerHTML = `
    <header class="entry-header">
      <h3>${esc(exercise.name)}</h3>
      <span class="muted">${sessions.length} Durchgang/Durchg\u00e4nge</span>
    </header>
    ${renderLineChart(sessions, goalMode)}
    ${deltaHtml}
    <table class="sets-table compare-table">
      <thead>
        <tr><th scope="col">Datum</th>${Array.from({ length: maxSets }, (_, i) => `<th scope="col">Satz ${i + 1}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sessions.map((s) => `
          <tr>
            <td class="muted">${esc(shortDate(s.workout.date))}</td>
            ${Array.from({ length: maxSets }, (_, i) => {
              const set = s.entry.sets[i];
              if (!set) return '<td class="muted">\u2013</td>';
              return `<td>${goalMode === 'time'
                ? `${esc(numberFormat(set.seconds || 0))} Sek.`
                : `${esc(numberFormat(set.weight || 0))} kg \u00d7 ${esc(numberFormat(set.reps || 0))}`}</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`;
  return card;
}

export function renderCompare(container) {
  const workouts = [...getWorkouts()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (workouts.length === 0) {
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Noch keine Trainings dokumentiert</h2>
        <p>Dokumentiere Trainings im Reiter \u201eTraining\u201c \u2013 hier erscheint dann der Vergleich der Durchg\u00e4nge je Trainingstag.</p>
      </section>`;
    return;
  }
  const byDay = new Map();
  workouts.forEach((w) => {
    const key = dayKey(w);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(w);
  });
  const days = [...byDay.entries()].map(([key, list]) => ({
    key,
    name: list[0].dayName,
    workouts: list
  })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  container.innerHTML = `
    <section class="card">
      <h2>Trainingstag vergleichen</h2>
      <p class="muted">Alle Durchg\u00e4nge eines Trainingstags im direkten Vergleich \u2013 pro \u00dcbung der Verlauf des Topwerts sowie alle S\u00e4tze je Durchgang.</p>
      <label class="field">
        <span>Trainingstag</span>
        <select id="compare-day-select"></select>
      </label>
    </section>
    <div id="compare-day"></div>`;
  const select = container.querySelector('#compare-day-select');
  days.forEach((day, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${day.name} (${day.workouts.length} \u00d7)`;
    select.appendChild(option);
  });
  const dayHost = container.querySelector('#compare-day');
  const renderDay = () => {
    const day = days[Number(select.value)] || days[0];
    dayHost.innerHTML = '';
    const exercises = collectExerciseSessions(day.workouts);
    exercises.forEach((exercise) => {
      dayHost.appendChild(renderExerciseCard(exercise));
    });
  };
  select.addEventListener('change', renderDay);
  renderDay();
}
