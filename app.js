// Main app orchestrator
import { generateRoundedDistribution, shuffle } from './generator.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';
import * as Anim from './animations.js';
import * as AnimHelpers from './animations.js';

let state = Storage.loadState();

const el = {
  search: ()=>document.getElementById('search-input'),
  filters: ()=>document.querySelectorAll('.filter'),
  newBtn: ()=>document.getElementById('btn-new-goal'),
  exportBtn: ()=>document.getElementById('btn-export'),
  importBtn: ()=>document.getElementById('btn-import'),
  installBtn: ()=>document.getElementById('btn-install'),
  settingsBtn: ()=>document.getElementById('btn-settings'),
  pickToday: ()=>document.getElementById('btn-pick-today'),
  goalSelector: ()=>document.getElementById('goal-selector'),
  tabs: ()=>document.querySelectorAll('.tab'),
  modalRoot: ()=>document.getElementById('modal-root'),
  historyList: ()=>document.getElementById('history-list')
};

// Boot
document.addEventListener('DOMContentLoaded', ()=> {
  initUI();
  registerServiceWorker();
  update();
  setupInstallPrompt();
});

function initUI(){
  // Render selector
  UI.renderGoalSelector(state.goals, state.selectedGoalId);
  document.getElementById('btn-new-goal').addEventListener('click', showNewGoalModal);
  document.getElementById('btn-settings').addEventListener('click', ()=> openTab('settings'));
  document.getElementById('btn-export').addEventListener('click', ()=> Storage.exportJSON(state));
  document.getElementById('btn-import').addEventListener('click', ()=> showImportDialog());
  document.getElementById('goal-selector').addEventListener('change', (e)=> {
    state.selectedGoalId = e.target.value;
    Storage.saveState(state);
    update();
  });

  // Search
  el.search().addEventListener('input', (e)=> UI.highlightMatches(e.target.value.trim()));

  // Filters
  el.filters().forEach(btn=>btn.addEventListener('click', (e)=>{
    el.filters().forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    UI.applyFilter(e.target.dataset.filter, currentGoal());
  }));

  // Pick today
  el.pickToday().addEventListener('click', ()=>{
    const idx = UI.pickRandomOpen(currentGoal());
    if (idx!=null){
      // flash and open
      setTimeout(()=>{},200);
    } else alert('Нема відкритих карток');
  });

  // Tabs
  el.tabs().forEach(t=> t.addEventListener('click', ()=> openTab(t.dataset.tab)));

  // Attach card toggle handler
  import('./ui.js').then(({ attachCardHandlers })=>{
    attachCardHandlers(toggleCard);
  });

  // Settings
  document.getElementById('theme-select').value = state.settings.theme || 'system';
  document.getElementById('opt-vibrate').checked = state.settings.vibrate;
  document.getElementById('opt-sounds').checked = state.settings.sounds;
  document.getElementById('theme-select').addEventListener('change', (e)=>{
    state.settings.theme = e.target.value; applyTheme(); Storage.saveState(state);
  });
  document.getElementById('opt-vibrate').addEventListener('change', (e)=>{ state.settings.vibrate = e.target.checked; Storage.saveState(state);});
  document.getElementById('opt-sounds').addEventListener('change', (e)=>{ state.settings.sounds = e.target.checked; Storage.saveState(state);});

  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if (!confirm('Скинути весь прогрес цієї скарбнички?')) return;
    const g = currentGoal();
    g.amounts.forEach(a=>{ a.closed=false; a.closedAt=null; });
    g.history = [];
    Storage.saveState(state);
    update();
  });
}

function currentGoal(){
  return state.goals.find(g=>g.id === state.selectedGoalId) || state.goals[0];
}

function update(){
  state.lastOpened = new Date().toISOString();
  Storage.saveState(state);
  const goal = currentGoal();
  // If amounts empty, generate
  if (!goal.amounts || goal.amounts.length !== goal.days) {
    try {
      const amounts = generateRoundedDistribution({
        target: goal.target,
        days: goal.days,
        min: goal.min,
        max: goal.max,
        unit:50
      });
      goal.amounts = amounts.map(v=>({value:v, closed:false, closedAt:null, id: _id()}));
      Storage.saveState(state);
    } catch(e){
      console.error('Generator error', e);
      alert('Не вдалося згенерувати суму з поточними параметрами. Перевірте правильність введених значень.');
    }
  }
  // render
  UI.renderGoalSelector(state.goals, state.selectedGoalId);
  // stats
  const stats = UI.renderStats(goal);
  UI.renderTopCard(goal, stats);
  UI.renderCardsGrid(goal);
  UI.renderHistory(goal);
  UI.renderAchievements(stats.percent);
  UI.renderStats(goal);
}

