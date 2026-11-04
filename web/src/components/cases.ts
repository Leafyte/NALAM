import { store } from '../state';
import type { IntakeCase, LanguageCode } from '../types';

export function renderCases(element: HTMLElement) {
  const { filteredCases, filter, selectedLang } = store;

  const langNames: Record<LanguageCode, string> = {
    kn: 'Kannada (KN)',
    hi: 'Hindi (HI)',
    ta: 'Tamil (TA)',
    en: 'English (EN)'
  };

  element.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title-group">
          <h2 class="card-title">Patient Intake Submissions</h2>
          <p class="card-subtitle">Select any report to inspect machine translation and verify clinical details</p>
        </div>
        <div class="list-tabs">
          <button class="list-tab-btn ${filter === 'all' ? 'active' : ''}" data-tab="all">All Intakes</button>
          <button class="list-tab-btn ${filter === 'urgent' ? 'active' : ''}" data-tab="urgent">Urgent Only</button>
          <button class="list-tab-btn ${filter === 'pending' ? 'active' : ''}" data-tab="pending">Pending</button>
          <button class="list-tab-btn ${filter === 'reviewed' ? 'active' : ''}" data-tab="reviewed">Reviewed</button>
        </div>
      </div>

      ${selectedLang ? `
        <div class="active-filter-banner">
          <span>Filtering by language: <strong>${langNames[selectedLang] || selectedLang.toUpperCase()}</strong></span>
          <button class="clear-filter-btn" id="clear-lang-filter">Clear filter ✕</button>
        </div>
      ` : ''}

      <div class="case-list" id="case-list-container">
        ${filteredCases.length === 0 ? `
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <p>No clinical intake records matching the current filters.</p>
          </div>
        ` : filteredCases.map(item => renderCaseRow(item, langNames)).join('')}
      </div>
    </div>
  `;

  // Attach tab switchers
  element.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab') as any;
      if (tab) store.setFilter(tab);
    });
  });

  // Attach clear language filter
  const clearBtn = element.querySelector('#clear-lang-filter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => store.setSelectedLang(null));
  }

  // Attach row clicks
  element.querySelectorAll<HTMLElement>('[data-session]').forEach(row => {
    row.addEventListener('click', () => {
      const sid = row.getAttribute('data-session');
      if (sid) store.openCase(sid);
    });
  });
}

function renderCaseRow(item: IntakeCase, langNames: Record<LanguageCode, string>): string {
  const isUrgent = item.urgent;
  const langDisplay = langNames[item.language] || item.language.toUpperCase();

  return `
    <div class="case-row ${isUrgent ? 'urgent-border' : ''}" data-session="${item.session_id}">
      <div class="case-icon-container ${isUrgent ? 'urgent' : ''}">
        ${isUrgent ? '⚠️' : '🩺'}
      </div>
      <div class="case-content">
        <div class="case-title ${isUrgent ? 'urgent' : ''}">
          ${isUrgent ? '<span class="urgent-tag">[URGENT RED FLAG]</span> ' : ''}${escapeHtml(item.main_concern)}
        </div>
        <div class="case-metadata">
          <span class="case-pill lang-${item.language}">${langDisplay}</span>
          <span>⏱ ${timeAgo(item.submitted_at)}</span>
          <span class="case-pill status-${item.status}">${item.status.replace('_', ' ')}</span>
          <span class="case-id">#${item.session_id.slice(0, 14)}</span>
        </div>
      </div>
      <button class="case-action-btn" aria-label="Inspect report">
        Inspect Report →
      </button>
    </div>
  `;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return new Date(iso).toLocaleDateString();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

