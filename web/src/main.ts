import { store } from './state';
import { renderSidebar } from './components/sidebar';
import { renderTopbar } from './components/topbar';
import { renderMetrics } from './components/metrics';
import { renderChart } from './components/chart';
import { renderGauge } from './components/gauge';
import { renderTimer } from './components/timer';
import { renderTeam } from './components/team';
import { renderCases } from './components/cases';
import { renderDrawer } from './components/drawer';

function initApp() {
  const sidebarEl = document.getElementById('sidebar-mount');
  const topbarEl = document.getElementById('topbar-mount');
  const metricsEl = document.getElementById('metrics-mount');
  const chartEl = document.getElementById('chart-mount');
  const gaugeEl = document.getElementById('gauge-mount');
  const timerEl = document.getElementById('timer-mount');
  const teamEl = document.getElementById('team-mount');
  const casesEl = document.getElementById('cases-mount');
  const drawerEl = document.getElementById('drawer-mount');

  // Main render function triggered on any state update
  function render() {
    if (sidebarEl) renderSidebar(sidebarEl);
    if (topbarEl) renderTopbar(topbarEl);
    if (metricsEl) renderMetrics(metricsEl);
    if (chartEl) renderChart(chartEl);
    if (gaugeEl) renderGauge(gaugeEl);
    if (timerEl) renderTimer(timerEl);
    if (teamEl) renderTeam(teamEl);
    if (casesEl) renderCases(casesEl);
    if (drawerEl) renderDrawer(drawerEl);
  }

  // Subscribe to state changes
  store.subscribe(render);

  // Keyboard shortcut listener: ⌘ F / Ctrl+F focuses search, Escape closes drawer
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const input = document.getElementById('global-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }
    if (e.key === 'Escape') {
      if (store.drawerOpen) store.closeDrawer();
      if (store.sidebarOpen) store.toggleSidebar();
    }
  });

  // Action buttons in page header
  const refreshBtn = document.getElementById('header-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => store.loadCases());
  }

  const demoCasesBtn = document.getElementById('header-demo-cases-btn');
  if (demoCasesBtn) {
    demoCasesBtn.addEventListener('click', () => {
      store.cases = [...store.cases];
      store.loadCases();
      alert('Demo synthetic cases synchronized with live triage view.');
    });
  }

  // Initial render & data load
  render();
  store.loadCases();
}

// Boot application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

