// Exports utility functions: ripple, flip, progress animation, confetti simple.

export function rippleEffect(el, x = null, y = null) {
  el.classList.add('ripple');
  setTimeout(()=>el.classList.remove('ripple'), 700);
  if (navigator.vibrate) navigator.vibrate(8);
}

export function flipAnimation(el) {
  el.animate([
    { transform: 'rotateX(0deg) scale(1)' },
    { transform: 'rotateX(90deg) scale(0.96)' },
    { transform: 'rotateX(0deg) scale(1)' }
  ], {
    duration: 420,
    easing: 'cubic-bezier(.2,.9,.2,1)'
  });
}

export function animateProgressRing(svgEl, percent) {
  const fg = svgEl.querySelector('.ring-fg');
  const r = fg.r.baseVal.value;
  const c = 2 * Math.PI * r;
  fg.style.strokeDasharray = `${c} ${c}`;
  const offset = c - (percent / 100) * c;
  fg.style.strokeDashoffset = offset;
  const label = document.getElementById('progress-value');
  if (label) {
    label.textContent = `${Math.round(percent)}%`;
  }
}

export function confettiBurst(container=document.body, count=60, color='#22C55E') {
  // lightweight confetti using DOM fragments
  for (let i=0;i<count;i++){
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = `${50 + (Math.random()*80 - 40)}%`;
    el.style.top = `${30 + Math.random()*20}%`;
    el.style.width = '8px';
    el.style.height = '12px';
    el.style.background = color;
    el.style.opacity = Math.random()*0.9+0.2;
    el.style.transform = `translate3d(0,-20px,0) rotate(${Math.random()*360}deg)`;
    el.style.borderRadius = '2px';
    el.style.zIndex = 1000;
    el.style.pointerEvents = 'none';
    el.style.transition = `transform ${800+Math.random()*900}ms cubic-bezier(.2,.9,.2,1), opacity 900ms`;
    container.appendChild(el);
    requestAnimationFrame(()=>{
      el.style.transform = `translate3d(${(Math.random()*300-150)}px, ${(400+Math.random()*200)}px, 0) rotate(${Math.random()*720}deg)`;
      el.style.opacity = '0';
    });
    setTimeout(()=>el.remove(), 1800 + Math.random()*600);
  }
}