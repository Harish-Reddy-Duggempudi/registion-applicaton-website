// =============================================
// NEXOVERSE — Dashboard Module
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  (async () => {
    if (DataStore?.loadEventsFromFirestore) {
      try {
        await DataStore.loadEventsFromFirestore();
      } catch (error) {
        console.warn('Dashboard event sync failed', error);
      }
    }
    if (DataStore?.loadCommunitiesFromFirestore) {
      try {
        await DataStore.loadCommunitiesFromFirestore();
      } catch (error) {
        console.warn('Dashboard community sync failed', error);
      }
    }
    if (DataStore?.loadRegistrationsFromFirestore) {
      try {
        await DataStore.loadRegistrationsFromFirestore();
      } catch (error) {
        console.warn('Dashboard registration sync failed', error);
      }
    }
    if (getCurrentUser()?.role === 'admin' && DataStore?.loadUsersFromFirestore) {
      try {
        await DataStore.loadUsersFromFirestore();
      } catch (error) {
        console.warn('Dashboard user sync failed', error);
      }
    }
    renderDashboard();
    startDashboardOrganizerSync();
  })();
});

let dashboardOrganizerUnsubscribe = null;

function renderDashboard(userOverride) {
  const user = userOverride || getCurrentUser();
  if (!user) return;

  populateUserInfo();

  const role  = user?.role || 'member';
  const stats = DataStore.getDashboardStats(role);

  renderWelcomeBanner(user);
  renderQuickActions(role);
  renderStats(role, stats);
  renderRoleContent(role);
  renderRecentActivity();
  renderUpcomingEvents();
  renderCollabRequestsPanel();

  finalizeDashboardReady();

  setTimeout(() => {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count);
      animateCounter(el, target);
    });
  }, 300);
}

function startDashboardOrganizerSync() {
  if (dashboardOrganizerUnsubscribe) {
    dashboardOrganizerUnsubscribe();
    dashboardOrganizerUnsubscribe = null;
  }

  const user = getCurrentUser();
  if (!user?.uid || !db || typeof db.collection !== 'function') return;

  const userRef = db.collection('users').doc(user.uid);
  dashboardOrganizerUnsubscribe = userRef.onSnapshot(snapshot => {
    const profileData = snapshot.exists ? (snapshot.data() || {}) : {};
    const currentUser = getCurrentUser();

    if (profileData.organizerRequestStatus === 'approved' && currentUser && currentUser.role !== 'admin' && (currentUser.role !== 'organizer' || currentUser.organizerAccess !== true)) {
      const upgradedUser = {
        ...currentUser,
        ...profileData,
        role: 'organizer',
        organizerAccess: true,
        organizerRequestStatus: 'approved',
      };
      setCurrentUser(upgradedUser);
      renderDashboard(upgradedUser);
      toast.success('Organizer access approved', 'Your dashboard has been updated.');
      return;
    }

    if (profileData.organizerRequestStatus === 'pending') {
      const updatedUser = {
        ...currentUser,
        ...profileData,
        organizerRequestStatus: 'pending',
        organizerRequestReason: profileData.organizerRequestReason || currentUser.organizerRequestReason || '',
      };
      setCurrentUser(updatedUser);
      renderDashboard(updatedUser);
      return;
    }

    if (profileData.organizerRequestStatus === 'rejected') {
      const updatedUser = {
        ...currentUser,
        ...profileData,
        organizerRequestStatus: 'rejected',
      };
      setCurrentUser(updatedUser);
      renderDashboard(updatedUser);
    }
  }, error => {
    console.warn('Organizer request listener failed', error);
  });
}

function finalizeDashboardReady() {
  const hide = () => {
    if (typeof hidePageLoader === 'function') {
      hidePageLoader();
    }
  };

  hide();
  setTimeout(hide, 900);
}

