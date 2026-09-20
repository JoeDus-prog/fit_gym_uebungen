import { getPlan, savePlan, emptyPlan } from './store.js';
import { esc, uid, toast } from './util.js';

function renderDayForm(day, onSave, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Trainingstag bearbeiten">
      <h2>Trainingstag</h2>
      <label class="field">
        <span>Name des Trainingstags</span>
        <input type="text" name="name" required placeholder="z. B. Tag A – Brust & Trizeps" value="${esc(day?.name ?? '')}">
      </label>
      <div class="row-actions">
        <button type="button" class="btn secondary" data-action="cancel">Abbrechen</button>
        <button type="button" class="btn primary" data-action="save">Speichern</button>
      </div>
    </div>`;
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => onCancel(overlay));
  overlay.querySelector('[data-action="save"]').addEventListener('click', () => {
    const name = overlay.querySelector('[name="name"]').value.trim();
    if (!name) {
      overlay.querySelector('[name="name"]').focus();
      return;
    }
    onSave(overlay, { name });
  });
  document.body.appendChild(overlay);
}

function renderExerciseForm(dayId, exercise, onSave, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Übung bearbeiten">
      <h2>Übung</h2>
      <label class="field">
        <span>Name der Übung</span>
        <input type="text" name="name" required placeholder="z. B. Bankdrücken" value="${esc(exercise?.name ?? '')}">
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Geplante Sätze</span>
          <input type="number" name="targetSets" min="1" max="20" inputmode="numeric" value="${esc(exercise?.targetSets ?? 3)}">
        </label>
        <label class="field">
          <span>Ziel-Wiederholungen</span>
          <input type="number" name="targetReps" min="0" max="100" inputmode="numeric" placeholder="z. B. 10" value="${esc(exercise?.targetReps ?? '')}">
        </label>
        <label class="field">
          <span>Ziel-Gewicht (kg)</span>
          <input type="number" name="targetWeight" min="0" step="0.5" inputmode="decimal" placeholder="z. B. 40" value="${esc(exercise?.targetWeight ?? '')}">
        </label>
      </div>
      <label class="field">
        <span>Notiz (optional)</span>
        <input type="text" name="note" placeholder="z. B. Gerät, Griffart" value="${esc(exercise?.note ?? '')}">
      </label>
      <div class="row-actions">
        <button type="button" class="btn secondary" data-action="cancel">Abbrechen</button>
        <button type="button" class="btn primary" data-action="save">Speichern</button>
      </div>
    </div>`;
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => onCancel(overlay));
  overlay.querySelector('[data-action="save"]').addEventListener('click', () => {
    const name = overlay.querySelector('[name="name"]').value.trim();
    if (!name) {
      overlay.querySelector('[name="name"]').focus();
      return;
    }
    const data = {
      name,
      targetSets: Math.max(1, Number(overlay.querySelector('[name="targetSets"]').value) || 3),
      targetReps: Number(overlay.querySelector('[name="targetReps"]').value) || null,
      targetWeight: Number(overlay.querySelector('[name="targetWeight"]').value) || null,
      note: overlay.querySelector('[name="note"]').value.trim()
    };
    onSave(overlay, data);
  });
  document.body.appendChild(overlay);
}

function closeOverlay(overlay) {
  overlay.remove();
}

function findDay(plan, dayId) {
  return plan.days.find((d) => d.id === dayId);
}

