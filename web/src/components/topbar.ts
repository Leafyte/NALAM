import { store } from '../state';

export function renderTopbar(element: HTMLElement) {
  const { metrics, searchQuery } = store;

  element.className = 'top-navbar';
  element.innerHTML = `
    <!-- Mobile Hamburger Toggle Button -->
    <button class="mobile-menu-btn" id="mobile-toggle-btn" aria-label="Toggle navigation">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>

    <!-- Global Search Input Container with Keyboard Shortcut Badge -->
    <div class="search-container">
      <svg class="search-icon" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        class="search-input"
        id="global-search-input"
        placeholder="Search complaint, symptoms, or language..."
        value="${escapeHtml(searchQuery)}"
      />
      <kbd class="kbd-badge">⌘ F</kbd>
    </div>

    <!-- Right Utility Actions & User Profile Block -->
    <div class="nav-utilities">
      <!-- Urgent Red Flag Alert Button -->
      <button class="util-icon-btn ${metrics.urgentCases > 0 ? 'has-urgent' : ''}" id="topbar-urgent-btn" title="View Urgent Cases (${metrics.urgentCases})">
        <svg class="nav-icon" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"></path>
        </svg>
        ${metrics.urgentCases > 0 ? '<span class="util-badge-dot danger-dot"></span>' : ''}
      </button>

      <!-- System Engine Status Button -->
      <button class="util-icon-btn" id="topbar-status-btn" title="AI Model Status">
        <svg class="nav-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4M12 8h.01"></path>
        </svg>
        <span class="util-badge-dot mint"></span>
      </button>

      <!-- User Profile Avatar / Credential Block -->
      <div class="user-profile-block">
        <div class="user-avatar">AR</div>
        <div class="user-info">
          <div class="user-name">Dr. Ananya Rao, MD</div>
          <div class="user-credential">Attending Triage Lead</div>
        </div>
      </div>
    </div>
  `;

  // Search input binding
  const searchInput = element.querySelector<HTMLInputElement>('#global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      store.setSearchQuery(val);
    });
  }

  // Mobile menu button
  const mobileToggle = element.querySelector('#mobile-toggle-btn');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      store.toggleSidebar();
    });
  }

  // Urgent notification button
  const urgentBtn = element.querySelector('#topbar-urgent-btn');
  if (urgentBtn) {
    urgentBtn.addEventListener('click', () => {
      store.setFilter('urgent');
    });
  }

  // Status button
  const statusBtn = element.querySelector('#topbar-status-btn');
  if (statusBtn) {
    statusBtn.addEventListener('click', () => {
      alert('Nalam System Engines:\n• IndicTrans2 NMT: Online\n• IndicConformer ASR: Online\n• SQLite Database: WAL mode healthy');
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

