// ═══════════════════════━━━━━━━━━━━━━━━━━━
// AQE QC SYSTEM - THEME MANAGER
// ═══════════════════════━━━━━━━━━━━━━━━━━━

// Theme configuration
const themes = {
  dark: {
    name: 'Dark Theme',
    icon: '🌙',
    colors: {
      '--bg': '#050A12',
      '--bg2': '#080E1C',
      '--bg3': '#0C1426',
      '--bg4': '#111D30',
      '--border': 'rgba(255,255,255,0.06)',
      '--border2': 'rgba(255,255,255,0.1)',
      '--gold': '#C9A84E',
      '--gold-lt': '#E2CB82',
      '--primary': '#2563eb',
      '--primary-lt': '#3b82f6',
      '--green': '#22c55e',
      '--amber': '#f59e0b',
      '--red': '#ef4444',
      '--purple': '#9333ea',
      '--text': '#ffffff',
      '--text-secondary': '#b4b4b4',
      '--text-muted': '#6b7280',
      '--card-bg': '#0C1426',
      '--hover-bg': '#111D30',
      '--input-bg': '#080E1C'
    }
  },
 lightPro: {
  name: 'Clean Pro Premium',
  icon: '✨',

  colors: {
    /* Background System */
    '--bg': '#f4f7fb',
    '--bg2': '#ffffff',
    '--bg3': '#eef2f7',
    '--bg4': '#e2e8f0',

    /* Stronger Borders (important) */
    '--border': 'rgba(15,23,42,0.10)',
    '--border2': 'rgba(15,23,42,0.16)',

    /* Brand Colors */
    '--primary': '#2563eb',
    '--primary-lt': '#4f8cff',

    '--accent': '#06b6d4',
    '--accent-soft': '#67e8f9',

    '--success': '#16a34a',
    '--warning': '#f59e0b',
    '--error': '#ef4444',

    /* Typography */
    '--text': '#0f172a',
    '--text-secondary': '#334155',
    '--text-muted': '#64748b',

    /* Cards */
    '--card-bg': 'rgba(255,255,255,0.88)',
    '--card-hover': '#ffffff',

    /* Inputs */
    '--input-bg': '#ffffff',

    /* Premium Shadows */
    '--shadow': `
      0 10px 30px rgba(15,23,42,0.10),
      0 2px 8px rgba(15,23,42,0.05)
    `,

    '--shadow-soft': `
      0 2px 6px rgba(15,23,42,0.04)
    `,

    /* Extra Premium Effects */
    '--glass-border': 'rgba(255,255,255,0.7)',
    '--focus-ring': '0 0 0 4px rgba(37,99,235,0.15)',

    /* Radius */
    '--radius': '18px',
    '--radius-sm': '12px'
  }
},
  blue: {
    name: 'Blue Theme',
    icon: '🔵',
    colors: {
      '--bg': '#0f172a',
      '--bg2': '#1e293b',
      '--bg3': '#334155',
      '--bg4': '#475569',
      '--border': 'rgba(59,130,246,0.2)',
      '--border2': 'rgba(59,130,246,0.3)',
      '--gold': '#3b82f6',
      '--gold-lt': '#60a5fa',
      '--primary': '#3b82f6',
      '--primary-lt': '#60a5fa',
      '--green': '#22c55e',
      '--amber': '#f59e0b',
      '--red': '#ef4444',
      '--purple': '#9333ea',
      '--text': '#f8fafc',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--card-bg': '#1e293b',
      '--hover-bg': '#334155',
      '--input-bg': '#0f172a'
    }
  },
  purplePro: {
    name: 'Royal Purple Pro',
    icon: '🟣',
    colors: {
      '--bg': '#0f0a1f',              // deep dark (less strain)
      '--bg2': '#1a1333',             // layered background
      '--bg3': '#241a47',
      '--bg4': '#2e1065',

      '--border': 'rgba(168,85,247,0.15)',
      '--border2': 'rgba(168,85,247,0.25)',

      '--primary': '#a855f7',         // main purple
      '--primary-lt': '#c084fc',

      '--accent': '#22d3ee',          // 🔥 cyan accent (contrast)
      '--accent-soft': '#67e8f9',

      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',

      '--text': '#f8fafc',            // pure readable
      '--text-secondary': '#d1d5db',
      '--text-muted': '#9ca3af',

      '--card-bg': '#1a1333',
      '--card-hover': '#241a47',

      '--input-bg': '#0f0a1f',

      '--shadow': '0 10px 30px rgba(0,0,0,0.4)',
      '--glow': '0 0 20px rgba(168,85,247,0.35)'
    }
  },
  green: {
    name: 'Green Theme',
    icon: '🟢',
    colors: {
      '--bg': '#052e16',
      '--bg2': '#14532d',
      '--bg3': '#166534',
      '--bg4': '#15803d',
      '--border': 'rgba(34,197,94,0.2)',
      '--border2': 'rgba(34,197,94,0.3)',
      '--gold': '#22c55e',
      '--gold-lt': '#4ade80',
      '--primary': '#22c55e',
      '--primary-lt': '#4ade80',
      '--green': '#22c55e',
      '--amber': '#f59e0b',
      '--red': '#ef4444',
      '--purple': '#a855f7',
      '--text': '#f0fdf4',
      '--text-secondary': '#dcfce7',
      '--text-muted': '#bbf7d0',
      '--card-bg': '#14532d',
      '--hover-bg': '#166534',
      '--input-bg': '#052e16'
    }
  }
};