// ── Welcome Banner ────────────────────────────
function renderWelcomeBanner(user) {
  const el = document.getElementById('welcome-banner');
  if (!el) return;
  const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? greetings[0] : hour < 17 ? greetings[1] : greetings[2];

  const roleMessages = {
    member:   { sub: 'Ready to learn, grow, and connect? Let\'s go! 🚀', actions: [
      { label:'Explore Events', icon:'🎯', href:'pages/events.html' },
      { label:'Join Community', icon:'🌟', href:'pages/communities.html' },
    ]},
    organizer:{ sub: 'Your events are making an impact. Keep building! ⚡', actions: [
      { label:'Create Event', icon:'➕', href:'pages/create-event.html' },
      { label:'View Analytics', icon:'📊', href:'pages/analytics.html' },
    ]},
    admin:    { sub: 'Platform running smoothly. 6 items need your attention.', actions: [
      { label:'Review Approvals', icon:'✅', href:'pages/admin-panel.html' },
      { label:'Platform Analytics', icon:'📈', href:'pages/analytics.html' },
    ]},
  };

  const cfg = roleMessages[user?.role] || roleMessages.member;
  el.innerHTML = `
    <div style="position:relative;z-index:1">
      <div class="text-secondary text-sm mb-1">${greeting} 👋</div>
      <div class="welcome-title">${user.name} <span class="text-gradient">•</span></div>
      <div class="welcome-subtitle">${cfg.sub}</div>
      <div class="welcome-actions">
        ${cfg.actions.map(a => `<a href="${a.href}" class="btn btn-primary">${a.icon} ${a.label}</a>`).join('')}
        <a href="pages/settings.html" class="btn btn-outline">⚙️ Settings</a>
      </div>
    </div>
  `;
}

// ── Quick Actions ─────────────────────────────
function renderQuickActions(role) {
  const el = document.getElementById('quick-actions');
  if (!el) return;

  const actions = {
    member: [
      { icon:'🎯', label:'Explore Events',    href:'pages/events.html' },
      { icon:'🌟', label:'Communities',       href:'pages/communities.html' },
      { icon:'🎫', label:'My Registrations',  href:'pages/registrations.html' },
      { icon:'🤖', label:'AI Tools',          href:'pages/ai-tools.html' },
      { icon:'📊', label:'My Progress',       href:'pages/analytics.html' },
    ],
    organizer: [
      { icon:'➕', label:'Create Event',      href:'pages/create-event.html' },
      { icon:'🌍', label:'Create Community',  href:'pages/create-community.html' },
      { icon:'📊', label:'Analytics',         href:'pages/analytics.html' },
      { icon:'🎫', label:'Registrations',     href:'pages/registrations.html' },
      { icon:'🤖', label:'AI Tools',          href:'pages/ai-tools.html' },
      { icon:'⚙️', label:'Settings',          href:'pages/settings.html' },
    ],
    admin: [
      { icon:'✅', label:'Approvals',         href:'pages/admin-panel.html' },
      { icon:'👥', label:'Manage Users',      href:'pages/admin-panel.html' },
      { icon:'📊', label:'Analytics',         href:'pages/analytics.html' },
      { icon:'🚨', label:'Reports',           href:'pages/admin-panel.html' },
      { icon:'🌍', label:'Communities',       href:'pages/communities.html' },
      { icon:'⚙️', label:'Settings',          href:'pages/settings.html' },
    ],
  };

  const items = actions[role] || actions.member;
  el.innerHTML = items.map(a => `
    <a href="${a.href}" class="quick-action-card">
      <span class="quick-action-icon">${a.icon}</span>
      <div class="quick-action-label">${a.label}</div>
    </a>
  `).join('');
}

