import { getWorkouts } from './store.js';
import { esc, numberFormat, volumeOf } from './util.js';

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

function chartHtml(points, unit, ariaLabel) {
  const width = 320;
  const height = 150;
  const padX = 28;
  const padTop = 18;
  const padBottom = 26;
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || Math.max(max, 1);
  const yMax = max + span * 0.15;
  const yMin = Math.max(0, min - span * 0.15);
  const yRange = yMax - yMin || 1;
  const n = points.length;
  const stepX = n > 1 ? (width - padX * 2) / (n - 1) : 0;
  const xOf = (i) => (n > 1 ? padX + i * stepX : (width - padX * 2) / 2 + padX);
  const yOf = (v) => padTop + (1 - (v - yMin) / yRange) * (height - padTop - padBottom);
  const coords = points.map((p, i) => ({ x: xOf(i), y: yOf(p.value), i }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const gridYs = [0, 0.5, 1].map((t) => padTop + t * (height - padTop - padBottom));
  const dot = (c) => `
    <a href="#/workout/${esc(points[c.i].workoutId)}" class="chart-point" aria-label="Training vom ${esc(points[c.i].date)}: ${esc(numberFormat(points[c.i].value))} ${esc(unit)}">
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" class="chart-dot"></circle>
    </a>
    <text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" text-anchor="middle" class="chart-value">${esc(numberFormat(points[c.i].value))}</text>
    <text x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-label">${esc(shortDate(points[c.i].date))}</text>`;
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(ariaLabel)}">
      ${gridYs.map((y) => `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" class="chart-grid"></line>`).join('')}
      <text x="${padX - 4}" y="${gridYs[0] + 4}" text-anchor="end" class="chart-label">${esc(numberFormat(Math.round(yMax)))}</text>
      <text x="${padX - 4}" y="${gridYs[2] + 4}" text-anchor="end" class="chart-label">${esc(numberFormat(Math.round(yMin)))}</text>
      ${n > 1 ? `<path d="${path}" class="chart-line"></path>` : ''}
      ${coords.map(dot).join('')}
    </svg>`;
}

function renderVolumeCard(day) {
  const workouts = day.workouts;
  const points = workouts.map((w) => ({
    value: Math.round(volumeOf(w)),
    date: w.date,
    workoutId: w.id
  }));
  const card = document.createElement('article');
  card.className = 'card compare-exercise';
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  let deltaHtml;
  if (prev) {
    const diff = last.value - prev.value;
    const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
    deltaHtml = `
      <div class="compare-delta ${trend}">
        <span class="delta-arrow">${arrow}</span>
        <span>${diff === 0 ? 'gleich' : `${diff > 0 ? '+' : ''}${numberFormat(diff)} kg`}</span>
        <span class="muted">vs. ${esc(shortDate(prev.date))}</span>
      </div>`;
  } else {
    deltaHtml = '<p class="muted">Erster dokumentierter Durchgang dieses Trainingstags.</p>';
  }
  card.innerHTML = `
    <header class="entry-header">
      <h3>Gesamtvolumen ${esc(day.name)}</h3>
      <span class="muted">kg \u00d7 Wdh. je Durchgang</span>
    </header>
    ${chartHtml(points, 'kg', 'Gesamtvolumen-Verlauf')}
    ${deltaHtml}`;
  return card;
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
    deltaHtml = '<p class="muted">Erster dokumentierter Durchgang dieser \u00dcbung.</p>';
  }
  const points = sessions.map((s) => ({
    value: bestSet(s.entry)?.main || 0,
    date: s.workout.date,
    workoutId: s.workout.id
  }));
  const maxSets = Math.max(...sessions.map((s) => s.entry.sets.length));
  card.innerHTML = `
    <header class="entry-header">
      <h3>${esc(exercise.name)}</h3>
      <span class="muted">${sessions.length} Durchgang/Durchg\u00e4nge</span>
    </header>
    ${chartHtml(points, formatUnit(goalMode), `Verlauf ${formatUnit(goalMode)}`)}
    ${deltaHtml}
    <table class="sets-table compare-table">
      <thead>
        <tr><th scope="col">Datum</th>${Array.from({ length: maxSets }, (_, i) => `<th scope="col">Satz ${i + 1}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sessions.map((s) => `
          <tr>
            <td><a href="#/workout/${esc(s.workout.id)}" class="compare-date-link">${esc(shortDate(s.workout.date))}</a></td>
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
  const maxDayCount = Math.max(...days.map((d) => d.workouts.length));
  const limits = [...new Set([5, 10, maxDayCount])].filter((n) => n > 1 && n < maxDayCount).sort((a, b) => a - b);
  container.innerHTML = `
    <section class="card">
      <h2>Trainingstag vergleichen</h2>
      <p class="muted">Alle Durchg\u00e4nge eines Trainingstags im direkten Vergleich \u2013 pro \u00dcbung der Verlauf des Topwerts, das Gesamtvolumen sowie alle S\u00e4tze je Durchgang. Diagrammpunkte und Datum verlinken direkt zum Training.</p>
      <div class="field-grid compare-filter">
        <label class="field">
          <span>Trainingstag</span>
          <select id="compare-day-select"></select>
        </label>
        <label class="field">
          <span>Zeitraum</span>
          <select id="compare-limit-select">
            <option value="0">Alle Durchg\u00e4nge</option>
            ${limits.map((n) => `<option value="${n}">Letzte ${n}</option>`).join('')}
          </select>
        </label>
      </div>
    </section>
    <div id="compare-day"></div>`;
  const select = container.querySelector('#compare-day-select');
  days.forEach((day, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${day.name} (${day.workouts.length} \u00d7)`;
    select.appendChild(option);
  });
  const limitSelect = container.querySelector('#compare-limit-select');
  const dayHost = container.querySelector('#compare-day');
  const renderDay = () => {
    const day = days[Number(select.value)] || days[0];
    const limit = Number(limitSelect.value) || 0;
    const scopedWorkouts = limit > 0 ? day.workouts.slice(-limit) : day.workouts;
    dayHost.innerHTML = '';
    const scopedDay = { ...day, workouts: scopedWorkouts };
    dayHost.appendChild(renderVolumeCard(scopedDay));
    const exercises = collectExerciseSessions(scopedWorkouts);
    exercises.forEach((exercise) => {
      dayHost.appendChild(renderExerciseCard(exercise));
    });
  };
  select.addEventListener('change', renderDay);
  limitSelect.addEventListener('change', renderDay);
  renderDay();
}
