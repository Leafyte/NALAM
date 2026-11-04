import { INITIAL_TEAM_MEMBERS } from '../mockData';

export function renderTeam(element: HTMLElement) {
  element.innerHTML = `
    <div class="card team-card">
      <div class="card-header">
        <div class="card-title-group">
          <h2 class="card-title">Clinical Duty Staff</h2>
          <p class="card-subtitle">On-call triage & consultation team</p>
        </div>
      </div>
      <div class="team-list">
        ${INITIAL_TEAM_MEMBERS.map(member => `
          <div class="team-member-row">
            <div class="member-avatar">${member.initials}</div>
            <div class="member-info">
              <div class="member-name">${member.name}</div>
              <div class="member-role">${member.role}</div>
            </div>
            <span class="status-pill ${member.status}">${member.statusLabel}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

