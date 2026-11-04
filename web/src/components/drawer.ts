import { store } from '../state';
import { api } from '../api';
import type { SummaryCorrection } from '../types';

export function renderDrawer(element: HTMLElement) {
  const { currentDetail, drawerOpen } = store;

  element.className = `drawer-backdrop ${drawerOpen ? 'open' : ''}`;

  if (!currentDetail) {
    element.innerHTML = `
      <div class="drawer-panel">
        <div class="drawer-header">
          <div>
            <div class="drawer-session-lbl">Session Loading...</div>
            <h2 class="drawer-title">Patient Clinical Review</h2>
          </div>
          <button class="drawer-close" id="drawer-close-btn" title="Close (Esc)">✕</button>
        </div>
        <div class="drawer-body" style="display:flex;align-items:center;justify-content:center;">
          <div style="color:var(--text-muted);font-weight:600;">Loading intake record...</div>
        </div>
      </div>
    `;
    const closeBtn = element.querySelector('#drawer-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => store.closeDrawer());
    return;
  }

  const { session_id, system_summary, corrected_summary } = currentDetail;
  const base = corrected_summary || system_summary;
  const isUrgent = system_summary.urgent_flags && system_summary.urgent_flags.length > 0;

  element.innerHTML = `
    <div class="drawer-panel">
      <!-- Drawer Header -->
      <div class="drawer-header">
        <div>
          <div class="drawer-session-lbl">Session ID: <span>${session_id}</span></div>
          <h2 class="drawer-title">Patient Clinical Review & Audit</h2>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-secondary btn-sm" id="copy-ehr-btn" title="Copy EHR-formatted clinical note">
            📋 Copy EHR Note
          </button>
          <button class="drawer-close" id="drawer-close-btn" title="Close (Esc)">✕</button>
        </div>
      </div>

      <!-- Drawer Body -->
      <div class="drawer-body">
        <!-- Urgent Red Flag Banner if Flagged -->
        ${isUrgent ? `
          <div class="actionable-card danger" style="margin-bottom: 20px;">
            <div class="actionable-icon">⚠️</div>
            <div class="actionable-text">
              <div class="actionable-title">Emergency Red Flag Detected</div>
              <div class="actionable-meta">
                Matched red-flag symptoms: <strong>${system_summary.urgent_flags.map(f => f.label).join(', ')}</strong>. Immediate clinical escalation recommended.
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Side-by-Side QA Table -->
        <div class="drawer-section">
          <div class="section-title-row">
            <h3 class="section-heading">Original vs Machine-Translated Responses</h3>
            <span class="tech-pill">IndicTrans2 / IndicConformer</span>
          </div>
          <table class="qa-table">
            <thead>
              <tr>
                <th style="width: 32%;">Intake Question</th>
                <th style="width: 34%;">Patient Reported (Original)</th>
                <th style="width: 34%;">Machine Translation (English)</th>
              </tr>
            </thead>
            <tbody>
              ${(system_summary.responses || []).map(r => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-secondary);">${escapeHtml(r.question_en)}</div>
                    ${r.input_mode === 'voice' ? `
                      <span class="audio-badge">
                        🎤 Voice input ${r.transcript_confidence ? `(${Math.round(r.transcript_confidence * 100)}% conf)` : ''}
                      </span>
                    ` : ''}
                  </td>
                  <td style="color: var(--forest-900); font-weight: 600;">${escapeHtml(r.original_text || '—')}</td>
                  <td style="color: var(--text-primary); font-style: italic;">${escapeHtml(r.translated_text || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Editable Clinician Correction Form -->
        <div class="clinician-form-card">
          <h3 class="section-heading" style="margin-bottom: 14px;">Clinician Verified Summary Form</h3>

          <div class="form-group">
            <label class="form-label">Chief Health Concern</label>
            <textarea class="form-textarea" id="edit-main-concern" rows="2">${escapeHtml(base.main_concern || '')}</textarea>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Onset</label>
              <input type="text" class="form-input" id="edit-onset" value="${escapeHtml(base.onset || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Duration</label>
              <input type="text" class="form-input" id="edit-duration" value="${escapeHtml(base.duration || '')}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Self-Reported Severity (0-10)</label>
            <input type="text" class="form-input" id="edit-severity" value="${escapeHtml(base.severity || '')}" />
          </div>

          <div class="form-group">
            <label class="form-label">Reported Symptoms (One per line)</label>
            <textarea class="form-textarea" id="edit-symptoms" rows="3">${escapeHtml((base.reported_symptoms || []).join('\n'))}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Additional Context / Known Conditions</label>
            <textarea class="form-textarea" id="edit-additional-info" rows="2">${escapeHtml(base.additional_info || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Clinician Evaluation Notes & Triage Recommendation</label>
            <textarea
              class="form-textarea"
              id="edit-clinician-notes"
              rows="3"
              placeholder="Enter clinical assessment, differential impression, or follow-up plan..."
            >${escapeHtml(base.clinician_notes || (corrected_summary && corrected_summary.clinician_notes) || '')}</textarea>
          </div>
        </div>

        <!-- Audit & Safety Disclaimers -->
        <div class="drawer-section">
          <h4 class="audit-heading">Audit & Uncertainty Trace</h4>
          <ul class="audit-list">
            ${(system_summary.uncertainty_notes || []).map(note => `
              <li>${escapeHtml(note)}</li>
            `).join('')}
          </ul>
        </div>
      </div>

      <!-- Drawer Footer Actions -->
      <div class="drawer-footer">
        <button class="btn btn-secondary" id="drawer-cancel-btn">Cancel</button>
        <button class="btn btn-secondary save-btn" id="drawer-save-btn">Save Corrections</button>
        <button class="btn btn-primary" id="drawer-review-btn">Mark as Reviewed ✓</button>
      </div>
    </div>
  `;

  // Attach backdrop dismiss
  element.onclick = (e) => {
    if (e.target === element) store.closeDrawer();
  };

  // Attach close buttons
  element.querySelector('#drawer-close-btn')?.addEventListener('click', () => store.closeDrawer());
  element.querySelector('#drawer-cancel-btn')?.addEventListener('click', () => store.closeDrawer());

  // Copy EHR note
  element.querySelector('#copy-ehr-btn')?.addEventListener('click', () => {
    const ehrText = `--- NALAM CLINICAL INTAKE SUMMARY ---
Session ID: ${session_id}
Language: ${system_summary.language.toUpperCase()}
Chief Concern: ${base.main_concern}
Onset: ${base.onset}
Duration: ${base.duration}
Severity: ${base.severity}
Symptoms: ${(base.reported_symptoms || []).join(', ')}
Additional Info: ${base.additional_info}
Clinician Notes: ${base.clinician_notes || 'Pending clinician verification'}`;
    navigator.clipboard.writeText(ehrText).then(() => {
      alert('EHR clinical note copied to clipboard.');
    });
  });

  // Save corrections
  element.querySelector('#drawer-save-btn')?.addEventListener('click', async () => {
    const corrections: SummaryCorrection = {
      main_concern: (element.querySelector('#edit-main-concern') as HTMLTextAreaElement).value,
      onset: (element.querySelector('#edit-onset') as HTMLInputElement).value,
      duration: (element.querySelector('#edit-duration') as HTMLInputElement).value,
      severity: (element.querySelector('#edit-severity') as HTMLInputElement).value,
      reported_symptoms: (element.querySelector('#edit-symptoms') as HTMLTextAreaElement).value.split('\n').map(s => s.trim()).filter(Boolean),
      additional_info: (element.querySelector('#edit-additional-info') as HTMLTextAreaElement).value,
      clinician_notes: (element.querySelector('#edit-clinician-notes') as HTMLTextAreaElement).value
    };

    await api.saveCorrections(session_id, corrections);
    alert('Corrections saved successfully.');
    store.closeDrawer();
    store.loadCases();
  });

  // Mark reviewed
  element.querySelector('#drawer-review-btn')?.addEventListener('click', async () => {
    await api.markReviewed(session_id);
    alert('Case marked as clinically verified & reviewed.');
    store.closeDrawer();
    store.loadCases();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

