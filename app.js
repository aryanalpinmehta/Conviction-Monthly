/* ============================================================
   Conviction Monthly — app.js
   ============================================================ */

const OUTCOME_LABELS = {
  exceeded:    'Target Exceeded',
  'on-track':  'On Track',
  partial:     'Partially Correct',
  mixed:       'Mixed Result',
  correct:     'Correct Call',
  'in-progress': 'In Progress',
};

const CLASS_MAP = {
  'Equity':           'ac-equity',
  'Commodity':        'ac-commodity',
  'Fixed Income':     'ac-fixed-income',
  'Real Estate':      'ac-real-estate',
  'Cryptocurrency':   'ac-cryptocurrency',
  'Equity / FX':      'ac-equity',
};

/* ── State ───────────────────────────────────────────────── */
let activeFilter = 'All';
let searchQuery  = '';

/* ── DOM refs ────────────────────────────────────────────── */
const grid    = document.getElementById('reports-grid');
const overlay = document.getElementById('modal-overlay');
const modal   = document.getElementById('modal');

/* ── Render Cards ────────────────────────────────────────── */
function ratingDots(score) {
  return Array.from({ length: 5 }, (_, i) =>
    `<div class="card-rating-dot ${i < score ? 'filled' : ''}"></div>`
  ).join('');
}


function renderCard(r, idx) {
  const acClass  = CLASS_MAP[r.assetClass] || 'ac-equity';
  const outClass = `outcome-${r.outcome}`;
  const outLabel = OUTCOME_LABELS[r.outcome] || r.outcome;

  const card = document.createElement('article');
  card.className = 'report-card';
  card.style.animationDelay = `${idx * 0.04}s`;
  card.setAttribute('data-id', r.id);
  card.setAttribute('data-class', r.assetClass);
  card.setAttribute('data-tags', r.tags.join(' ').toLowerCase());
  card.setAttribute('data-title', r.title.toLowerCase());
  card.setAttribute('data-asset', r.asset.toLowerCase());

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-month">${r.month}</div>
      </div>
      <div class="card-rating">${ratingDots(r.ratingScore)}</div>
    </div>
    <span class="card-asset-class ${acClass}">${r.assetClass}</span>
    <div class="card-title">${r.title}</div>
    <div class="card-subtitle">${r.subtitle}</div>
    <div class="card-ticker">
      <span class="ticker-badge">${r.ticker}</span>
      <span class="ticker-price">${r.priceAtTime}</span>
    </div>
    <div class="card-footer">
      <span class="outcome-badge ${outClass}">${outLabel}</span>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="card-read-more">Read ›</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(r));
  return card;
}

