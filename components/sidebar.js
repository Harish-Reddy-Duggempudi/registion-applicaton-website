// =============================================
// NEXORA — Sidebar & Navbar Component
// =============================================

function buildSidebar(activePage, basePath = '') {
  const user = getCurrentUser();
  const role = user?.role || 'student';

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
        <div class="sidebar-logo-mark">N</div>
        <div class="sidebar-logo-text">Nexora</div>
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
  const notifCount = DataStore.getNotifications(user?.uid || '').filter(n => !n.read).length;

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
        <!-- Search trigger -->
        <div class="navbar-action" title="Search" onclick="document.getElementById('global-search-modal')?.classList.add('open')">
          🔍
        </div>

        <!-- Notifications -->
        <div class="navbar-action" title="Notifications" onclick="openModal('notifications-modal')" style="position:relative">
          🔔
          ${notifCount > 0 ? `<div class="notif-dot"></div>` : ''}
        </div>

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

    <!-- Notifications Modal -->
    <div class="modal-overlay" id="notifications-modal">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <div class="modal-title">🔔 Notifications</div>
          <span class="modal-close" onclick="closeModal('notifications-modal')">✕</span>
        </div>
        ${DataStore.getNotifications(user?.uid || '').map(n => `
          <div class="activity-item">
            <div class="activity-icon-wrap" style="background:rgba(168,85,247,0.1)">
              ${n.type==='event'?'🎯':n.type==='community'?'🌐':n.type==='registration'?'🎫':'💬'}
            </div>
            <div class="activity-body">
              <div class="activity-title" style="${!n.read?'font-weight:700':''}">${n.title}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${n.message}</div>
              <div class="activity-time">${n.time}</div>
            </div>
            ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--purple-500);flex-shrink:0"></div>` : ''}
          </div>`).join('')}
        <button class="btn btn-ghost btn-sm w-full mt-3" onclick="toast.info('Marked read','All notifications cleared');closeModal('notifications-modal')">
          Mark all as read
        </button>
      </div>
    </div>
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
