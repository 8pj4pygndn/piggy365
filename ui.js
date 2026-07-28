// UI rendering and interaction helpers. Non-blocking render, lazy load cards for performance.

import {shuffle} from './generator.js';
import {rippleEffect, flipAnimation, animateProgressRing, confettiBurst} from './animations.js';

export function formatCurrency(n){ return `${numberWithSpaces(n)} ₴`; }
function numberWithSpaces(x){ return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g," "); }

export function renderGoalSelector(goals, selectedId){
  const sel = document.getElementById('goal-selector');
  sel.innerHTML = '';
  goals.forEach(g=>{
    const o = document.createElement('option');
    o.value = g.id;
    o.textContent = `${g.name} — ${formatCurrency(g.target)}`;
    if (g.id === selectedId) o.selected = true;
    sel.appendChild(o);
  });
}

export function renderTopCard(goal, stats){
  document.getElementById('goal-name').textContent = goal.name;
  document.getElementById('goal-target').textContent = formatCurrency(goal.target);
  document.getElementById('goal-saved').textContent = formatCurrency(stats.saved);
  document.getElementById('goal-percent').textContent = `${Math.round(stats.percent)}%`;
  document.getElementById('goal-closed-count').textContent = `${stats.closed} / ${goal.amounts.length}`;
  animateProgressRing(document.getElementById('progress-ring'), stats.percent);
}

export function renderCardsGrid(goal, opts = {}) {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';
  // Lazy render in batches for performance
  const amounts = goal.amounts;
  const frag = document.createDocumentFragment();
  for (let i=0;i<amounts.length;i++){
    const item = amounts[i];
    const card = document.createElement('button');
    card.className = 'card';
    if (opts.small) card.classList.add('small');
    if (item.closed) card.classList.add('closed');
    card.dataset.index = i;
    card.dataset.value = item.value;
    card.innerHTML = `<span class="label">${numberWithSpaces(item.value)} ₴</span><span class="check">✔</span>`;
    frag.appendChild(card);
  }
  grid.appendChild(frag);
}

export function attachCardHandlers(onToggle) {
  const grid = document.getElementById('cards-grid');
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.card');
    if (!card) return;
    const index = Number(card.dataset.index);
    rippleEffect(card);
    flipAnimation(card);
    onToggle(index, card);
  });
}

export function highlightMatches(term) {
  const cards = document.querySelectorAll('.card');
  const v = term.trim();
  cards.forEach(c=>{
    c.classList.remove('highlight');
    if (!v) return;
    const val = String(c.dataset.value||'');
    if (val.includes(v)) c.classList.add('highlight');
  });
}

export function applyFilter(filter, goal) {
  const cards = document.querySelectorAll('.card');
  cards.forEach(c=>{
    const idx = Number(c.dataset.index);
    const item = goal.amounts[idx];
    c.hidden = false;
    if (filter === 'active' && item.closed) c.hidden = true;
    if (filter === 'closed' && !item.closed) c.hidden = true;
    if (filter === 'today') {
      const today = new Date().toISOString().slice(0,10);
      if (!item.closedAt || item.closedAt.slice(0,10) !== today) c.hidden = true;
    }
  });
}

export function pickRandomOpen(goal) {
  const openIdx = goal.amounts.map((a,i)=> a.closed ? -1 : i).filter(i=>i>=0);
  if (!openIdx.length) return null;
  const idx = openIdx[Math.floor(Math.random()*openIdx.length)];
  const el = document.querySelector(`.card[data-index="${idx}"]`);
  if (el) {
    el.classList.add('highlight');
    setTimeout(()=>el.classList.remove('highlight'), 2200);
    el.scrollIntoView({behavior:'smooth',block:'center'});
  }
  return idx;
}

export function renderStats(goal){
  const amounts = goal.amounts.map(a=>a.value);
  const closed = goal.amounts.filter(a=>a.closed);
  const saved = closed.reduce((s,c)=>s+c.value,0);
  const left = goal.target - saved;
  const percent = (saved / goal.target) * 100;
  const avg = amounts.length ? Math.round(amounts.reduce((a,b)=>a+b,0)/amounts.length) : 0;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const median = _median(amounts);
  document.getElementById('stat-saved').textContent = formatCurrency(saved);
  document.getElementById('stat-left').textContent = formatCurrency(Math.max(0,left));
  document.getElementById('stat-percent').textContent = `${Math.round(percent)}%`;
  document.getElementById('stat-avg').textContent = formatCurrency(avg);
  document.getElementById('stat-min').textContent = formatCurrency(min);
  document.getElementById('stat-max').textContent = formatCurrency(max);
  return {saved,left,percent,avg,min,max,median,closedCount:closed.length};
}

function _median(arr){
  const s = arr.slice().sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length ? (s.length%2 ? s[mid] : Math.round((s[mid-1]+s[mid])/2)) : 0;
}

export function renderHistory(goal){
  const el = document.getElementById('history-list');
  el.innerHTML = '';
  const hist = (goal.history||[]).slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  if (!hist.length) { el.textContent = 'Поки немає внесків'; return; }
  hist.forEach(h=>{
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `<div>${new Date(h.date).toLocaleString()} — ${formatCurrency(h.amount)}</div>
      <div><button data-id="${h.id}" class="btn small edit">✏️</button> <button data-id="${h.id}" class="btn small del">🗑️</button></div>`;
    el.appendChild(row);
  });
}

export function renderAchievements(percent){
  const container = document.getElementById('achievements-grid');
  container.innerHTML = '';
  [25,50,75,100].forEach(p=>{
    const div = document.createElement('div');
    div.className = 'achievement';
    div.innerHTML = `<div style="font-size:18px;font-weight:700">${p}%</div><div style="color:var(--muted)">Досягнення</div>`;
    if (percent >= p) div.style.boxShadow = '0 8px 30px rgba(34,197,94,0.12)';
    container.appendChild(div);
  });
}

export function playSound(enabled) {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
  } catch(e){}
}

export function celebrateIfComplete(percent){
  if (percent >= 100) {
    confettiBurst(document.body, 80, getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#22C55E');
  }
}