function renderGrid() {
  grid.innerHTML = '';
  const q   = searchQuery.toLowerCase();
  const filtered = REPORTS.filter(r => {
    const classMatch = activeFilter === 'All' || r.assetClass === activeFilter || r.tags.includes(activeFilter);
    const searchMatch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.asset.toLowerCase().includes(q) ||
      r.ticker.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q));
    return classMatch && searchMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">◎</div>
        <div class="no-results-msg">No reports match your search.</div>
      </div>`;
    return;
  }

  filtered.forEach((r, i) => grid.appendChild(renderCard(r, i)));
  updateScoreboard(filtered);
}

/* ── Scoreboard ──────────────────────────────────────────── */
function updateScoreboard(list) {
  const counts = { exceeded: 0, 'on-track': 0, partial: 0, mixed: 0, 'in-progress': 0 };
  list.forEach(r => {
    const key = r.outcome === 'correct' ? 'exceeded' : r.outcome;
    if (counts[key] !== undefined) counts[key]++;
  });
  document.getElementById('score-exceeded').textContent  = counts.exceeded + counts.correct;
  document.getElementById('score-track').textContent     = counts['on-track'];
  document.getElementById('score-partial').textContent   = counts.partial;
  document.getElementById('score-mixed').textContent     = counts.mixed;
  document.getElementById('score-progress').textContent  = counts['in-progress'];
}

/* ── Modal ───────────────────────────────────────────────── */
function openModal(r) {
  const acClass  = CLASS_MAP[r.assetClass] || 'ac-equity';
  const outClass = r.outcome;
  const outLabel = OUTCOME_LABELS[r.outcome] || r.outcome;

  document.getElementById('modal-month-badge').textContent  = r.month;
  document.getElementById('modal-class-badge').className    = `card-asset-class ${acClass}`;
  document.getElementById('modal-class-badge').textContent  = r.assetClass;
  document.getElementById('modal-title').textContent        = r.title;
  document.getElementById('modal-subtitle').textContent     = r.subtitle;

  // Meta grid
  const metaFields = [
    { label: 'Asset',         value: r.asset,         cls: '' },
    { label: 'Ticker',        value: r.ticker,         cls: 'highlight' },
    { label: 'Price (Entry)', value: r.priceAtTime,    cls: '' },
    { label: 'Target',        value: r.targetPrice,    cls: 'up' },
    { label: 'Horizon',       value: r.timeHorizon,    cls: '' },
    { label: 'Rating',        value: r.rating,         cls: 'highlight' },
  ];

  document.getElementById('modal-meta').innerHTML = metaFields.map(f => `
    <div class="meta-item">
      <div class="meta-label">${f.label}</div>
      <div class="meta-value ${f.cls}">${f.value}</div>
    </div>
  `).join('');

  document.getElementById('modal-macro').textContent = r.macroContext;
  document.getElementById('modal-thesis').textContent = r.thesis;
  document.getElementById('modal-body-content').innerHTML = r.body;

  // Metrics
  document.getElementById('modal-metrics').innerHTML = r.keyMetrics.map(m => `
    <div class="metric-card">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
    </div>
  `).join('');

  // Technical Picture
  const ta = r.technicalAnalysis;
  const taEl = document.getElementById('modal-technical');
  if (ta) {
    const taRows = [
      { icon: '◈', label: 'Candlestick Pattern', value: ta.candlestick },
      { icon: '◉', label: 'RSI (14)',             value: ta.rsi14 },
      { icon: '◈', label: 'MACD',                 value: ta.macd },
      { icon: '◉', label: 'Moving Averages',       value: ta.movingAverages },
      { icon: '◈', label: 'Support / Resistance',  value: ta.levels },
      { icon: '◉', label: 'Volume Profile',        value: ta.volume },
      { icon: '◈', label: 'Positioning / Options', value: ta.positioning },
    ];
    taEl.innerHTML = taRows.map(row => `
      <div class="ta-row">
        <div class="ta-label"><span class="ta-icon">${row.icon}</span>${row.label}</div>
        <div class="ta-value">${row.value}</div>
      </div>
    `).join('');
  } else {
    taEl.innerHTML = '<p style="color:var(--text-3);font-size:13px;">Technical data not available for this report.</p>';
  }

  // Quarterly Data
  const qdEl = document.getElementById('modal-quarterly');
  if (r.quarterlyData && r.quarterlyData.length) {
    const first = r.quarterlyData[0];
    if (first.epsActual !== undefined) {
      qdEl.innerHTML = `
        <table class="earnings-table">
          <thead>
            <tr><th>Period</th><th>EPS Est</th><th>EPS Actual</th><th>Rev Est</th><th>Rev Actual</th><th>Result</th></tr>
          </thead>
          <tbody>
            ${r.quarterlyData.map(q => `
              <tr>
                <td class="period-cell">${q.period}</td>
                <td>${q.epsEstimate}</td>
                <td class="${q.epsBeat ? 'beat' : 'miss'}">${q.epsActual}</td>
                <td>${q.revenueEstimate}</td>
                <td class="${q.revenueBeat ? 'beat' : 'miss'}">${q.revenueActual}</td>
                <td><span class="beat-badge ${q.epsBeat ? 'beat' : 'miss'}">${q.epsBeat ? 'Beat' : 'Miss'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${r.quarterlyData[0].note ? `<p class="earnings-note">${r.quarterlyData[0].note}</p>` : ''}
      `;
    } else if (first.startPrice !== undefined) {
      qdEl.innerHTML = `
        <table class="earnings-table">
          <thead>
            <tr><th>Period</th><th>Start</th><th>End</th><th>Return</th><th>Key Driver</th></tr>
          </thead>
          <tbody>
            ${r.quarterlyData.map(q => `
              <tr>
                <td class="period-cell">${q.period}</td>
                <td>${q.startPrice}</td>
                <td>${q.endPrice}</td>
                <td class="${q.quarterReturn && q.quarterReturn.startsWith('+') ? 'beat' : 'miss'}">${q.quarterReturn}</td>
                <td>${q.keyDriver}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (first.returnVsSPY !== undefined) {
      qdEl.innerHTML = `
        <table class="earnings-table">
          <thead>
            <tr><th>Period</th><th>vs SPY</th><th>Constituents Beating</th><th>Key Driver</th></tr>
          </thead>
          <tbody>
            ${r.quarterlyData.map(q => `
              <tr>
                <td class="period-cell">${q.period}</td>
                <td class="${q.returnVsSPY && q.returnVsSPY.startsWith('+') ? 'beat' : 'miss'}">${q.returnVsSPY}</td>
                <td>${q.constituentsBeating || 'N/A'}</td>
                <td>${q.keyDriver}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      qdEl.innerHTML = `
        <div class="fi-quarters">
          ${r.quarterlyData.map(q => `
            <div class="fi-quarter-card">
              <div class="fi-quarter-label">${q.period}</div>
              <div class="fi-quarter-main">${q.yieldOrNII || q.fundsFromOperations || 'N/A'}</div>
              <div class="fi-quarter-return ${q.totalReturn && q.totalReturn.startsWith('+') ? 'beat' : 'miss'}">${q.totalReturn || ''}</div>
              <div class="fi-quarter-note">${q.note || ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } else {
    qdEl.innerHTML = '<p style="color:var(--text-3);font-size:13px;">Quarterly data not available.</p>';
  }

  // Wall Street Watching
  document.getElementById('modal-wsw').innerHTML = (r.wallStreetWatching || []).map(w => `
    <div class="wsw-card">
      <div class="wsw-metric">${w.metric}</div>
      <div class="wsw-value">${w.currentValue}</div>
      <div class="wsw-why">${w.why}</div>
    </div>
  `).join('');

  // Segment Revenue
  document.getElementById('modal-segments').innerHTML = (r.segmentRevenue || []).map(s => `
    <div class="segment-card">
      <div class="segment-header">
        <span class="segment-name">${s.segment}</span>
        <span class="segment-revenue">${s.revenue}</span>
        <span class="segment-growth ${s.revenueGrowth && s.revenueGrowth.startsWith('+') ? 'positive' : 'negative'}">${s.revenueGrowth}</span>
      </div>
      ${s.operatingMargin ? `<div class="segment-margin">Margin: ${s.operatingMargin}</div>` : ''}
      <div class="segment-guidance">${s.guidance}</div>
      ${s.analystView ? `<div class="segment-analyst">${s.analystView}</div>` : ''}
    </div>
  `).join('');

  // Recommended Play
  const rp = r.recommendedPlay;
  if (rp) {
    document.getElementById('modal-play').innerHTML = `
      <div class="play-header">
        <span class="play-action">${rp.action}</span>
        <span class="play-timeframe">${rp.timeframe}</span>
      </div>
      <div class="play-levels">
        <div class="play-level"><span class="play-level-label">Entry</span><span class="play-level-value">${rp.entry}</span></div>
        <div class="play-level"><span class="play-level-label">Target</span><span class="play-level-value target">${rp.target}</span></div>
        <div class="play-level"><span class="play-level-label">Stop</span><span class="play-level-value stop">${rp.stopLoss}</span></div>
        <div class="play-level"><span class="play-level-label">Size</span><span class="play-level-value">${rp.positionSize}</span></div>
      </div>
      <p class="play-justification">${rp.justification}</p>
      <div class="play-risk"><span class="play-risk-label">Key Risk:</span> ${rp.keyRisk}</div>
      ${rp.catalysts ? `<div class="play-catalysts"><span class="play-catalysts-label">Catalysts:</span> ${rp.catalysts.join(' · ')}</div>` : ''}
    `;
  }

  // Retrospective
  const retro = document.getElementById('modal-retro');
  retro.className = `retro-block ${outClass}`;
  document.getElementById('modal-retro-verdict').textContent = outLabel;
  document.getElementById('modal-retro-note').textContent    = r.outcomeNote;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Filter buttons ──────────────────────────────────────── */
function setupFilters() {
  const container = document.getElementById('filter-btns');
  const filters   = ['All', 'Equity', 'Commodity', 'Fixed Income', 'Real Estate', 'Cryptocurrency'];

  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${f === 'All' ? ' active' : ''}`;
    btn.textContent = f;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = f;
      renderGrid();
    });
    container.appendChild(btn);
  });
}

/* ── Search ──────────────────────────────────────────────── */
function setupSearch() {
  const input = document.getElementById('search-input');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQuery = input.value.trim();
      renderGrid();
    }, 180);
  });
}

/* ── Events ──────────────────────────────────────────────── */
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

document.getElementById('modal-close-btn').addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── Hero Stats Counter ──────────────────────────────────── */
function animateCount(el, target, duration = 1200) {
  const start = performance.now();
  const step  = ts => {
    const progress = Math.min((ts - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── Init ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  setupSearch();
  renderGrid();

  // Count hero stats
  const total    = REPORTS.length;
  const exceeded = REPORTS.filter(r => r.outcome === 'exceeded' || r.outcome === 'correct').length;
  const onTrack  = REPORTS.filter(r => r.outcome === 'on-track').length;
  const accuracy = Math.round(((exceeded + onTrack) / total) * 100);

  const obsOpts  = { threshold: 0.3 };
  const statsObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(document.getElementById('stat-reports'),  total,    1000);
        animateCount(document.getElementById('stat-accuracy'), accuracy, 1200);
        animateCount(document.getElementById('stat-months'),   total,    1000);
        statsObs.disconnect();
      }
    });
  }, obsOpts);

  const statsEl = document.querySelector('.hero-stats');
  if (statsEl) statsObs.observe(statsEl);
});
