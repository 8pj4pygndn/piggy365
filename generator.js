// Generator: creates N rounded-to-50 unique-ish values that sum exactly to target.
// Exported as module functions.

export function generateRoundedDistribution({
  target,
  days,
  min,
  max,
  unit = 50,
  maxRetries = 8
}) {
  // Work in integer units
  const TU = Math.round(target / unit);
  const minU = Math.round(min / unit);
  const maxU = Math.round(max / unit);
  const N = days;

  if (minU * N > TU || maxU * N < TU) {
    throw new Error('Impossible constraints: adjust min/max/target/days');
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    const arr = _randomPartition(TU - N * minU, N, maxU - minU);
    // convert back and add minU, then to value
    const valuesU = arr.map(x => x + minU);
    // try to make them diverse: if duplicates exist, nudge small
    _diversify(valuesU, maxU);
    // convert to amounts in currency
    const amounts = valuesU.map(u => u * unit);
    // last check sum
    const s = amounts.reduce((a,b)=>a+b,0);
    if (s === target) {
      // ensure shuffled random order
      shuffle(amounts);
      return amounts;
    }
    // If sum mismatch due to rounding, repair by distributing difference
    const diff = (target - s) / unit; // in units
    if (diff !== 0 && Math.abs(diff) <= 5) {
      try {
        const repaired = _repair(amounts.map(a=>a/unit), diff, minU, maxU);
        const final = repaired.map(u => u*unit);
        if (final.reduce((a,b)=>a+b,0) === target) {
          shuffle(final);
          return final;
        }
      } catch(e){
        // continue
      }
    }
    attempt++;
  }
  throw new Error('Failed to generate a distribution satisfying constraints after retries.');
}

function _randomPartition(remaining, n, maxInc) {
  // Distribute 'remaining' units among n slots, each between 0 and maxInc inclusive
  // Use random split with rejection for overflow
  const res = new Array(n).fill(0);
  let rem = remaining;
  for (let i = 0; i < n; i++) {
    const slotsLeft = n - i - 1;
    const maxForThis = Math.min(maxInc, rem - 0);
    const minForThis = Math.max(0, rem - slotsLeft * maxInc);
    // random integer between minForThis and maxForThis
    const v = (minForThis >= maxForThis) ? minForThis : Math.floor(Math.random() * (maxForThis - minForThis + 1)) + minForThis;
    res[i] = v;
    rem -= v;
  }
  // shuffle to randomize distribution
  shuffle(res);
  return res;
}

function _diversify(arrU, maxU) {
  // attempt to reduce duplicates by nudging values randomly within allowed bounds
  const map = new Map();
  for (let i=0;i<arrU.length;i++){
    const v = arrU[i];
    map.set(v, (map.get(v)||0)+1);
  }
  // for values with count>1, try to nudge some elements up or down
  for (const [val,count] of map.entries()) {
    if (count > 1) {
      let need = count - 1;
      for (let i=0; i< arrU.length && need>0;i++){
        if (arrU[i] === val) {
          const dir = Math.random() > 0.5 ? 1 : -1;
          const candidate = arrU[i] + dir;
          if (candidate >= 0 && candidate <= maxU) {
            arrU[i] = candidate;
            need--;
          }
        }
      }
    }
  }
  // final minor shuffle
  shuffle(arrU);
}

function _repair(arrU, diff, minU, maxU) {
  // diff in units; positive means need to add units across array
  const res = arrU.slice();
  let remaining = diff;
  const n = res.length;
  let attempts = 0;
  while (remaining !== 0 && attempts < n * 5) {
    const idx = Math.floor(Math.random() * n);
    if (remaining > 0) {
      if (res[idx] < maxU) { res[idx]++; remaining--; }
    } else {
      if (res[idx] > minU) { res[idx]--; remaining++; }
    }
    attempts++;
  }
  if (remaining !== 0) throw new Error('Repair failed');
  return res;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}