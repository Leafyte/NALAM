import { store } from '../state';

export function renderMetrics(element: HTMLElement) {
  const { metrics } = store;

  element.className = 'metrics-grid';
  element.innerHTML = `
    <!-- Metric Card 1: Solid Dark Primary Accent Card -->
    <div class="metric-card dark-accent">
      <div class="metric-header">
        <span class="metric-label">Active Triage Cases</span>
        <div class="metric-icon-slot">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>
      </div>
      <div class="metric-num">${metrics.activeCases}</div>
      <div class="metric-footer">
        <span class="trend-badge positive">↑ 18% vs yesterday</span>
        <span class="metric-subtext" style="color: var(--mint-200);">Multilingual queue</span>
      </div>
    </div>

    <!-- Metric Card 2: Clean White Card (Urgent Alerts) -->
    <div class="metric-card white-card danger-card">
      <div class="metric-header">
        <span class="metric-label">Urgent Red Flags</span>
        <div class="metric-icon-slot">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"></path>
          </svg>
        </div>
      </div>
      <div class="metric-num">${metrics.urgentCases}</div>
      <div class="metric-footer">
        <span class="trend-badge danger">⚠ Immediate Action</span>
        <span class="metric-subtext">Critical priority</span>
      </div>
    </div>

    <!-- Metric Card 3: Clean White Card (AI Translation Quality) -->
    <div class="metric-card white-card">
      <div class="metric-header">
        <span class="metric-label">Translation Parity</span>
        <div class="metric-icon-slot">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
          </svg>
        </div>
      </div>
      <div class="metric-num">${metrics.translationParity}</div>
      <div class="metric-footer">
        <span class="trend-badge positive">✓ IndicTrans2</span>
        <span class="metric-subtext">KN / HI / TA parity</span>
      </div>
    </div>

    <!-- Metric Card 4: Clean White Card (Avg Triage Latency) -->
    <div class="metric-card white-card">
      <div class="metric-header">
        <span class="metric-label">Avg Triage Time</span>
        <div class="metric-icon-slot">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
      </div>
      <div class="metric-num">${metrics.avgTriageTime}</div>
      <div class="metric-footer">
        <span class="trend-badge positive">↓ 42s faster</span>
        <span class="metric-subtext">Target: &lt; 5 min</span>
      </div>
    </div>
  `;
}

