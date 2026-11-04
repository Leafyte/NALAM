import { store } from '../state';

export function renderGauge(element: HTMLElement) {
  const { metrics } = store;

  // Calculate arc geometry for semi-circle
  // A semi-circle from (20, 100) to (180, 100) with radius 80
  // Total arc length = π * 80 ≈ 251.3
  const totalLength = Math.PI * 80;
  const clampedRate = Math.min(Math.max(metrics.completionRate, 0), 100);
  const strokeDashoffset = totalLength * (1 - clampedRate / 100);

  element.innerHTML = `
    <div class="card gauge-card">
      <div class="card-title-group" style="width: 100%; text-align: left;">
        <h2 class="card-title">Triage Review Progress</h2>
        <p class="card-subtitle">Daily intake completion & clinical verification rate</p>
      </div>

      <!-- Semi-Circular Arc SVG Gauge -->
      <div class="gauge-svg-box">
        <svg width="220" height="130" viewBox="0 0 200 120">
          <defs>
            <linearGradient id="mint-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#064E3B" />
              <stop offset="100%" stop-color="#34D399" />
            </linearGradient>
          </defs>
          <!-- Background Track Arc -->
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#E2E8F0"
            stroke-width="16"
            stroke-linecap="round"
          />
          <!-- Animated Value Arc -->
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#mint-gauge-grad)"
            stroke-width="16"
            stroke-linecap="round"
            stroke-dasharray="${totalLength}"
            stroke-dashoffset="${strokeDashoffset}"
            style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);"
          />
        </svg>
        <div class="gauge-center-text">
          <div class="gauge-percentage">${clampedRate}%</div>
          <div class="gauge-label">Completed</div>
        </div>
      </div>

      <!-- Segmented Status Legends -->
      <div class="gauge-legend-grid">
        <div class="gauge-stat-box">
          <div class="gauge-stat-val" style="color: var(--forest-800);">${metrics.verifiedCount}</div>
          <div class="gauge-stat-lbl">Verified</div>
        </div>
        <div class="gauge-stat-box">
          <div class="gauge-stat-val" style="color: var(--warning);">${metrics.pendingCount}</div>
          <div class="gauge-stat-lbl">Pending</div>
        </div>
        <div class="gauge-stat-box">
          <div class="gauge-stat-val" style="color: var(--danger);">${metrics.escalatedCount}</div>
          <div class="gauge-stat-lbl">Escalated</div>
        </div>
      </div>
    </div>
  `;
}

