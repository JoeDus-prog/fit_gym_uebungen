import { renderPlan } from './plan.js';
import { renderNewWorkout, renderEditWorkout } from './workout.js';
import { renderOverview, renderWorkoutPicker } from './overview.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

const routes = [
  { hash: '#/plan', label: 'Plan', icon: '📋', render: (refresh) => renderPlan(app, refresh) },
  { hash: '#/training', label: 'Training', icon: '🏋️', render: (refresh) => renderWorkoutPicker(app) },
  { hash: '#/overview', label: 'Übersicht', icon: '📊', render: (refresh) => renderOverview(app, refresh) }
];

let currentRoute = null;

function renderNav(activeHash) {
  nav.innerHTML = '';
  routes.forEach((route) => {
    const btn = document.createElement('a');
    btn.className = 'tab' + (route.hash === activeHash ? ' active' : '');
    btn.href = route.hash;
    btn.innerHTML = `<span class="tab-icon">${route.icon}</span><span>${route.label}</span>`;
    nav.appendChild(btn);
  });
}

function refresh() {
  route();
}

function route() {
  const hash = window.location.hash || '#/plan';
  const newMatch = hash.match(/^#\/workout\/new\/(.+)$/);
  const editMatch = hash.match(/^#\/workout\/(.+)$/);

  if (newMatch) {
    renderNav('#/training');
    app.innerHTML = '';
    renderNewWorkout(app, newMatch[1], refresh);
    currentRoute = '#/training';
    return;
  }

  if (editMatch) {
    renderNav('#/overview');
    app.innerHTML = '';
    renderEditWorkout(app, editMatch[1], refresh);
    currentRoute = '#/overview';
    return;
  }

  const route = routes.find((r) => r.hash === hash) || routes[0];
  renderNav(route.hash);
  app.innerHTML = '';
  route.render(refresh);
  currentRoute = route.hash;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
