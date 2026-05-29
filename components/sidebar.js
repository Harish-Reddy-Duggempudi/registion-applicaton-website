// =============================================
// NEXOVERSE — Sidebar & Navbar Component
// =============================================

function buildSidebar(activePage, basePath = '') {
  const user = getCurrentUser();
  const role = user?.role || 'member';

  const navItems = [
    { icon:'⊞',  label:'Dashboard',    href:`${basePath}dashboard.html`,          page:'dashboard' },
    { icon:'🌐', label:'Communities',   href:`${basePath}pages/communities.html`,  page:'communities' },
    { icon:'🎯', label:'Events',        href:`${basePath}pages/events.html`,       page:'events' },
    { icon:'🎫', label:'Registrations', href:`${basePath}pages/registrations.html`,page:'registrations' },
    { icon:'📊', label:'Analytics',     href:`${basePath}pages/analytics.html`,    page:'analytics' },
    { icon:'🤖', label:'AI Tools',      href:`${basePath}pages/ai-tools.html`,     page:'ai-tools' },
  ];

  const adminItems = role === 'admin' ? [
    { icon:'🛡️', label:'Admin Panel', href:`${basePath}pages/admin-panel.html`, page:'admin-panel' },
  ] : [];

  const bottomItems = [
    { icon:'⚙️', label:'Settings', href:`${basePath}pages/settings.html`, page:'settings' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>`).join('');

  const adminHTML = adminItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>`).join('');

  const avatarInitials = user?.avatar || user?.name?.charAt(0) || 'U';

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <img class="sidebar-logo-image" src="${basePath}assets/logos/logo-placeholder.svg" alt="NEXOVERSE logo placeholder" />
        <div class="sidebar-logo-copy">
          <div class="sidebar-logo-text">NEXOVERSE</div>
          <div class="sidebar-logo-subtitle">The Member Ecosystem Platform</div>
        </div>
      </div>

      <div class="role-badge ${role}" data-user-role>${role.toUpperCase()}</div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        ${navHTML}

        ${adminHTML ? `<div class="nav-section-label" style="margin-top:8px">Admin</div>${adminHTML}` : ''}

        <div class="nav-section-label" style="margin-top:8px">Account</div>
        ${bottomItems.map(item => `
          <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>`).join('')}

        <div class="nav-item" onclick="logoutUser()" style="margin-top:4px">
          <span class="nav-icon">🚪</span>
          <span>Logout</span>
        </div>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-user" onclick="window.location='${basePath}pages/settings.html'">
          <div class="avatar avatar-sm" data-user-avatar>${avatarInitials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" data-user-name>${user?.name || 'User'}</div>
            <div class="sidebar-user-role">${role.charAt(0).toUpperCase()+role.slice(1)}</div>
          </div>
          <span style="color:var(--text-muted);font-size:12px">⚙️</span>
        </div>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

function buildNavbar(pageTitle, basePath = '') {
  const user = getCurrentUser();
  const avatarInitials = user?.avatar || user?.name?.charAt(0) || 'U';
  const notifCount = (typeof DataStore !== 'undefined' && DataStore?.getNotifications)
    ? DataStore.getNotifications(user?.uid || '').filter(n => !n.read).length
    : 0;

  return `
    <nav class="navbar" id="navbar">
      <div class="navbar-left">
        <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle sidebar">
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
        </button>
        <div class="navbar-title">${pageTitle}</div>
      </div>

      <div class="navbar-right">
        <!-- Search trigger removed -->

        <!-- Notifications removed -->

        <!-- Profile Dropdown -->
        <div class="profile-dropdown-wrap" id="profile-dropdown-wrap">
          <div class="profile-trigger" id="profile-trigger">
            <div class="avatar avatar-sm" data-user-avatar style="background:var(--gradient-primary)">${avatarInitials}</div>
            <span class="text-sm font-semibold" data-user-name style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user?.name || 'User'}</span>
            <span class="profile-chevron">▾</span>
          </div>
          <div class="profile-dropdown" id="profile-dropdown">
            <div class="dropdown-header">
              <div class="dropdown-name" data-user-name>${user?.name || 'User'}</div>
              <div class="dropdown-email" data-user-email>${user?.email || ''}</div>
            </div>
            <a href="${basePath}pages/settings.html" class="dropdown-item">⚙️ Settings</a>
            <a href="${basePath}pages/analytics.html" class="dropdown-item">📊 My Analytics</a>
            <a href="${basePath}pages/registrations.html" class="dropdown-item">🎫 Registrations</a>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="logoutUser()">🚪 Logout</div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Notifications modal removed -->
  `;
}

// Inject sidebar + navbar into dashboard pages
function initDashboardLayout(options = {}) {
  const {
    activePage = '',
    pageTitle  = 'Dashboard',
    basePath   = '',
  } = options;

  const sidebarContainer = document.getElementById('sidebar-container');
  const navbarContainer  = document.getElementById('navbar-container');

  if (sidebarContainer) sidebarContainer.innerHTML = buildSidebar(activePage, basePath);
  if (navbarContainer)  navbarContainer.innerHTML  = buildNavbar(pageTitle, basePath);

  // Re-init after injection
  initProfileDropdown();
  initMobileSidebar();
  populateUserInfo();
}
