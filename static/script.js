// ── SLIDER LIVE VALUES ──────────────────────────────────
const sliders = [
  { id: 'form_length',       display: 'form_length_val',       suffix: '' },
  { id: 'content_clarity',   display: 'content_clarity_val',   suffix: '' },
  { id: 'performance_grade', display: 'performance_grade_val', suffix: '' },
  { id: 'load_time_ms',      display: 'load_time_ms_val',      suffix: ' ms' },
];

sliders.forEach(({ id, display, suffix }) => {
  const el  = document.getElementById(id);
  const out = document.getElementById(display);
  if (!el || !out) return;
  el.addEventListener('input', () => { out.textContent = el.value + suffix; });
});

// ── TOGGLE BUTTONS ──────────────────────────────────────
function setupToggle(groupId, hiddenId) {
  const group  = document.getElementById(groupId);
  const hidden = document.getElementById(hiddenId);
  if (!group || !hidden) return;

  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hidden.value = btn.dataset.val;
    });
  });
}

setupToggle('cta_presence_group', 'cta_presence');
setupToggle('cta_position_group', 'cta_position');

// ── DONUT CHART ─────────────────────────────────────────
let donutChart = null;

function renderDonut(probHigh, probLow) {
  const ctx = document.getElementById('donutChart').getContext('2d');
  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High Conversion', 'Low Conversion'],
      datasets: [{
        data: [probHigh, probLow],
        backgroundColor: ['rgba(124,58,237,0.85)', 'rgba(239,68,68,0.7)'],
        borderColor:     ['rgba(124,58,237,1)',    'rgba(239,68,68,1)'],
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      animation: { animateRotate: true, duration: 900 }
    }
  });
}

// ── CONTRIBUTION BARS ────────────────────────────────────
function renderContributions(contributions) {
  const container = document.getElementById('contribBars');
  container.innerHTML = '';

  const entries = Object.entries(contributions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs  = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.01);

  entries.forEach(([feat, val]) => {
    const pct  = Math.min((Math.abs(val) / maxAbs) * 100, 100);
    const pos  = val >= 0;
    const row  = document.createElement('div');
    row.className = 'contrib-row';
    row.innerHTML = `
      <span class="contrib-name">${feat}</span>
      <div class="contrib-track">
        <div class="${pos ? 'contrib-fill-pos' : 'contrib-fill-neg'}"
             style="width:0%" data-target="${pct.toFixed(1)}%"></div>
      </div>
      <span class="contrib-num" style="color:${pos ? 'var(--green)' : 'var(--red)'}">
        ${pos ? '+' : ''}${val.toFixed(3)}
      </span>`;
    container.appendChild(row);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-target]').forEach(el => {
      el.style.transition = 'width 0.8s cubic-bezier(0.4,0,0.2,1)';
      el.style.width = el.dataset.target;
    });
  });
}

// ── TIPS GENERATOR ───────────────────────────────────────
function generateTips(data, formData) {
  const tips = [];

  if (formData.cta_presence === 'No')
    tips.push({ icon: '📢', text: 'Add a clear Call-To-Action button to significantly boost conversions.' });

  if (formData.cta_position !== 'Top')
    tips.push({ icon: '⬆️', text: 'Move your CTA to the top of the page — above-the-fold CTAs convert better.' });

  if (parseInt(formData.form_length) > 5)
    tips.push({ icon: '✂️', text: `Your form has ${formData.form_length} fields. Reduce to ≤5 to lower friction.` });

  if (parseInt(formData.performance_grade) < 70)
    tips.push({ icon: '⚡', text: `Performance grade ${formData.performance_grade}/100 is low. Optimize images and scripts.` });

  if (parseInt(formData.load_time_ms) > 2000)
    tips.push({ icon: '🚀', text: `Load time ${formData.load_time_ms}ms is slow. Target under 2000ms for better UX.` });

  if (parseInt(formData.content_clarity) < 3)
    tips.push({ icon: '✍️', text: 'Content clarity is low. Use clear headings, bullet points, and concise copy.' });

  if (tips.length === 0)
    tips.push({ icon: '✅', text: 'Great setup! Your page signals are well-optimized for conversion.' });

  return tips;
}

// ── FORM SUBMIT ──────────────────────────────────────────
document.getElementById('predictForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btnText   = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  const formData = {
    page_type:         document.getElementById('page_type').value,
    cta_presence:      document.getElementById('cta_presence').value,
    cta_position:      document.getElementById('cta_position').value,
    form_length:       document.getElementById('form_length').value,
    performance_grade: document.getElementById('performance_grade').value,
    content_clarity:   document.getElementById('content_clarity').value,
    load_time_ms:      document.getElementById('load_time_ms').value,
  };

  try {
    const res  = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();

    if (data.status !== 'success') throw new Error(data.message);

    // Show result panel
    document.getElementById('resultPlaceholder').classList.add('hidden');
    const content = document.getElementById('resultContent');
    content.classList.remove('hidden');

    // Verdict
    const isHigh = data.prediction === 1;
    const verdict = document.getElementById('resultVerdict');
    verdict.textContent = isHigh ? '🟢 High Conversion' : '🔴 Low Conversion';
    verdict.style.color = isHigh ? 'var(--green)' : 'var(--red)';

    document.getElementById('resultConfidence').textContent =
      `Model confidence: ${data.confidence}%`;

    // Donut
    renderDonut(data.prob_high, data.prob_low);
    document.getElementById('donutPct').textContent = data.confidence + '%';

    // Prob bars (animate)
    const highBar = document.getElementById('probHighBar');
    const lowBar  = document.getElementById('probLowBar');
    highBar.style.width = '0%';
    lowBar.style.width  = '0%';
    document.getElementById('probHighVal').textContent = data.prob_high + '%';
    document.getElementById('probLowVal').textContent  = data.prob_low  + '%';
    requestAnimationFrame(() => {
      highBar.style.width = data.prob_high + '%';
      lowBar.style.width  = data.prob_low  + '%';
    });

    // Contributions
    renderContributions(data.contributions);

    // Tips
    const tips = generateTips(data, formData);
    const tipsEl = document.getElementById('tipsSection');
    tipsEl.innerHTML = tips.map(t =>
      `<div class="tip-item"><span class="tip-icon">${t.icon}</span><span>${t.text}</span></div>`
    ).join('');

    // Scroll to result on mobile
    if (window.innerWidth < 1024) {
      document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    alert('Prediction failed: ' + err.message);
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
});
