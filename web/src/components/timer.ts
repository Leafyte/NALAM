import { store } from '../state';

export function renderTimer(element: HTMLElement) {
  const { timerSeconds, isTimerRunning } = store;

  const hrs = Math.floor(timerSeconds / 3600);
  const mins = Math.floor((timerSeconds % 3600) / 60);
  const secs = timerSeconds % 60;
  const formattedTime = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  element.innerHTML = `
    <div class="timer-widget-card" id="timer-section">
      <div class="wave-bg-overlay"></div>
      <div class="timer-card-tag">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        ${isTimerRunning ? 'Active Triage Shift' : 'Shift Paused'}
      </div>
      <div class="timer-digital-display">${formattedTime}</div>
      <div class="timer-meta-desc">Current Clinician Session Latency. Track patient consultation duration & voice intake review.</div>
      <div class="timer-controls">
        <!-- Play / Pause Button -->
        <button class="circle-btn primary" id="timer-toggle-btn" title="${isTimerRunning ? 'Pause timer' : 'Start timer'}">
          ${isTimerRunning
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'}
        </button>

        <!-- Reset Button -->
        <button class="circle-btn secondary" id="timer-reset-btn" title="Reset stopwatch">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>

        <!-- Audio Review Speaker Control -->
        <button class="circle-btn secondary" id="timer-audio-btn" title="Audio Verification Channel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Attach controls
  const toggleBtn = element.querySelector('#timer-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => store.toggleTimer());
  }

  const resetBtn = element.querySelector('#timer-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => store.resetTimer());
  }

  const audioBtn = element.querySelector('#timer-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      alert('Audio Verification Stream: Direct voice playback enabled for uploaded .m4a and .wav patient audio recordings.');
    });
  }
}

