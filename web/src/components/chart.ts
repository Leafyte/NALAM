import { store } from '../state';

export function renderChart(element: HTMLElement) {
  const { cases } = store;

  // Compute language distribution dynamically
  const counts: Record<string, number> = { en: 0, kn: 0, hi: 0, ta: 0 };
  cases.forEach(c => {
    if (counts[c.language] !== undefined) counts[c.language]++;
    else counts.en++;
  });

  const maxVal = Math.max(...Object.values(counts), 10);
  const chartHeight = 120;
  const getY = (val: number) => Math.round(150 - (val / maxVal) * chartHeight);
  const getH = (val: number) => Math.max(Math.round((val / maxVal) * chartHeight), 4);

  element.innerHTML = `
    <div class="card" id="distribution-section">
      <div class="card-header">
        <div class="card-title-group">
          <h2 class="card-title">Intake Volume by Language</h2>
          <p class="card-subtitle">Categorical distribution across English, Kannada, Hindi & Tamil patient self-reports</p>
        </div>
        <span class="nav-badge mint">AI4Bharat Active</span>
      </div>

      <!-- SVG Bar Chart with Pattern Fill -->
      <div class="chart-container">
        <svg class="chart-svg" viewBox="0 0 540 180" preserveAspectRatio="none">
          <defs>
            <!-- Patterned / Striped fill definition -->
            <pattern id="stripe-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#34D399" stroke-width="4" />
              <line x1="4" y1="0" x2="4" y2="8" stroke="#064E3B" stroke-width="4" />
            </pattern>
          </defs>

          <!-- Grid Guide Lines -->
          <line x1="40" y1="30" x2="520" y2="30" stroke="#E2E8F0" stroke-dasharray="3 3"/>
          <line x1="40" y1="75" x2="520" y2="75" stroke="#E2E8F0" stroke-dasharray="3 3"/>
          <line x1="40" y1="120" x2="520" y2="120" stroke="#E2E8F0" stroke-dasharray="3 3"/>
          <line x1="40" y1="150" x2="520" y2="150" stroke="#CBD5E1" stroke-width="1.5"/>

          <!-- Category Axis Y Labels -->
          <text x="30" y="34" font-size="10" fill="#94A3B8" text-anchor="end">${maxVal}</text>
          <text x="30" y="79" font-size="10" fill="#94A3B8" text-anchor="end">${Math.round(maxVal / 2)}</text>
          <text x="30" y="154" font-size="10" fill="#94A3B8" text-anchor="end">0</text>

          <!-- Bar 1: English (Solid Forest Green) -->
          <rect
            class="interactive-bar"
            data-lang="en"
            x="70"
            y="${getY(counts.en)}"
            width="60"
            height="${getH(counts.en)}"
            rx="6"
            fill="#064E3B"
          >
            <title>English: ${counts.en} cases</title>
          </rect>
          <text x="100" y="170" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">English (EN)</text>
          <text x="100" y="${getY(counts.en) - 8}" font-size="12" font-weight="800" fill="#064E3B" text-anchor="middle">${counts.en}</text>

          <!-- Bar 2: Kannada (Patterned / Striped Mint-Forest) -->
          <rect
            class="interactive-bar"
            data-lang="kn"
            x="190"
            y="${getY(counts.kn)}"
            width="60"
            height="${getH(counts.kn)}"
            rx="6"
            fill="url(#stripe-pattern)"
            stroke="#064E3B"
            stroke-width="1"
          >
            <title>Kannada: ${counts.kn} cases</title>
          </rect>
          <text x="220" y="170" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">ಕನ್ನಡ (KN)</text>
          <text x="220" y="${getY(counts.kn) - 8}" font-size="12" font-weight="800" fill="#064E3B" text-anchor="middle">${counts.kn}</text>

          <!-- Bar 3: Hindi (Solid Vibrant Mint) -->
          <rect
            class="interactive-bar"
            data-lang="hi"
            x="310"
            y="${getY(counts.hi)}"
            width="60"
            height="${getH(counts.hi)}"
            rx="6"
            fill="#10B981"
          >
            <title>Hindi: ${counts.hi} cases</title>
          </rect>
          <text x="340" y="170" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">हिन्दी (HI)</text>
          <text x="340" y="${getY(counts.hi) - 8}" font-size="12" font-weight="800" fill="#059669" text-anchor="middle">${counts.hi}</text>

          <!-- Bar 4: Tamil (Patterned / Striped Mint-Forest) -->
          <rect
            class="interactive-bar"
            data-lang="ta"
            x="430"
            y="${getY(counts.ta)}"
            width="60"
            height="${getH(counts.ta)}"
            rx="6"
            fill="url(#stripe-pattern)"
            stroke="#064E3B"
            stroke-width="1"
          >
            <title>Tamil: ${counts.ta} cases</title>
          </rect>
          <text x="460" y="170" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">தமிழ் (TA)</text>
          <text x="460" y="${getY(counts.ta) - 8}" font-size="12" font-weight="800" fill="#064E3B" text-anchor="middle">${counts.ta}</text>
        </svg>
      </div>

      <!-- Chart Legend & Filter Reset -->
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-swatch solid"></span>
          <span>Solid Bar: Direct Native Entry</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch striped"></span>
          <span>Striped Bar: Neural AI Translation (IndicTrans2)</span>
        </div>
      </div>
    </div>
  `;

  // Clicking a bar toggles a language filter
  element.querySelectorAll<SVGRectElement>('.interactive-bar').forEach(rect => {
    rect.style.cursor = 'pointer';
    rect.addEventListener('click', () => {
      const lang = rect.getAttribute('data-lang');
      if (lang) {
        store.setSelectedLang(store.selectedLang === lang ? null : lang);
      }
    });
  });
}

