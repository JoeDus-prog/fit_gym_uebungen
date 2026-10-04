export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function volumeOf(workout) {
  return workout.entries.reduce(
    (sum, entry) => sum + entry.sets.reduce(
      (s, set) => s + (Number(set.weight) * Number(set.reps) || 0),
      0
    ),
    0
  );
}

export function numberFormat(value) {
  return new Intl.NumberFormat('de-DE').format(value);
}

export function targetSecondsOf(entry) {
  const minutes = Number(entry.targetMinutes) || 0;
  const seconds = Number(entry.targetSeconds) || 0;
  return minutes * 60 + seconds;
}

export function formatTime(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} min`;
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, 2200);
}