function toggleCard(index, cardEl) {
  const g = currentGoal();
  const item = g.amounts[index];
  if (!item) return;
  item.closed = !item.closed;
  if (item.closed) {
    item.closedAt = new Date().toISOString();
    // add history
    const h = { id: _id(), amount: item.value, date: item.closedAt };
    g.history.push(h);
  } else {
    // remove last matching history entry for this amount and date
    // keep conservative: remove latest with same amount
    for (let i = g.history.length-1; i>=0;i--){
      if (g.history[i].amount === item.value) { g.history.splice(i,1); break; }
    }
    item.closedAt = null;
  }
  Storage.saveState(state);
  // update UI
  if (item.closed) cardEl.classList.add('closed'); else cardEl.classList.remove('closed');
  UI.playSound(state.settings.sounds);
  if (state.settings.vibrate && navigator.vibrate) navigator.vibrate(12);
  // update top card and stats
  const stats = UI.renderStats(currentGoal());
  UI.renderTopCard(currentGoal(), stats);
  UI.renderHistory(currentGoal());
  UI.renderAchievements(stats.percent);
  UI.celebrateIfComplete?.(stats.percent); // optional
}

function showNewGoalModal(){
  const tpl = document.getElementById('modal-new-goal');
  const clone = tpl.content.cloneNode(true);
  const modal = clone.querySelector('.modal');
  document.body.appendChild(modal);
  modal.querySelector('#cancel-create').addEventListener('click', ()=> modal.remove());
  modal.querySelector('#create-goal').addEventListener('click', ()=> {
    const name = modal.querySelector('#new-name').value.trim() || 'Нова';
    const target = Math.round(Number(modal.querySelector('#new-target').value) || 0);
    const days = Math.max(1, Math.floor(Number(modal.querySelector('#new-days').value) || 365));
    const min = Math.max(50, Math.round(Number(modal.querySelector('#new-min').value) || 50));
    const max = Math.max(min, Math.round(Number(modal.querySelector('#new-max').value) || min));
    const gid = _id();
    const goal = { id: gid, name, target, days, min, max, createdAt: new Date().toISOString(), amounts: [], history: [] };
    state.goals.push(goal);
    state.selectedGoalId = gid;
    Storage.saveState(state);
    modal.remove();
    update();
  });
}

function showImportDialog(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json';
  input.onchange = ()=> {
    const f = input.files[0];
    if (!f) return;
    Storage.importJSON(f).then(parsed=>{
      state = parsed;
      Storage.saveState(state);
      UI.renderGoalSelector(state.goals, state.selectedGoalId);
      update();
      alert('Імпортовано успішно');
    }).catch(e=>{
      alert('Не вдалося імпортувати: ' + e.message);
    });
  };
  input.click();
}

// Install prompt handling
let deferredPrompt = null;
function setupInstallPrompt(){
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btn-install');
    btn.hidden = false;
    btn.addEventListener('click', async ()=>{
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.hidden = true;
    });
  });
}

function openTab(name){
  document.querySelectorAll('.tab').forEach(t=> t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('.tab-pane').forEach(p=> p.classList.toggle('active', p.id==='tab-'+name));
  // small mapping: incoming names sometimes match direct ids
  document.querySelectorAll('.tab-pane').forEach(p=>{
    p.classList.remove('active');
  });
  const map = { stats: 'tab-stats', history:'tab-history', achievements:'tab-achievements', settings:'tab-settings' };
  const pane = document.getElementById(map[name]);
  if (pane) pane.classList.add('active');
}

async function registerServiceWorker(){
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('service-worker.js');
      // console.log('SW registered');
    } catch(e){
      console.warn('SW registration failed', e);
    }
  }
}

function _id(){ return 'id_' + Math.random().toString(36).slice(2,10) }