// ── Stats Cards ───────────────────────────────
function renderStats(role, stats) {
  const el = document.getElementById('stats-grid');
  if (!el) return;

  let cards = [];

  if (role === 'admin') {
    cards = [
      { value: stats.totalUsers,         label:'Total Users',         change:'+12%',  up:true,  color:'purple' },
      { value: stats.totalCommunities,   label:'Communities',         change:'+8%',   up:true,  color:'blue'   },
      { value: stats.totalEvents,        label:'Total Events',        change:'+15%',  up:true,  color:'cyan'   },
      { value: stats.pendingApprovals,   label:'Pending Approvals',   change:'Action needed', up:false, color:'pink' },
    ];
  } else if (role === 'organizer') {
    cards = [
      { value: stats.totalEvents,        label:'My Events',           change:'+2 this month', up:true, color:'purple' },
      { value: stats.totalAttendees,     label:'Total Attendees',     change:'+18%', up:true,  color:'blue'   },
      { value: stats.totalRegistrations, label:'Registrations',       change:'+23%', up:true,  color:'cyan'   },
      { value: stats.viewsThisMonth,     label:'Profile Views',       change:'+41%', up:true,  color:'pink'   },
    ];
  } else {
    cards = [
      { value: stats.joinedCommunities,  label:'Communities Joined',  change:'Active', up:true, color:'purple' },
      { value: stats.registeredEvents,   label:'Events Registered',   change:'3 upcoming', up:true, color:'blue' },
      { value: stats.points,             label:'Activity Points',     change:'+40 pts', up:true, color:'cyan' },
      { value: stats.attendanceRate,     label:'Attendance Rate',     change:'Great!', up:true, color:'green' },
    ];
  }

  el.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div class="stat-value" data-count="${typeof c.value === 'number' ? c.value : 0}">
            ${typeof c.value === 'string' ? c.value : c.value.toLocaleString()}
          </div>
          <div class="stat-label">${c.label}</div>
        </div>
        <div class="stat-change ${c.up ? 'up' : 'down'}">${c.change}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.random()*40+40}%"></div>
      </div>
    </div>
  `).join('');
}

// ── Role-specific Content ─────────────────────
function renderRoleContent(role) {
  const el = document.getElementById('role-content');
  if (!el) return;

  if (role === 'member')   el.innerHTML = renderMemberContent();
  else if (role === 'organizer') el.innerHTML = renderOrganizerContent();
  else if (role === 'admin')     el.innerHTML = renderAdminContent();
}

function renderMemberContent() {
  const user = getCurrentUser();
  const regs = DataStore.getUserRegistrations(user.uid);
  const hasOrganizerAccess = typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user.role === 'organizer' || user.role === 'admin' || user.organizerAccess === true);
  const requestStatus = user.organizerRequestStatus || 'none';

  return `
    <div class="card">
      <div class="section-header">
        <div class="section-title">🎫 My Registrations</div>
        <a href="pages/registrations.html" class="btn btn-ghost btn-sm">View All</a>
      </div>
      ${regs.length === 0
        ? `<div class="empty-state"><div class="empty-icon">🎫</div><div class="empty-title">No registrations yet</div><div class="empty-desc">Explore events and register to get started</div><a href="pages/events.html" class="btn btn-primary mt-3">Explore Events</a></div>`
        : regs.map(r => `
          <div class="ticket-card mb-4">
            <div class="ticket-icon" style="background:rgba(168,85,247,0.1)">${r.event?.emoji || '🎫'}</div>
            <div class="ticket-info">
              <div class="ticket-name">${r.event?.title || 'Event'}</div>
              <div class="ticket-detail">${formatDate(r.event?.date)} · ${r.ticketId}</div>
            </div>
            <div class="reg-status ${r.status}">
              <div class="reg-status-dot"></div>
              ${r.status.charAt(0).toUpperCase()+r.status.slice(1)}
            </div>
          </div>
        `).join('')
      }
    </div>
    <div class="card mt-4">
      <div class="section-header">
        <div class="section-title">🌟 Joined Communities</div>
        <a href="pages/communities.html" class="btn btn-ghost btn-sm">Explore</a>
      </div>
      <div class="grid-2">
        ${DataStore.getCommunities().slice(0,4).map(c => `
          <div class="community-card" onclick="window.location='pages/community-details.html?id=${c.id}'">
            <div class="community-card-banner" style="background:${c.banner}">
              <div class="community-card-logo">${c.emoji}</div>
            </div>
            <div class="community-card-body">
              <div class="community-card-name">${c.name}</div>
              <div class="community-card-meta">
                <span class="badge badge-purple">${c.category}</span>
                <span class="community-card-members">👥 ${c.members.toLocaleString()} members</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card mt-4">
      <div class="section-header">
        <div class="section-title">⚡ Organizer Access</div>
      </div>
      ${hasOrganizerAccess ? `
        <div class="empty-state" style="padding:18px 12px">
          <div class="empty-icon">✅</div>
          <div class="empty-title">Organizer access approved</div>
          <div class="empty-desc">You can create communities and events now.</div>
      ` : requestStatus === 'pending' ? `
        <div class="empty-state" style="padding:18px 12px">
          <div class="empty-icon">⏳</div>
          <div class="empty-title">Request pending</div>
          <div class="empty-desc">An admin is reviewing your organizer access request.</div>
          <div class="badge badge-yellow mt-3">Waiting for approval</div>
        </div>
      ` : requestStatus === 'rejected' ? `
        <div class="empty-state" style="padding:18px 12px">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Request rejected</div>
          <div class="empty-desc">Your previous organizer request was rejected${user.organizerRequestRejectionReason ? `: ${user.organizerRequestRejectionReason}` : '. You can request again.'}</div>
          <button class="btn btn-primary mt-3" onclick="openMemberOrganizerRequestModal('retry')">Request Again</button>
        </div>
      ` : `
        <div class="empty-state" style="padding:18px 12px">
          <div class="empty-icon">⚡</div>
          <div class="empty-title">Want to become an organizer?</div>
          <div class="empty-desc">Request organizer access to create communities and events.</div>
          <button class="btn btn-primary mt-3" onclick="openMemberOrganizerRequestModal('new')">Request Access</button>
        </div>
      `}
    </div>
  `;
}

function openMemberOrganizerRequestModal(mode = 'new', initialReason = '') {
  const modal = document.getElementById('member-organizer-request-modal');
  const reasonInput = document.getElementById('member-organizer-request-reason');
  const title = document.getElementById('member-organizer-request-title');

  if (title) {
    title.textContent = mode === 'retry' ? 'Request again' : 'Request organizer access';
  }
  if (reasonInput) {
    reasonInput.value = '';
  }
  if (modal) {
    modal.style.display = 'flex';
  }
  if (reasonInput) {
    setTimeout(() => reasonInput.focus(), 50);
  }
}

function closeMemberOrganizerRequestModal() {
  const modal = document.getElementById('member-organizer-request-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function submitMemberOrganizerRequestModal() {
  const reasonInput = document.getElementById('member-organizer-request-reason');
  const reason = reasonInput?.value.trim() || 'I want to create communities and events on NEXOVERSE.';
  closeMemberOrganizerRequestModal();

  try {
    await requestOrganizerAccess(reason);
    toast.success('Request submitted', 'An admin will review your request.');
  } catch (error) {
    toast.error('Request failed', error?.message || 'Unable to submit organizer request.');
  }
}

function renderOrganizerContent() {
  return `
    <div class="card">
      <div class="section-header">
        <div class="section-title">📊 Registration Overview</div>
        <a href="pages/analytics.html" class="btn btn-ghost btn-sm">Full Analytics</a>
      </div>
      <div class="chart-card" style="border:none;padding:0;">
        <div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding:0 4px">
          ${[45,62,38,80,55,92,73,88,65,95,78,100].map((h,i)=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="flex:1;display:flex;align-items:flex-end;width:100%">
                <div style="width:100%;height:${h}%;background:var(--gradient-primary);border-radius:4px 4px 0 0;opacity:0.7;transition:opacity 0.2s;cursor:pointer" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.7"></div>
              </div>
              <div style="font-size:9px;color:var(--text-muted)">${['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid-3 mt-3">
        <div style="text-align:center"><div class="stat-value text-sm" style="font-size:20px">1,543</div><div class="text-muted text-xs">Total Attendees</div></div>
        <div style="text-align:center"><div class="stat-value text-sm" style="font-size:20px">68%</div><div class="text-muted text-xs">Attendance Rate</div></div>
        <div style="text-align:center"><div class="stat-value text-sm" style="font-size:20px">4.8⭐</div><div class="text-muted text-xs">Avg Rating</div></div>
      </div>
    </div>
    <div class="card mt-4">
      <div class="section-header">
        <div class="section-title">⚡ My Events</div>
        <a href="pages/create-event.html" class="btn btn-primary btn-sm">+ Create</a>
      </div>
      ${DataStore.getEvents().slice(0,3).map(e => `
        <div class="ticket-card mb-3" style="cursor:pointer" onclick="window.location='pages/event-details.html?id=${e.id}'">
          <div class="ticket-icon" style="background:rgba(168,85,247,0.1)">${e.emoji}</div>
          <div class="ticket-info">
            <div class="ticket-name">${e.title}</div>
            <div class="ticket-detail">${formatDate(e.date)} · 👥 ${e.attendees}/${e.maxAttendees}</div>
          </div>
          <div class="progress-bar" style="width:80px">
            <div class="progress-fill" style="width:${Math.round(e.attendees/e.maxAttendees*100)}%"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdminContent() {
  const pending = DataStore.getPendingApprovals();
  return `
    <div class="card">
      <div class="section-header">
        <div class="section-title">⏳ Pending Approvals</div>
        <a href="pages/admin-panel.html" class="btn btn-primary btn-sm">Manage All</a>
      </div>
      ${pending.communities.length === 0
        ? `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">All caught up!</div></div>`
        : pending.communities.map(c => `
          <div class="approval-card mb-3">
            <div style="font-size:24px">${c.emoji}</div>
            <div class="approval-info">
              <div class="approval-name">${c.name}</div>
              <div class="approval-meta">Community · ${c.category} · By ${c.organizer}</div>
            </div>
            <div class="approval-actions">
              <button class="btn btn-primary btn-sm" onclick="approveItem('community','${c.id}')">✅ Approve</button>
              <button class="btn btn-danger btn-sm" onclick="rejectItem('community','${c.id}')">✕</button>
            </div>
          </div>
        `).join('')
      }
    </div>
    <div class="card mt-4">
      <div class="section-header">
        <div class="section-title">📈 Platform Overview</div>
      </div>
      <div class="grid-2">
        <div style="text-align:center;padding:20px 0">
          <div class="stat-value">3,847</div>
          <div class="text-muted text-sm">Registered Users</div>
          <div class="stat-change up mt-2">+12% this month</div>
        </div>
        <div style="text-align:center;padding:20px 0">
          <div class="stat-value">₹0</div>
          <div class="text-muted text-sm">Revenue (Free Platform)</div>
          <div class="stat-change up mt-2">Community First 🚀</div>
        </div>
      </div>
    </div>
  `;
}

// ── Recent Activity ───────────────────────────
function renderRecentActivity() {
  const el = document.getElementById('recent-activity');
  if (!el) return;
  // Try to load real notifications / recent activity for the current user from Firestore.
  // If no user-specific notifications exist, fall back to role-specific activity items.
  (async () => {
    try {
      const user = getCurrentUser();
      let items = [];
      const role = user?.role || 'member';
      if (window.db && user?.uid) {
        try {
          const snap = await window.db.collection('notifications').where('userId','==',user.uid).orderBy('createdAt','desc').limit(8).get();
          items = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));
        } catch (qerr) {
          // Fallback: fetch all and filter
          const snap = await window.db.collection('notifications').get();
          items = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}) })).filter(n => n.userId === user.uid).slice(0,8);
        }
      } 

      // If no user-specific notifications found, show role-specific recent activity
      if (!items || items.length === 0) {
        // role-specific activity templates
        const activitiesByRole = {
          member: [
            { icon:'🎯', color:'rgba(168,85,247,0.15)', title:'Recommended events for you', time:'Now' },
            { icon:'🌟', color:'rgba(59,130,246,0.15)', title:'People you follow posted in communities', time:'1 day ago' },
            { icon:'📊', color:'rgba(34,211,238,0.15)', title:'New event analytics available', time:'2 days ago' },
          ],
          organizer: [
            { icon:'📈', color:'rgba(59,130,246,0.08)', title:'New registration on your event', time:'30 mins ago' },
            { icon:'⚙️', color:'rgba(99,102,241,0.08)', title:'Platform changes require attention', time:'1 day ago' },
          ],
          admin: [
            { icon:'🛡️', color:'rgba(168,85,247,0.15)', title:'Pending approvals need review', time:'Now' },
            { icon:'🚨', color:'rgba(244,114,182,0.12)', title:'New reports submitted', time:'2 hours ago' },
          ],
        };

        const fallback = activitiesByRole[role] || activitiesByRole.member;
        el.innerHTML = fallback.map(a => `
          <div class="activity-item">
            <div class="activity-icon-wrap" style="background:${a.color}">${a.icon}</div>
            <div class="activity-body">
              <div class="activity-title">${escapeHtml(a.title)}</div>
              <div class="activity-time">${escapeHtml(a.time)}</div>
            </div>
          </div>
        `).join('');
        return;
      }

      el.innerHTML = items.map(n => {
        const title = n.title || n.message || 'Notification';
        const time = n.createdAt ? (n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : new Date(n.createdAt).toLocaleString()) : '';
        const icon = n.type === 'report_resolved' ? '🔔' : (n.type === 'report' ? '🚨' : (n.type === 'event' ? '🎯' : '🔔'));
        const color = n.type === 'report_resolved' ? 'rgba(59,130,246,0.12)' : (n.type === 'report' ? 'rgba(244,114,182,0.12)' : 'rgba(99,102,241,0.08)');
        return `
          <div class="activity-item">
            <div class="activity-icon-wrap" style="background:${color}">${icon}</div>
            <div class="activity-body">
              <div class="activity-title">${escapeHtml(title)}</div>
              <div class="activity-time">${escapeHtml(time)}</div>
              ${n.message ? `<div style="margin-top:6px;font-size:13px;line-height:1.5;color:var(--text-secondary)">${escapeHtml(n.message)}</div>` : ''}
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      console.error('renderRecentActivity failed', err);
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Failed to load activity</div><div class="empty-desc">${escapeHtml(err.message||err)}</div></div>`;
    }
  })();
}

// ── Upcoming Events ───────────────────────────
function renderUpcomingEvents() {
  const el = document.getElementById('upcoming-events');
  if (!el) return;

  const events = DataStore.getEvents().slice(0,4);
  el.innerHTML = events.map(e => `
    <div class="event-card" onclick="window.location='pages/event-details.html?id=${e.id}'">
      <div class="event-card-banner" style="background:${e.banner}">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px">${e.emoji}</div>
      </div>
      <div class="event-card-body">
        <div class="event-card-category">${e.category}</div>
        <div class="event-card-title">${e.title}</div>
        <div class="event-card-meta">
          <span>📅 ${formatDate(e.date)}</span>
          <span>📍 ${e.isOnline ? 'Online' : e.venue.split(',')[0]}</span>
        </div>
        <div class="event-card-footer">
          <div class="event-attendees">
            <div class="avatar-stack">
              ${['A','B','C'].map(l=>`<div class="avatar avatar-sm" style="background:var(--gradient-primary)">${l}</div>`).join('')}
            </div>
            <span class="event-attendees-count">+${e.attendees} attending</span>
          </div>
          <span class="badge ${e.isFree ? 'badge-green' : 'badge-purple'}">${e.isFree ? 'Free' : '₹'+e.price}</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function renderCollabRequestsPanel() {
  const el = document.getElementById('collab-requests-content');
  if (!el) return;
  el.innerHTML = '<div class="text-secondary">Loading requests…</div>';
  const user = getCurrentUser();
  const normalizeStatus = (value) => String(value || 'pending').toLowerCase();
  const formatStatusLabel = (value, item = null) => {
    if (item?.removedAt || item?.removedBy || item?.isRemoved) return 'Removed';
    const normalized = normalizeStatus(value);
    if (normalized === 'accepted') return 'Accepted';
    if (normalized === 'rejected') return 'Rejected';
    return 'Pending';
  };
  const statusBadge = (value, item = null) => {
    if (item?.removedAt || item?.removedBy || item?.isRemoved) {
      return '<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(148,163,184,0.2);color:#cbd5e1;border:1px solid rgba(148,163,184,0.45);">Removed</span>';
    }
    const normalized = normalizeStatus(value);
    const style = normalized === 'accepted'
      ? 'background:rgba(74,222,128,0.15);color:var(--green-400);border:1px solid rgba(74,222,128,0.35);'
      : normalized === 'rejected'
        ? 'background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.35);'
        : 'background:rgba(250,204,21,0.12);color:var(--yellow-400);border:1px solid rgba(250,204,21,0.2);';
    return `<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;${style}">${formatStatusLabel(value, item)}</span>`;
  };
  if (!user) { el.innerHTML = '<div class="empty-state"><div class="empty-title">Sign in to view requests</div></div>'; return; }
  try {
    // Incoming: for communities user organizes/owns
    const allCommunities = typeof DataStore?.getCommunities === 'function' ? DataStore.getCommunities() : [];
    const ownerComms = allCommunities.filter(c => (c.organizerId === user.uid) || (c.organizer_uid === user.uid) || (c.ownerId === user.uid) || (c.createdBy === user.uid));
    let incoming = [];
    let handled = [];
    for (const c of ownerComms) {
      if (typeof DataStore?.getCommunityCollabRequests === 'function') {
        const reqs = await DataStore.getCommunityCollabRequests(c.id);
        const pendingReqs = (reqs || []).filter(r => (r.status || 'pending') === 'pending');
        const handledReqs = (reqs || []).filter(r => {
          const status = normalizeStatus(r.status);
          return status === 'accepted' || status === 'rejected';
        });
        incoming = incoming.concat(pendingReqs.map(r => ({ community: c, req: r })));
        handled = handled.concat(handledReqs.map(r => ({ community: c, req: r })));
      }
    }

    // Sent: requests from this user
    let sent = [];
    if (typeof db !== 'undefined' && db && typeof db.collection === 'function') {
      const snapshot = await db.collection('collabRequests').where('payload.fromUserId', '==', user.uid).get();
      sent = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
    } else if (typeof DataStore?.getSentCollabRequests === 'function') {
      sent = await DataStore.getSentCollabRequests(user.uid);
    }

    // Render
    let html = '';
    if (incoming.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No incoming requests</div><div class="empty-desc">No communities have collaboration requests right now.</div></div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:8px">';
      incoming.slice(0,5).forEach(item => {
        const r = item.req;
        const title = (r.payload && r.payload.eventDraft && r.payload.eventDraft.title) ? r.payload.eventDraft.title : (r.payload && r.payload.eventId) ? `Event: ${r.payload.eventId}` : 'Event draft';
        const when = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds*1000).toLocaleString() : (r.createdAt || '');
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card)">`;
        html += `<div style="min-width:0"><div style="font-weight:600">${escapeHtml(title)}</div><div class="text-muted text-xs">From: ${escapeHtml(r.payload?.fromUserId || 'Unknown')} • ${escapeHtml(when)}</div></div>`;
        html += `<div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" data-id="${r.id}" data-cid="${item.community.id}" onclick="handleDashboardCollabAction(event,'accept')">Accept</button><button class="btn btn-ghost btn-sm" data-id="${r.id}" data-cid="${item.community.id}" onclick="handleDashboardCollabAction(event,'reject')">Reject</button></div>`;
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<div style="height:12px"></div>';
    html += '<div class="section-subtitle">Recently handled</div>';
    if (!handled.length) {
      html += '<div class="text-muted text-xs">No accepted or rejected requests yet.</div>';
    } else {
      handled
        .sort((a, b) => {
          const aTimeRaw = a.req?.handledAt?.seconds ? a.req.handledAt.seconds * 1000 : (a.req?.handledAt || a.req?.createdAt || 0);
          const bTimeRaw = b.req?.handledAt?.seconds ? b.req.handledAt.seconds * 1000 : (b.req?.handledAt || b.req?.createdAt || 0);
          const aTime = typeof aTimeRaw === 'string' ? Date.parse(aTimeRaw) : Number(aTimeRaw || 0);
          const bTime = typeof bTimeRaw === 'string' ? Date.parse(bTimeRaw) : Number(bTimeRaw || 0);
          return bTime - aTime;
        })
        .slice(0, 6)
        .forEach(item => {
          const r = item.req;
          const title = (r.payload && r.payload.eventDraft && r.payload.eventDraft.title) ? r.payload.eventDraft.title : (r.payload && r.payload.eventId) ? `Event: ${r.payload.eventId}` : 'Event draft';
          const whenRaw = r.handledAt || r.createdAt || '';
          const when = whenRaw && whenRaw.seconds ? new Date(whenRaw.seconds * 1000).toLocaleString() : String(whenRaw || '');
          html += `<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:8px;background:var(--bg-card)">`;
          const removed = r?.removedAt || r?.removedBy || r?.isRemoved;
          const removedTimeRaw = r.removedAt || '';
          const removedTime = removedTimeRaw && removedTimeRaw.seconds ? new Date(removedTimeRaw.seconds * 1000).toLocaleString() : String(removedTimeRaw || '');
          html += `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div style="font-weight:600;min-width:0">${escapeHtml(title)}</div>${statusBadge(r.status, r)}</div>`;
          html += `<div class="text-muted text-xs">Community: ${escapeHtml(item.community?.name || item.community?.id || '')} • ${escapeHtml(when)}</div>`;
          if (removed) {
            html += `<div class="text-muted text-xs">Removed${r.removedBy ? ` by ${escapeHtml(r.removedBy)}` : ''}${removedTime ? ` • ${escapeHtml(removedTime)}` : ''}</div>`;
          }
          html += '</div>';
        });
    }

    html += '<div style="height:12px"></div>';
    html += '<div class="section-subtitle">My sent requests</div>';
    if (!sent.length) {
      html += '<div class="text-muted text-xs">You have not sent any collaboration requests.</div>';
    } else {
      html += sent.slice(0,6).map(s => `<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:8px;background:var(--bg-card)"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div style="font-weight:600;min-width:0">${escapeHtml((s.payload?.eventDraft?.title) || s.payload?.eventId || 'Event draft')}</div>${statusBadge(s.status, s)}</div><div class="text-muted text-xs">To: ${escapeHtml(s.toCommunityId || '')}</div></div>`).join('');
    }

    el.innerHTML = html;
  } catch (err) {
    console.warn('Failed to load collab requests for dashboard', err);
    el.innerHTML = '<div class="empty-state"><div class="empty-title">Unable to load requests</div><div class="empty-desc">Try refreshing the page.</div></div>';
  }
}

window.handleDashboardCollabAction = async function(event, action) {
  const btn = event.currentTarget;
  const id = btn.dataset.id;
  const communityId = btn.dataset.cid;
  if (!id) return;
  btn.disabled = true; btn.textContent = action === 'accept' ? 'Accepting…' : 'Rejecting…';
  try {
    await DataStore.handleCollabRequest(id, action, getCurrentUser()?.uid || '');
    toast.success(action === 'accept' ? 'Accepted' : 'Rejected', `Request ${action}ed.`);
    setTimeout(() => renderCollabRequestsPanel(), 600);
  } catch (err) {
    btn.disabled = false; btn.textContent = action === 'accept' ? 'Accept' : 'Reject';
    toast.error('Failed', err?.message || 'Unable to process request');
  }
};

// ── Admin Actions ─────────────────────────────
function approveItem(type, id) {
  if (type === 'community') {
    const c = DataStore.getCommunity(id);
    if (c) {
      c.isApproved = true;
      toast.success('Approved!', `${c.name} is now live on the platform.`);
      renderRoleContent('admin');
    }
  }
}

function rejectItem(type, id) {
  toast.error('Rejected', 'The request has been declined.');
}