// Current theme state
let currentTheme = 'dark';

// Initialize theme manager
function initThemeManager() {
  console.log('🎨 Initializing theme manager...');
  
  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem('aqe-theme');
  if (savedTheme && themes[savedTheme]) {
    currentTheme = savedTheme;
  }
  
  // Apply current theme
  applyTheme(currentTheme);
  
  // Setup theme change listeners
  setupThemeListeners();
  
  console.log(`🎨 Theme initialized: ${themes[currentTheme].name}`);
}

// Apply theme
function applyTheme(themeName) {
  if (!themes[themeName]) {
    console.error(`❌ Theme "${themeName}" not found`);
    return;
  }
  
  const theme = themes[themeName];
  const root = document.documentElement;
  
  // Apply all color variables
  Object.entries(theme.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Update current theme
  currentTheme = themeName;
  
  // Save to localStorage
  localStorage.setItem('aqe-theme', themeName);
  
  // Update theme selector UI
  updateThemeSelector();
  
  console.log(`🎨 Applied theme: ${theme.name}`);
  showToast(`Theme changed to ${theme.name}`, 'success');
}

// Setup theme listeners
function setupThemeListeners() {
  // Add theme change event listeners
  document.addEventListener('click', function(e) {
    if (e.target.matches('[data-theme]')) {
      const themeName = e.target.dataset.theme;
      applyTheme(themeName);
    }
  });
}

// Update theme selector UI
function updateThemeSelector() {
  const themeButtons = document.querySelectorAll('[data-theme]');
  themeButtons.forEach(button => {
    const themeName = button.dataset.theme;
    const isActive = themeName === currentTheme;
    
    if (isActive) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Get available themes
function getAvailableThemes() {
  return Object.entries(themes).map(([key, theme]) => ({
    key,
    name: theme.name,
    icon: theme.icon,
    isActive: key === currentTheme
  }));
}

// Create theme selector buttons
function createThemeSelector() {
  const availableThemes = getAvailableThemes();
  
  return `
    <div class="theme-selector">
      ${availableThemes.map(theme => `
        <button class="theme-btn ${theme.isActive ? 'active' : ''}" 
                data-theme="${theme.key}" 
                onclick="applyTheme('${theme.key}')"
                title="${theme.name}">
          ${theme.icon}
        </button>
      `).join('')}
    </div>
  `;
}

// Toggle theme dropdown
function toggleThemeDropdown() {
  const dropdown = document.getElementById('theme-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close theme dropdown when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.theme-selector')) {
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }
});

// Export functions
window.initThemeManager = initThemeManager;
window.applyTheme = applyTheme;
window.getAvailableThemes = getAvailableThemes;
window.createThemeSelector = createThemeSelector;
window.toggleThemeDropdown = toggleThemeDropdown;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initThemeManager();
});
