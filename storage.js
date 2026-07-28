// Simple storage wrapper for localStorage with versioning and backup import/export.
// Stores full app model under key 'piggy365_v1'

const KEY = 'piggy365_v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const defaultState = _defaultState();
      saveState(defaultState);
      return defaultState;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load state', e);
    const defaultState = _defaultState();
    saveState(defaultState);
    return defaultState;
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportJSON(state) {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `piggy365-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // basic validation
        if (!parsed.goals) throw new Error('Invalid backup');
        saveState(parsed);
        resolve(parsed);
      } catch (e) { reject(e) }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function _defaultState(){
  const id = _id();
  return {
    version:1,
    lastOpened: new Date().toISOString(),
    settings: {
      theme: 'system',
      vibrate: true,
      sounds: true
    },
    goals:[
      {
        id,
        name: "Default",
        target: 225000,
        days: 365,
        min: 300,
        max: 1200,
        createdAt: new Date().toISOString(),
        amounts: [], // {value, closed:false, closedAt: null, id}
        history: [], // {id, amount, date}
      }
    ],
    selectedGoalId: id
  };
}

function _id(){ return 'g_' + Math.random().toString(36).slice(2,10) }