export function renderPlan(container, refresh) {
  const plan = getPlan();

  if (plan.days.length === 0) {
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Noch kein Übungsplan</h2>
        <p>Lege deinen ersten Trainingstag an und füge Übungen mit geplanten Sätzen hinzu.</p>
      </section>`;
  }

  const list = document.createElement('section');
  list.className = 'plan-list';

  plan.days.forEach((day) => {
    const dayCard = document.createElement('article');
    dayCard.className = 'card day-card';
    const exerciseRows = day.exercises.map((ex) => `
      <li class="exercise-row">
        <div class="exercise-info">
          <strong>${esc(ex.name)}</strong>
          <span class="muted">${esc(ex.targetSets)} Sätze${ex.targetReps ? ` × ${esc(ex.targetReps)} Wdh.` : ''}${ex.targetWeight ? ` @ ${esc(ex.targetWeight)} kg` : ''}${ex.note ? ` · ${esc(ex.note)}` : ''}</span>
        </div>
        <div class="row-actions inline">
          <button class="btn small secondary" data-action="edit-exercise" data-day="${day.id}" data-exercise="${ex.id}" aria-label="Übung bearbeiten">✏️</button>
          <button class="btn small danger" data-action="delete-exercise" data-day="${day.id}" data-exercise="${ex.id}" aria-label="Übung löschen">🗑️</button>
        </div>
      </li>`).join('');

    dayCard.innerHTML = `
      <header class="day-card-header">
        <h3>${esc(day.name)}</h3>
        <div class="row-actions inline">
          <button class="btn small secondary" data-action="edit-day" data-day="${day.id}" aria-label="Trainingstag bearbeiten">✏️</button>
          <button class="btn small danger" data-action="delete-day" data-day="${day.id}" aria-label="Trainingstag löschen">🗑️</button>
        </div>
      </header>
      ${day.exercises.length ? `<ul class="exercise-list">${exerciseRows}</ul>` : '<p class="muted">Noch keine Übungen angelegt.</p>'}
      <button class="btn add-exercise" data-action="add-exercise" data-day="${day.id}">+ Übung hinzufügen</button>`;

    list.appendChild(dayCard);
  });

  container.appendChild(list);

  const addDayBtn = document.createElement('button');
  addDayBtn.className = 'btn primary add-day';
  addDayBtn.textContent = '+ Trainingstag hinzufügen';
  container.appendChild(addDayBtn);

  addDayBtn.addEventListener('click', () => {
    renderDayForm(null, (overlay, data) => {
      const p = getPlan();
      p.days.push({ id: uid(), name: data.name, exercises: [] });
      savePlan(p);
      closeOverlay(overlay);
      toast('Trainingstag angelegt');
      refresh();
    }, closeOverlay);
  });

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const p = getPlan();

    if (action === 'edit-day') {
      const day = findDay(p, btn.dataset.day);
      renderDayForm(day, (overlay, data) => {
        day.name = data.name;
        savePlan(p);
        closeOverlay(overlay);
        toast('Trainingstag gespeichert');
        refresh();
      }, closeOverlay);
    }

    if (action === 'delete-day') {
      const day = findDay(p, btn.dataset.day);
      if (confirm(`Trainingstag "${day.name}" wirklich löschen?`)) {
        p.days = p.days.filter((d) => d.id !== day.id);
        savePlan(p);
        toast('Trainingstag gelöscht');
        refresh();
      }
    }

    if (action === 'add-exercise') {
      const day = findDay(p, btn.dataset.day);
      renderExerciseForm(day.id, null, (overlay, data) => {
        day.exercises.push({ id: uid(), ...data });
        savePlan(p);
        closeOverlay(overlay);
        toast('Übung hinzugefügt');
        refresh();
      }, closeOverlay);
    }

    if (action === 'edit-exercise') {
      const day = findDay(p, btn.dataset.day);
      const ex = day.exercises.find((e) => e.id === btn.dataset.exercise);
      renderExerciseForm(day.id, ex, (overlay, data) => {
        Object.assign(ex, data);
        savePlan(p);
        closeOverlay(overlay);
        toast('Übung gespeichert');
        refresh();
      }, closeOverlay);
    }

    if (action === 'delete-exercise') {
      const day = findDay(p, btn.dataset.day);
      const ex = day.exercises.find((e) => e.id === btn.dataset.exercise);
      if (confirm(`Übung "${ex.name}" wirklich löschen?`)) {
        day.exercises = day.exercises.filter((e) => e.id !== ex.id);
        savePlan(p);
        toast('Übung gelöscht');
        refresh();
      }
    }
  });
}
