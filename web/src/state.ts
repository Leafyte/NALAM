import type { DashboardMetrics, DetailCase, IntakeCase, TriageFilter } from './types';
import { api } from './api';
import { SYNTHETIC_CASES } from './mockData';

type Listener = () => void;

class StateStore {
  private listeners: Set<Listener> = new Set();

  cases: IntakeCase[] = [...SYNTHETIC_CASES];
  currentDetail: DetailCase | null = null;
  filter: TriageFilter = 'all';
  searchQuery = '';
  selectedLang: string | null = null;
  drawerOpen = false;

  // Stopwatch state
  timerSeconds = 18 * 60 + 42;
  isTimerRunning = true;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Mobile sidebar state
  sidebarOpen = false;

  constructor() {
    this.startTimer();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  get metrics(): DashboardMetrics {
    const total = this.cases.length;
    const urgent = this.cases.filter(c => c.urgent).length;
    const reviewed = this.cases.filter(c => c.status === 'reviewed').length;
    const pending = total - reviewed;
    const rate = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    return {
      activeCases: total,
      urgentCases: urgent,
      translationParity: '98.4%',
      avgTriageTime: '3.8 min',
      verifiedCount: reviewed,
      pendingCount: pending,
      escalatedCount: urgent,
      completionRate: rate
    };
  }

  get filteredCases(): IntakeCase[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.cases.filter(item => {
      // Status filter
      if (this.filter === 'urgent' && !item.urgent) return false;
      if (this.filter === 'pending' && item.status !== 'pending_review') return false;
      if (this.filter === 'reviewed' && item.status !== 'reviewed') return false;

      // Language filter
      if (this.selectedLang && item.language !== this.selectedLang) return false;

      // Search query
      if (q) {
        const haystack = `${item.session_id} ${item.main_concern} ${item.language}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }

  async loadCases() {
    const items = await api.listSummaries(this.filter, this.searchQuery);
    this.cases = items;
    this.notify();
  }

  setFilter(filter: TriageFilter) {
    this.filter = filter;
    this.notify();
  }

  setSearchQuery(q: string) {
    this.searchQuery = q;
    this.notify();
  }

  setSelectedLang(lang: string | null) {
    this.selectedLang = lang;
    this.notify();
  }

  async openCase(sessionId: string) {
    this.drawerOpen = true;
    this.notify();
    const detail = await api.getSummaryDetail(sessionId);
    this.currentDetail = detail;
    this.notify();
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.notify();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.notify();
  }

  // Timer controls
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.notify();
    }, 1000);
  }

  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
    this.notify();
  }

  toggleTimer() {
    if (this.isTimerRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  resetTimer() {
    this.timerSeconds = 0;
    this.notify();
  }
}

export const store = new StateStore();

