(function () {
  const grid = document.getElementById('grid');
  const savedAmt = document.getElementById('savedAmt');
  const goalAmt = document.getElementById('goalAmt');
  const trackFill = document.getElementById('trackFill');
  const entriesDone = document.getElementById('entriesDone');
  const pctDone = document.getElementById('pctDone');
  const panelNote = document.getElementById('panelNote');
  const customForm = document.getElementById('customForm');
  const doneBanner = document.getElementById('doneBanner');
  const footerHint = document.getElementById('footerHint');
  const tabs = document.querySelectorAll('.tab');
  const pushBtn = document.getElementById('pushBtn');
  const pushStatus = document.getElementById('pushStatus');

  const peso = n => '₱' + Math.round(n).toLocaleString('en-PH');

  const notes = {
    week52: "Week 1, set aside ₱10. Week 2, ₱20. Keep climbing — by week 52 you'll have ₱13,780 tucked away.",
    env100: "100 sealed envelopes, numbered ₱1 to ₱100, shuffled. Tap one at a time and fill it with that amount. Total: ₱5,050.",
    custom: "Set your own goal and how many drops you want to split it into."
  };

  let challenges = window.__CHALLENGES__ || {};
  let mode = 'week52';
  let chart = null;

  function currentChallenge() {
    return challenges[mode];
  }

  function render() {
    panelNote.textContent = notes[mode];
    customForm.style.display = mode === 'custom' && !currentChallenge() ? 'flex' : 'none';

    const challenge = currentChallenge();
    grid.innerHTML = '';

    if (!challenge) {
      savedAmt.textContent = peso(0);
      goalAmt.textContent = peso(0);
      trackFill.style.width = '0%';
      entriesDone.textContent = '0 of 0 entries';
      pctDone.textContent = '0%';
      doneBanner.classList.remove('show');
      footerHint.textContent = 'Build your custom plan above to get started.';
      renderChart(null);
      return;
    }

    let saved = 0;
    challenge.entries.forEach((entry, idx) => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (mode === 'env100' && !entry.saved ? ' envelope-cell' : '');
      if (entry.saved) {
        cell.classList.add('saved');
        saved += entry.amount;
      }
      const numEl = document.createElement('div');
      numEl.className = 'num';
      numEl.textContent = idx + 1;
      const amtEl = document.createElement('div');
      amtEl.className = 'amt';
      amtEl.textContent = peso(entry.amount);
      cell.appendChild(numEl);
      cell.appendChild(amtEl);
      if (entry.saved) {
        const stamp = document.createElement('div');
        stamp.className = 'stamp';
        stamp.innerHTML = '<span>NASAVE</span>';
        cell.appendChild(stamp);
      }
      cell.addEventListener('click', () => toggle(idx));
      grid.appendChild(cell);
    });

    const doneCount = challenge.entries.filter(e => e.saved).length;
    const pct = challenge.goal ? Math.round((saved / challenge.goal) * 100) : 0;

    savedAmt.textContent = peso(saved);
    goalAmt.textContent = peso(challenge.goal);
    trackFill.style.width = pct + '%';
    entriesDone.textContent = doneCount + ' of ' + challenge.entries.length + ' entries';
    pctDone.textContent = pct + '%';
    footerHint.textContent = mode === 'env100'
      ? 'Sealed envelopes hide their amount until you tap them.'
      : "Tap a box once you've physically set the money aside.";
    doneBanner.classList.toggle('show', challenge.entries.length > 0 && doneCount === challenge.entries.length);

    loadChart();
  }

  async function toggle(idx) {
    const res = await fetch(`/challenge/${mode}/toggle/${idx}`, { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    currentChallenge().entries[idx] = data.entry;
    render();
  }

  async function loadChart() {
    const res = await fetch(`/challenge/${mode}/chart-data`);
    if (!res.ok) return renderChart(null);
    const data = await res.json();
    renderChart(data);
  }

  function renderChart(data) {
    const canvas = document.getElementById('progressChart');
    if (chart) { chart.destroy(); chart = null; }
    if (!data || data.series.length === 0) return;

    const labels = data.series.map(p => new Date(p.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }));
    const values = data.series.map(p => p.total);

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cumulative saved',
          data: values,
          borderColor: '#1F4D3D',
          backgroundColor: 'rgba(31,77,61,0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: '#C99A2E'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '₱' + v.toLocaleString('en-PH') } }
        }
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.mode;
      render();
    });
  });

  document.getElementById('customBuild').addEventListener('click', async () => {
    const goal = parseFloat(document.getElementById('customGoal').value);
    const count = parseInt(document.getElementById('customCount').value, 10);
    if (!goal || !count || goal <= 0 || count <= 0) {
      alert('Enter a goal amount and how many parts to split it into.');
      return;
    }
    const res = await fetch('/challenge/custom/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, count })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Could not build the plan.');
      return;
    }
    const data = await res.json();
    challenges.custom = data.challenge;
    render();
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!currentChallenge()) return;
    if (!confirm('Reset progress for this challenge? Your checked entries will be cleared.')) return;
    const res = await fetch(`/challenge/${mode}/reset`, { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    challenges[mode] = data.challenge;
    render();
  });

  // --- Push notifications ---

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  async function updatePushUI() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      pushBtn.style.display = 'none';
      pushStatus.textContent = 'Push notifications are not supported in this browser.';
      return;
    }
    if (!window.__VAPID_PUBLIC_KEY__) {
      pushBtn.style.display = 'none';
      pushStatus.textContent = 'Push notifications are not configured on the server yet.';
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      pushBtn.textContent = 'Turn off reminders';
      pushStatus.textContent = "You'll get a nudge if you haven't saved anything that day.";
    } else {
      pushBtn.textContent = 'Turn on daily reminders';
      pushStatus.textContent = 'Get a browser notification if you forget to save.';
    }
  }

  async function togglePush() {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      await existing.unsubscribe();
      await fetch('/push/unsubscribe', { method: 'POST' });
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        pushStatus.textContent = 'Notification permission was not granted.';
        return;
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(window.__VAPID_PUBLIC_KEY__)
      });
      await fetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    }
    updatePushUI();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/sw.js').then(updatePushUI).catch(() => {
      pushStatus.textContent = 'Could not register the service worker.';
    });
    pushBtn.addEventListener('click', togglePush);
  }

  render();
})();
