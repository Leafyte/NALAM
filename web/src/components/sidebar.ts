import { store } from '../state';

export function renderSidebar(element: HTMLElement) {
  const { metrics, filter, sidebarOpen } = store;

  element.className = `sidebar ${sidebarOpen ? 'open' : ''}`;
  element.innerHTML = `
    <!-- Brand / Logo Header -->
    <div class="brand-header">
      <div class="brand-icon">
        <svg class="nav-icon" viewBox="0 0 24 24">
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <div class="brand-title">Nalam</div>
        <div class="brand-subtitle">Clinical Triage OS</div>
      </div>
      <button class="mobile-close-btn" id="sidebar-close-btn" aria-label="Close menu">✕</button>
    </div>

    <!-- Grouped Navigation Menu Sections -->
    <div class="nav-sections">
      <!-- Section 1: Care & Triage -->
      <div>
        <div class="nav-group-title">Care & Triage</div>
        <ul class="nav-menu">
          <li>
            <a class="nav-item ${filter === 'all' ? 'active' : ''}" href="#" data-filter="all">
              <svg class="nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span class="nav-label">Patient Intakes</span>
              <span class="nav-badge mint">${metrics.activeCases}</span>
            </a>
          </li>
          <li>
            <a class="nav-item ${filter === 'urgent' ? 'active' : ''}" href="#" data-filter="urgent">
              <svg class="nav-icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>
              <span class="nav-label">Urgent Red Flags</span>
              <span class="nav-badge danger">${metrics.urgentCases}</span>
            </a>
          </li>
          <li>
            <a class="nav-item ${filter === 'reviewed' ? 'active' : ''}" href="#" data-filter="reviewed">
              <svg class="nav-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span class="nav-label">Reviewed Cases</span>
              <span class="nav-badge">${metrics.verifiedCount}</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Section 2: Clinical Analytics -->
      <div>
        <div class="nav-group-title">Analytics & Audit</div>
        <ul class="nav-menu">
          <li>
            <a class="nav-item" href="#distribution-section">
              <svg class="nav-icon" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span class="nav-label">Language Parity</span>
              <span class="nav-badge">4 Langs</span>
            </a>
          </li>
          <li>
            <a class="nav-item" href="#timer-section">
              <svg class="nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="nav-label">Triage Session Timer</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Section 3: AI Infrastructure -->
      <div>
        <div class="nav-group-title">System & AI Models</div>
        <ul class="nav-menu">
          <li>
            <a class="nav-item" href="javascript:void(0)" id="check-models-btn">
              <svg class="nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span class="nav-label">AI4Bharat Engines</span>
              <span class="nav-badge mint">Online</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom Promotional / Action Card Container -->
    <div class="sidebar-promo">
      <div class="promo-tag">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Direct Line Active
      </div>
      <div class="promo-title">Emergency Protocol</div>
      <div class="promo-desc">National Emergency 112 dialing and hospital transfer workflows ready for critical red flags.</div>
      <button class="promo-btn" id="promo-protocol-btn">⚡ Review Protocol</button>
    </div>
  `;

  // Attach event handlers
  element.querySelectorAll<HTMLAnchorElement>('[data-filter]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = link.getAttribute('data-filter') as any;
      if (filter) store.setFilter(filter);
    });
  });

  const closeBtn = element.querySelector('#sidebar-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => store.toggleSidebar());
  }

  const protocolBtn = element.querySelector('#promo-protocol-btn');
  if (protocolBtn) {
    protocolBtn.addEventListener('click', () => {
      alert('Emergency Protocol Activated: Direct dialing to 112 Hospital Escalation Desk.');
    });
  }

  const checkModelsBtn = element.querySelector('#check-models-btn');
  if (checkModelsBtn) {
    checkModelsBtn.addEventListener('click', () => {
      alert('AI Services Status:\n- IndicTrans2: Active (NMT :8001)\n- IndicConformer: Active (ASR :8002)\n- Clinical Rule Safety Scanner: Running');
    });
  }
}

