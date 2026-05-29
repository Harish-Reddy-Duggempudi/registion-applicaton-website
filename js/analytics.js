// =============================================
// NEXOVERSE — Analytics, AI, Registrations
// =============================================

// ============================================================
// ANALYTICS
// ============================================================
const adminCommunityApprovalState = {
  pendingCommunities: [],
  approvedCommunities: [],
  loading: false,
};

const adminPanelState = {
  users: [],
  usersLoading: false,
  statsLoading: false,
  stats: {
    totalUsers: '...',
    totalCommunities: '...',
    totalEvents: '...',
    totalRegistrations: '...',
    reportsOpen: '...',
  },
};

function countUsersByRole(users = []) {
  return users.reduce((counts, user) => {
    const role = (user.role || 'member').toLowerCase();
    if (role === 'admin') counts.admins += 1;
    else if (role === 'organizer') counts.organizers += 1;
    else counts.members += 1;
    return counts;
  }, { members: 0, organizers: 0, admins: 0 });
}

function renderAdminRoleBreakdown() {
  const counts = countUsersByRole(adminPanelState.users);
  const memberEl = document.getElementById('admin-member-count');
  const organizerEl = document.getElementById('admin-organizer-count');
  const adminEl = document.getElementById('admin-admin-count');

  if (memberEl) memberEl.textContent = counts.members.toLocaleString();
  if (organizerEl) organizerEl.textContent = counts.organizers.toLocaleString();
  if (adminEl) adminEl.textContent = counts.admins.toLocaleString();
}

function getAdminUserById(id) {
  return adminPanelState.users.find(user => user.id === id);
}

let pendingAdminEditUserId = null;
let pendingAdminSuspendUserId = null;

function normalizeAdminRole(role) {
  const value = String(role || 'member').trim().toLowerCase();
  if (value === 'admin' || value === 'organizer' || value === 'member') return value;
  return 'member';
}

function openAdminUserEditModal(id) {
  const user = getAdminUserById(id);
  if (!user) {
    toast.error('Edit failed', 'User not found.');
    return;
  }

  pendingAdminEditUserId = id;

  const modal = document.getElementById('admin-user-edit-modal');
  const title = document.getElementById('admin-user-edit-modal-title');
  const nameInput = document.getElementById('admin-user-edit-name');
  const emailInput = document.getElementById('admin-user-edit-email');
  const roleInput = document.getElementById('admin-user-edit-role');

  if (title) title.textContent = `Edit ${user.name}`;
  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (roleInput) roleInput.value = normalizeAdminRole(user.role);
  if (modal) modal.style.display = 'flex';
  if (nameInput) setTimeout(() => nameInput.focus(), 50);
}

function closeAdminUserEditModal() {
  pendingAdminEditUserId = null;
  const modal = document.getElementById('admin-user-edit-modal');
  if (modal) modal.style.display = 'none';
}

function openAdminUserSuspendModal(id) {
  const user = getAdminUserById(id);
  if (!user) {
    toast.error('Action failed', 'User not found.');
    return;
  }

  pendingAdminSuspendUserId = id;

  const modal = document.getElementById('admin-user-suspend-modal');
  const title = document.getElementById('admin-user-suspend-modal-title');
  const reasonInput = document.getElementById('admin-user-suspend-reason');
  const confirmBtn = document.getElementById('admin-user-suspend-confirm-btn');
  const isSuspended = user.status === 'suspended';

  if (title) title.textContent = isSuspended ? `Restore ${user.name}?` : `Suspend ${user.name}?`;
  if (reasonInput) {
    reasonInput.value = '';
    reasonInput.placeholder = isSuspended
      ? 'Optional note for restoring this account...'
      : 'Add a reason for suspension (visible in admin records)...';
  }
  if (confirmBtn) {
    confirmBtn.textContent = isSuspended ? 'Restore Account' : 'Suspend Account';
    confirmBtn.className = isSuspended ? 'btn btn-primary btn-sm' : 'btn btn-danger btn-sm';
  }
  if (modal) modal.style.display = 'flex';
  if (reasonInput) setTimeout(() => reasonInput.focus(), 50);
}

function closeAdminUserSuspendModal() {
  pendingAdminSuspendUserId = null;
  const modal = document.getElementById('admin-user-suspend-modal');
  if (modal) modal.style.display = 'none';
}

async function submitAdminUserSuspendModal() {
  if (!pendingAdminSuspendUserId) return;

  const user = getAdminUserById(pendingAdminSuspendUserId);
  if (!user) {
    closeAdminUserSuspendModal();
    toast.error('Action failed', 'User not found.');
    return;
  }

  const reasonInput = document.getElementById('admin-user-suspend-reason');
  const reason = reasonInput?.value.trim() || '';
  const isSuspended = user.status === 'suspended';
  const nextStatus = isSuspended ? 'active' : 'suspended';

  try {
    await saveAdminUserChanges(pendingAdminSuspendUserId, {
      status: nextStatus,
      suspended: nextStatus === 'suspended',
      suspensionReason: nextStatus === 'suspended' ? reason : '',
      suspendedAt: nextStatus === 'suspended' ? firebase.firestore.FieldValue.serverTimestamp() : null,
      restoredAt: nextStatus === 'active' ? firebase.firestore.FieldValue.serverTimestamp() : null,
    });

    if (getCurrentUser()?.uid === user.id) {
      const current = getCurrentUser();
      setCurrentUser({
        ...current,
        status: nextStatus,
        suspended: nextStatus === 'suspended',
        suspensionReason: nextStatus === 'suspended' ? reason : '',
      });
      populateUserInfo();
    }

    closeAdminUserSuspendModal();
    loadAdminUsers();
    renderAdminStats();
    toast.success(nextStatus === 'suspended' ? 'Account suspended' : 'Account restored', `${user.name} is now ${nextStatus}.`);
  } catch (error) {
    toast.error('Action failed', error?.message || 'Unable to update account status.');
  }
}

async function submitAdminUserEditModal() {
  if (!pendingAdminEditUserId) return;

  const nameInput = document.getElementById('admin-user-edit-name');
  const emailInput = document.getElementById('admin-user-edit-email');
  const roleInput = document.getElementById('admin-user-edit-role');
  const user = getAdminUserById(pendingAdminEditUserId);
  if (!user) {
    closeAdminUserEditModal();
    toast.error('Edit failed', 'User not found.');
    return;
  }

  const normalizedName = nameInput?.value.trim() || '';
  const normalizedEmail = emailInput?.value.trim() || '';
  const normalizedRole = normalizeAdminRole(roleInput?.value);

  if (!normalizedName || !normalizedEmail) {
    toast.warning('Missing details', 'Name and email are required.');
    return;
  }

  try {
    await saveAdminUserChanges(pendingAdminEditUserId, {
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      suspended: user.status === 'suspended',
      status: user.status || 'active',
    });

    closeAdminUserEditModal();
    loadAdminUsers();
    renderAdminStats();
    toast.success('User updated', `${normalizedName} has been saved.`);
  } catch (error) {
    toast.error('Edit failed', error?.message || 'Unable to update user.');
  }
}

async function saveAdminUserChanges(id, changes) {
  if (!db) throw new Error('Firestore unavailable.');
  await db.collection('users').doc(id).set(changes, { merge: true });

  const current = getCurrentUser();
  if (current?.uid === id) {
    setCurrentUser({
      ...current,
      ...changes,
    });
    populateUserInfo();
  }
}

async function editAdminUser(id) {
  const user = getAdminUserById(id);
  if (!user) {
    toast.error('Edit failed', 'User not found.');
    return;
  }
  openAdminUserEditModal(id);
}

async function toggleAdminUserSuspend(id) {
  openAdminUserSuspendModal(id);
}

const organizerRequestState = {
  requests: [],
  loading: false,
  initialized: false,
};

let organizerRequestsUnsubscribe = null;
let pendingOrganizerReject = null;

async function requestOrganizerAccess(reason = '') {
  const user = getCurrentUser();
  if (!user) throw new Error('Login required.');
  if (!db) throw new Error('Firestore is unavailable right now.');
  if (typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user.role === 'organizer' || user.role === 'admin' || user.organizerAccess)) {
    return { status: 'approved' };
  }

  const requestData = {
    uid: user.uid,
    name: user.name || 'User',
    email: user.email || '',
    reason: reason || 'I want to create communities and events on NEXOVERSE.',
    requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'pending',
  };

  await db.collection('organizer_requests').doc(user.uid).set(requestData, { merge: true });
  await db.collection('users').doc(user.uid).set({
    organizerRequestStatus: 'pending',
    organizerRequestReason: requestData.reason,
  }, { merge: true });

  const updatedUser = {
    ...user,
    organizerRequestStatus: 'pending',
    organizerRequestReason: requestData.reason,
  };
  setCurrentUser(updatedUser);
  populateUserInfo();

  return { status: 'pending', reason: requestData.reason };
}

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.includes('analytics.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initAnalyticsPage();
  }
  if (path.includes('ai-tools.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initAIToolsPage();
  }
  if (path.includes('registrations.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initRegistrationsPage();
  }
  if (path.includes('settings.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initSettingsPage();
  }
  if (path.includes('admin-panel.html')) {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    if (user?.role !== 'admin') {
      toast.error('Access Denied', 'Admin only area.');
      setTimeout(() => window.location.href = '../dashboard.html', 1500);
      return;
    }
    populateUserInfo();
    initAdminPage();
  }
});

function initAnalyticsPage() {
  const user  = getCurrentUser();
  const stats = DataStore.getDashboardStats(user.role);
  const data  = DataStore.getAnalytics();

  renderAnalyticsStats(user.role, stats);
  renderLineChart('registrations-chart', data.registrationsOverTime, data.months);
  renderLineChart('community-chart',     data.communityGrowth,       data.months, '#22d3ee');
  renderBarChart ('attendance-chart',    data.eventAttendance,       data.months, '#f472b6');
  renderDonutChart('category-chart',     data.categories);

  // Animate counters
  setTimeout(() => {
    document.querySelectorAll('[data-count]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.count));
    });
  }, 300);
}

function renderAnalyticsStats(role, stats) {
  const el = document.getElementById('analytics-stats');
  if (!el) return;
  let cards = [];
  if (role === 'admin') {
    cards = [
      { label:'Total Users',         value: stats.totalUsers,         icon:'👥', change:stats.growthUsers },
      { label:'Total Events',        value: stats.totalEvents,        icon:'🎯', change:stats.growthEvents },
      { label:'Total Communities',   value: stats.totalCommunities,   icon:'🌐', change:'+5%' },
      { label:'Registrations',       value: stats.totalRegistrations, icon:'🎫', change:'+22%' },
    ];
  } else if (role === 'organizer') {
    cards = [
      { label:'My Events',           value: stats.totalEvents,        icon:'🎯', change:'This month' },
      { label:'Total Attendees',     value: stats.totalAttendees,     icon:'👥', change:'+18%' },
      { label:'Registrations',       value: stats.totalRegistrations, icon:'🎫', change:'+23%' },
      { label:'Engagement Rate',     value: stats.engagementRate,     icon:'📈', change:'High' },
    ];
  } else {
    cards = [
      { label:'Communities Joined',  value: stats.joinedCommunities,  icon:'🌐', change:'Active' },
      { label:'Events Attended',     value: stats.registeredEvents,   icon:'🎯', change:'Good' },
      { label:'Activity Points',     value: stats.points,             icon:'⭐', change:'+40' },
      { label:'Attendance Rate',     value: stats.attendanceRate,     icon:'📊', change:'Great!' },
    ];
  }

  el.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div style="font-size:28px;margin-bottom:10px">${c.icon}</div>
      <div class="stat-value" data-count="${typeof c.value==='number'?c.value:0}">
        ${typeof c.value === 'string' ? c.value : c.value.toLocaleString()}
      </div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-change up mt-2">${c.change}</div>
    </div>
  `).join('');
}

function renderLineChart(canvasId, data, labels, color = '#a855f7') {
  const container = document.getElementById(canvasId);
  if (!container) return;
  const max = Math.max(...data);
  const w = 600; const h = 160; const pad = 16;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  });

  const areaPoints = [
    `${pad},${h - pad}`,
    ...points,
    `${w - pad},${h - pad}`
  ].join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <defs>
        <linearGradient id="grad-${canvasId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      ${[0,25,50,75,100].map(pct => {
        const y = pad + ((100 - pct) / 100) * (h - pad * 2);
        return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
      }).join('')}
      <!-- Area -->
      <polygon points="${areaPoints}" fill="url(#grad-${canvasId})"/>
      <!-- Line -->
      <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Dots -->
      ${points.map((pt, i) => {
        const [x, y] = pt.split(',');
        return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="2"/>`;
      }).join('')}
      <!-- Labels -->
      ${labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad * 2);
        return `<text x="${x}" y="${h - 2}" text-anchor="middle" font-size="9" fill="rgba(148,163,184,0.7)" font-family="DM Sans,sans-serif">${l}</text>`;
      }).join('')}
    </svg>`;
}

function renderBarChart(canvasId, data, labels, color = '#a855f7') {
  const container = document.getElementById(canvasId);
  if (!container) return;
  const max = Math.max(...data);
  const w = 600; const h = 160; const pad = 16;
  const barW = (w - pad * 2) / data.length * 0.6;
  const gap  = (w - pad * 2) / data.length;

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <defs>
        <linearGradient id="bgrad-${canvasId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      ${data.map((v, i) => {
        const barH = ((v / max) * (h - pad * 3));
        const x = pad + i * gap + gap * 0.2;
        const y = h - pad - barH;
        return `
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
            rx="4" fill="url(#bgrad-${canvasId})" opacity="0.8"/>
          <text x="${x + barW/2}" y="${h - 2}" text-anchor="middle" font-size="9"
            fill="rgba(148,163,184,0.7)" font-family="DM Sans,sans-serif">${labels[i]}</text>`;
      }).join('')}
    </svg>`;
}

function renderDonutChart(containerId, categories) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const size = 130;
  const r = 45;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = categories.map(cat => {
    const pct = cat.value / 100;
    const dash = pct * circumference;
    const seg = { ...cat, dash, gap: circumference - dash, offset };
    offset += dash;
    return seg;
  });

  container.innerHTML = `
    <div class="donut-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="18"/>
        ${segments.map(s => `
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="${s.color}" stroke-width="18"
            stroke-dasharray="${s.dash} ${s.gap}"
            stroke-dashoffset="${-s.offset}"
            transform="rotate(-90 ${cx} ${cy})"
            style="transition:stroke-dasharray 0.6s ease"/>
        `).join('')}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="18" font-weight="800" fill="white" font-family="Syne,sans-serif">100%</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="8" fill="rgba(148,163,184,0.8)" font-family="DM Sans,sans-serif">TOTAL</text>
      </svg>
      <div class="donut-legend">
        ${categories.map(cat => `
          <div class="donut-legend-item">
            <div class="donut-dot" style="background:${cat.color}"></div>
            <div class="donut-label">${cat.label}</div>
            <div class="donut-val">${cat.value}%</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ============================================================
// REGISTRATIONS
// ============================================================
function initRegistrationsPage() {
  const user = getCurrentUser();
  const regs = DataStore.getUserRegistrations(user.uid);
  renderRegistrationsList(regs);
  initRegTabs();
}

function renderRegistrationsList(regs, filter = 'all') {
  const el = document.getElementById('registrations-list');
  if (!el) return;

  createSkeletonRows(el, 4);

  setTimeout(() => {
    const filtered = filter === 'all' ? regs : regs.filter(r => r.status === filter);

    if (filtered.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎫</div>
          <div class="empty-title">No registrations ${filter !== 'all' ? 'with status "'+filter+'"' : 'yet'}</div>
          <div class="empty-desc">Register for events to see them here.</div>
          <a href="events.html" class="btn btn-primary mt-3">Explore Events</a>
        </div>`;
      return;
    }

    el.innerHTML = filtered.map(r => {
      const e = r.event;
      if (!e) return '';
      return `
        <div class="ticket-card mb-3" style="cursor:pointer;flex-direction:column;align-items:stretch;gap:0">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
            <div class="ticket-icon" style="background:rgba(168,85,247,0.1);font-size:22px">${e.emoji}</div>
            <div class="ticket-info">
              <div class="ticket-name">${e.title}</div>
              <div class="ticket-detail">📅 ${formatDate(e.date)} · 📍 ${e.isOnline ? 'Online' : e.venue.split(',')[0]}</div>
            </div>
            <div class="reg-status ${r.status}">
              <div class="reg-status-dot"></div>
              ${r.status.charAt(0).toUpperCase()+r.status.slice(1)}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px">
            <div>
              <div class="text-muted text-xs">TICKET ID</div>
              <div class="text-sm font-semibold" style="font-family:monospace;letter-spacing:1px">${r.ticketId}</div>
            </div>
            <div>
              <div class="text-muted text-xs">REGISTERED</div>
              <div class="text-sm">${formatDate(r.registeredAt)}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${r.ticketId}')">📋 Copy Ticket</button>
              <button class="btn btn-outline btn-sm" onclick="window.location='event-details.html?id=${r.eventId}'">View Event →</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }, 600);
}

function initRegTabs() {
  const user = getCurrentUser();
  const regs = DataStore.getUserRegistrations(user.uid);
  const tabs = document.querySelectorAll('[data-reg-filter]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderRegistrationsList(regs, tab.dataset.regFilter);
    });
  });
}

// ============================================================
// AI TOOLS
// ============================================================
const AI_PROMPTS = {
  title: (topic, type) => `Generate 5 creative, catchy, professional event titles for a ${type} about "${topic}" for college students. Make them exciting and modern. Return as a numbered list.`,
  description: (title, type) => `Write a compelling 150-word event description for "${title}" (a ${type} event). Include what attendees will learn, why they should attend, and a call to action. Make it energetic and professional.`,
  announcement: (event) => `Write a short social media announcement (under 100 words) for the event: "${event}". Include emojis, make it exciting, and end with a call to action. Perfect for WhatsApp or Instagram.`,
  email: (event) => `Write a professional invitation email for the event: "${event}". Include subject line, greeting, event details placeholder, what attendees gain, and a registration CTA. Keep it under 200 words.`,
  caption: (event) => `Write 3 creative Instagram captions for the event "${event}". Each caption should be different in tone (excited, professional, fun). Include relevant hashtags. Format as Caption 1, Caption 2, Caption 3.`,
};

function initAIToolsPage() {
  const toolCards = document.querySelectorAll('[data-ai-tool]');
  toolCards.forEach(card => {
    card.addEventListener('click', () => {
      const tool = card.dataset.aiTool;
      openAITool(tool);
    });
  });
}

function openAITool(tool) {
  const modal = document.getElementById('ai-tool-modal');
  if (!modal) return;

  const configs = {
    title:       { name:'🏷️ AI Event Title Generator',       inputs: [{id:'topic', label:'Event Topic', placeholder:'e.g. Machine Learning, Web3, Design...'},{id:'type',label:'Event Type',placeholder:'e.g. Hackathon, Workshop, Talk...'}] },
    description: { name:'📝 AI Description Generator',       inputs: [{id:'title',label:'Event Title',placeholder:'Enter the event title'},{id:'type',label:'Event Type',placeholder:'e.g. Workshop, Conference...'}] },
    announcement:{ name:'📢 AI Announcement Generator',      inputs: [{id:'event',label:'Event Name & Details',placeholder:'Brief description of your event...'}] },
    email:       { name:'📧 AI Email Generator',             inputs: [{id:'event',label:'Event Name',placeholder:'Enter event name and key details'}] },
    caption:     { name:'📸 AI Caption Generator',           inputs: [{id:'event',label:'Event Name',placeholder:'Enter event name for captions'}] },
  };

  const cfg = configs[tool];
  if (!cfg) return;

  document.getElementById('ai-modal-title').textContent = cfg.name;
  const inputsEl = document.getElementById('ai-modal-inputs');
  inputsEl.innerHTML = cfg.inputs.map(inp => `
    <div class="input-group">
      <label class="input-label">${inp.label}</label>
      <input id="ai-input-${inp.id}" class="input-field" placeholder="${inp.placeholder}" />
    </div>`).join('');

  document.getElementById('ai-output-area').innerHTML = `
    <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">
      ✨ Fill in the fields and click Generate
    </div>`;

  document.getElementById('ai-generate-btn').onclick = () => generateAIContent(tool, cfg);
  openModal('ai-tool-modal');
}

async function generateAIContent(tool, cfg) {
  const btn = document.getElementById('ai-generate-btn');
  const outputEl = document.getElementById('ai-output-area');

  // Gather inputs
  const values = {};
  cfg.inputs.forEach(inp => {
    values[inp.id] = document.getElementById(`ai-input-${inp.id}`)?.value?.trim() || '';
  });

  const allFilled = Object.values(values).every(v => v);
  if (!allFilled) { toast.warning('Missing input', 'Please fill in all fields.'); return; }

  // Build prompt
  let prompt = '';
  if (tool === 'title')        prompt = AI_PROMPTS.title(values.topic, values.type);
  else if (tool === 'description') prompt = AI_PROMPTS.description(values.title, values.type);
  else if (tool === 'announcement') prompt = AI_PROMPTS.announcement(values.event);
  else if (tool === 'email')   prompt = AI_PROMPTS.email(values.event);
  else if (tool === 'caption') prompt = AI_PROMPTS.caption(values.event);

  // Show loading
  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
  outputEl.innerHTML = `
    <div class="ai-generating">
      <div class="ai-dot-wave"><span></span><span></span><span></span></div>
      <span>AI is writing for you...</span>
    </div>`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || 'No content generated.';

    outputEl.innerHTML = `
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:var(--text-primary)">${escapeHtml(text)}</div>
      <div class="ai-output-actions">
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard(${JSON.stringify(text)})">📋 Copy</button>
        <button class="btn btn-primary btn-sm" onclick="generateAIContent('${tool}',${JSON.stringify(cfg)})">🔄 Regenerate</button>
      </div>`;

  } catch (err) {
    // Fallback demo output
    const fallbacks = {
      title:       `1. 🚀 Build, Break, Innovate — The Ultimate ${values.type}\n2. ✨ Code & Create: ${values.topic} Edition\n3. 🌟 Future Forward: ${values.topic} Summit\n4. ⚡ Spark Sessions: Deep Dive into ${values.topic}\n5. 🎯 Zero to Hero: ${values.topic} ${values.type}`,
      description: `Join us for an incredible ${values.type} experience!\n\n"${values.title}" is designed for curious minds who want to push boundaries and explore the future of technology.\n\nWhat you'll gain:\n✅ Hands-on experience with cutting-edge tools\n✅ Networking with industry experts\n✅ Certificates & goodies for all participants\n✅ Real-world project experience\n\nSpots are limited — register NOW and level up your skills! 🚀`,
      announcement:`🔥 BIG ANNOUNCEMENT!\n\n${values.event} is HAPPENING and you DON'T want to miss it! 🎯\n\nMark your calendars, grab your team, and get ready for an unforgettable experience! 💫\n\n🔗 Register now — link in bio!\n\n#NEXOVERSE #StudentEvents #TechCommunity`,
      email:       `Subject: You're Invited — ${values.event} 🎉\n\nHi [Name],\n\nWe're thrilled to invite you to ${values.event} — one of the most exciting student events of the year!\n\nJoin us for a day packed with learning, networking, and fun. Whether you're a beginner or a seasoned pro, there's something for everyone.\n\n🗓️ Date: [Date]\n📍 Venue: [Venue]\n🕐 Time: [Time]\n\nSeats are filling up fast — secure yours today!\n\n👉 [Register Now Button]\n\nSee you there!\nTeam NEXOVERSE`,
      caption:     `Caption 1: 🚀 The wait is OVER! ${values.event} is officially here. Are you ready to level up? Drop a 🔥 if you're joining! #StudentLife #TechEvent\n\nCaption 2: Innovation meets inspiration at ${values.event}. Join thousands of students building the future, one line of code at a time. #NEXOVERSECommunity #BuildTheFuture\n\nCaption 3: Okay bestie, drop everything — ${values.event} is the event of the season and YOU need to be there! 👀✨ Link in bio, run! 🏃 #FOMO #EventAlert`,
    };

    const fallback = fallbacks[tool] || 'Generated content will appear here.';
    outputEl.innerHTML = `
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:var(--text-primary)">${escapeHtml(fallback)}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">💡 Demo output — connect Firebase & API key for live AI generation</div>
      <div class="ai-output-actions">
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard(${JSON.stringify(fallback)})">📋 Copy</button>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = '✨ Generate';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// SETTINGS
// ============================================================
function initSettingsPage() {
  const user = getCurrentUser();
  if (!user) return;

  // Pre-fill profile form
  const nameEl  = document.getElementById('s-name');
  const emailEl = document.getElementById('s-email');
  const bioEl   = document.getElementById('s-bio');
  if (nameEl)  nameEl.value  = user.name  || '';
  if (emailEl) emailEl.value = user.email || '';
  if (bioEl)   bioEl.value   = user.bio   || '';

  // Avatar
  const avatarEl = document.getElementById('s-avatar');
  if (avatarEl) avatarEl.textContent = user.avatar || user.name?.charAt(0) || 'U';

  // Profile form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = profileForm.querySelector('[type=submit]');
      btn.classList.add('loading');
      await new Promise(r => setTimeout(r, 800));

      const updatedUser = {
        ...user,
        name: nameEl?.value || user.name,
        bio:  bioEl?.value  || user.bio,
      };
      setCurrentUser(updatedUser);
      populateUserInfo();
      btn.classList.remove('loading');
      toast.success('Profile updated! ✅', 'Your changes have been saved.');
    });
  }

  const organizerSection = document.getElementById('organizer-access-section');
  const organizerStatus = document.getElementById('organizer-access-status');
  const requestOrganizerBtn = document.getElementById('request-organizer-access-btn');
  const organizerRequestModal = document.getElementById('settings-organizer-request-modal');
  const organizerRequestReasonModal = document.getElementById('settings-organizer-request-reason-modal');
  const organizerRequestTitle = document.getElementById('settings-organizer-request-title');

  function openSettingsOrganizerRequestModal(mode = 'new') {
    if (!organizerRequestModal) return;

    if (organizerRequestTitle) {
      organizerRequestTitle.textContent = mode === 'retry' ? 'Request again' : 'Request organizer access';
    }
    if (organizerRequestReasonModal) {
      organizerRequestReasonModal.value = '';
      setTimeout(() => organizerRequestReasonModal.focus(), 50);
    }
    organizerRequestModal.style.display = 'flex';
  }

  function closeSettingsOrganizerRequestModal() {
    if (organizerRequestModal) {
      organizerRequestModal.style.display = 'none';
    }
  }

  async function submitSettingsOrganizerRequestModal() {
    const reason = organizerRequestReasonModal?.value.trim() || 'I want to create communities and events on NEXOVERSE.';
    closeSettingsOrganizerRequestModal();

    if (requestOrganizerBtn) {
      requestOrganizerBtn.classList.add('loading');
      requestOrganizerBtn.disabled = true;
    }

    try {
      await requestOrganizerAccess(reason);
      if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-yellow">Request pending admin approval</span>';
      toast.success('Request submitted', 'An admin will review your organizer access request.');
    } catch (error) {
      toast.error('Request failed', error?.message || 'Unable to submit organizer request.');
      if (requestOrganizerBtn) requestOrganizerBtn.disabled = false;
    } finally {
      if (requestOrganizerBtn) requestOrganizerBtn.classList.remove('loading');
      await loadOrganizerRequestStatus();
    }
  }

  async function loadOrganizerRequestStatus() {
    if (!organizerSection) return;

    const hasOrganizerAccess = typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user.role === 'organizer' || user.role === 'admin' || user.organizerAccess === true);
    if (hasOrganizerAccess) {
      if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-green">Organizer access approved</span>';
      if (requestOrganizerBtn) requestOrganizerBtn.disabled = true;
      return;
    }

    if (!db || !user?.uid) {
      if (organizerStatus) organizerStatus.textContent = 'You can request organizer access from here.';
      return;
    }

    const userRef = db.collection('users').doc(user.uid);
    if (organizerSection.dataset.liveSyncAttached !== 'true') {
      organizerSection.dataset.liveSyncAttached = 'true';
      userRef.onSnapshot(snapshot => {
        if (!snapshot.exists) return;

        const liveProfile = snapshot.data() || {};
        const current = getCurrentUser() || user;

        if (liveProfile.organizerRequestStatus === 'approved' && current && (current.role !== 'organizer' || current.organizerAccess !== true)) {
          const upgradedUser = {
            ...current,
            ...liveProfile,
            role: 'organizer',
            organizerAccess: true,
            organizerRequestStatus: 'approved',
          };
          setCurrentUser(upgradedUser);
          populateUserInfo();
          if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-green">Organizer access approved</span>';
          if (requestOrganizerBtn) requestOrganizerBtn.disabled = true;
          return;
        }

        if (liveProfile.organizerRequestStatus === 'pending') {
          if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-yellow">Request pending admin approval</span>';
          if (requestOrganizerBtn) requestOrganizerBtn.disabled = true;
        } else if (liveProfile.organizerRequestStatus === 'rejected') {
          if (organizerStatus) organizerStatus.innerHTML = `<span class="badge badge-pink">Request rejected — ${escapeHtml(liveProfile.organizerRequestRejectionReason || 'request again')}</span>`;
          if (requestOrganizerBtn) requestOrganizerBtn.disabled = false;
          if (requestOrganizerBtn) requestOrganizerBtn.textContent = '⚡ Request Again';
        }
      });
    }

    try {
      const snapshot = await userRef.get();
      const requestData = snapshot.exists ? (snapshot.data() || {}) : null;
      if (!requestData) {
        if (organizerStatus) organizerStatus.textContent = 'No request submitted yet.';
        return;
      }

      if (requestData.organizerRequestStatus === 'pending') {
        if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-yellow">Request pending admin approval</span>';
        if (requestOrganizerBtn) requestOrganizerBtn.disabled = true;
        if (requestOrganizerBtn) requestOrganizerBtn.textContent = '⚡ Request Organizer Access';
      } else if (requestData.organizerRequestStatus === 'approved') {
        if (organizerStatus) organizerStatus.innerHTML = '<span class="badge badge-green">Organizer access approved</span>';
        if (typeof canUseOrganizerFeatures === 'function' ? !canUseOrganizerFeatures(user) : (user.role !== 'organizer' && user.role !== 'admin' && !user.organizerAccess)) {
          const upgradedUser = {
            ...user,
            ...requestData,
            role: 'organizer',
            organizerAccess: true,
            organizerRequestStatus: 'approved',
          };
          setCurrentUser(upgradedUser);
          populateUserInfo();
        }
      } else if (requestData.organizerRequestStatus === 'rejected') {
        if (organizerStatus) organizerStatus.innerHTML = `<span class="badge badge-pink">Request rejected — ${escapeHtml(requestData.organizerRequestRejectionReason || 'request again')}</span>`;
        if (requestOrganizerBtn) {
          requestOrganizerBtn.disabled = false;
          requestOrganizerBtn.textContent = '⚡ Request Again';
        }
      }
    } catch (error) {
      if (organizerStatus) organizerStatus.textContent = 'Unable to load request status right now.';
    }
  }

  if (requestOrganizerBtn) {
    requestOrganizerBtn.addEventListener('click', async () => {
      if (typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user.role === 'organizer' || user.role === 'admin' || user.organizerAccess)) {
        toast.info('Already approved', 'You already have organizer access.');
        return;
      }

      const currentUser = getCurrentUser() || user;
      openSettingsOrganizerRequestModal(currentUser?.organizerRequestStatus === 'rejected' ? 'retry' : 'new');
    });
  }

  window.openSettingsOrganizerRequestModal = openSettingsOrganizerRequestModal;
  window.closeSettingsOrganizerRequestModal = closeSettingsOrganizerRequestModal;
  window.submitSettingsOrganizerRequestModal = submitSettingsOrganizerRequestModal;

  loadOrganizerRequestStatus();

  // Toggles
  initToggles();

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logoutUser());
}

// ============================================================
// ADMIN PANEL
// ============================================================
function initAdminPage() {
  loadAdminUsers();
  loadAdminStats();
  loadAdminCommunityApprovals();
  startOrganizerRequestsListener();
  renderAdminStats();

  setTimeout(() => {
    document.querySelectorAll('[data-count]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.count));
    });
  }, 300);
}

function switchAdminTab(tabName, buttonEl) {
  const tabIds = ['approvals', 'users', 'organizer-requests', 'reports', 'platform'];
  tabIds.forEach(id => {
    const panel = document.getElementById(`panel-${id}`);
    const tab = document.getElementById(`tab-${id}`);
    if (panel) panel.style.display = id === tabName ? '' : 'none';
    if (tab) tab.classList.toggle('active', id === tabName);
  });

  if (buttonEl) {
    buttonEl.classList.add('active');
  }

  if (tabName === 'organizer-requests') {
    renderOrganizerRequests();
  } else if (tabName === 'approvals') {
    renderAdminApprovals();
  }
}

async function loadAdminCommunityApprovals() {
  adminCommunityApprovalState.loading = true;
  renderAdminApprovals();
  renderRecentApprovedCommunities();

  try {
    if (!db) throw new Error('Firestore unavailable.');
    const pendingSnapshot = await db.collection('communities').where('status', '==', 'pending').get();
    const approvedSnapshot = await db.collection('communities').where('status', '==', 'approved').get();

    adminCommunityApprovalState.pendingCommunities = pendingSnapshot.docs.map(normalizeCommunityApprovalDoc).sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    adminCommunityApprovalState.approvedCommunities = approvedSnapshot.docs.map(normalizeCommunityApprovalDoc).sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    }).slice(0, 4);
  } catch (error) {
    adminCommunityApprovalState.pendingCommunities = [];
    adminCommunityApprovalState.approvedCommunities = [];
  } finally {
    adminCommunityApprovalState.loading = false;
    renderAdminApprovals();
    renderRecentApprovedCommunities();
    renderAdminStats();
  }
}

async function loadAdminStats() {
  adminPanelState.statsLoading = true;
  renderAdminStats();

  try {
    if (!db) throw new Error('Firestore unavailable.');

    const [usersSnapshot, communitiesSnapshot, eventsSnapshot, registrationsSnapshot, reportsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('communities').get(),
      db.collection('events').get(),
      db.collection('registrations').get(),
      db.collection('reports').get(),
    ]);

    adminPanelState.stats = {
      totalUsers: usersSnapshot.size,
      totalCommunities: communitiesSnapshot.size,
      totalEvents: eventsSnapshot.size,
      totalRegistrations: registrationsSnapshot.size,
      reportsOpen: reportsSnapshot.size,
    };
  } catch (error) {
    const fallback = DataStore.getDashboardStats('admin');
    adminPanelState.stats = {
      totalUsers: fallback.totalUsers,
      totalCommunities: fallback.totalCommunities,
      totalEvents: fallback.totalEvents,
      totalRegistrations: fallback.totalRegistrations,
      reportsOpen: fallback.reportsOpen,
    };
  } finally {
    adminPanelState.statsLoading = false;
    renderAdminStats();
  }
}

function formatAdminJoinedDate(value) {
  if (!value) return 'Recently';
  if (value.toDate) return formatDate(value.toDate());
  return formatDate(value);
}

function normalizeCommunityApprovalDoc(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    name: data.name || 'Untitled Community',
    category: data.category || 'Other',
    organizerName: data.organizerName || data.organizer || 'NEXOVERSE',
    createdAt: data.createdAt || null,
    status: data.status || (data.isApproved ? 'approved' : 'pending'),
    emoji: data.emoji || '🌐',
  };
}

function normalizeOrganizerRequestDoc(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    uid: data.uid || doc.id,
    name: data.name || 'User',
    email: data.email || 'No email',
    reason: data.reason || 'No reason provided',
    status: data.status || 'pending',
    requestedAt: data.requestedAt || null,
  };
}

function renderAdminStats() {
  const el = document.getElementById('admin-stats');
  if (!el) return;
  const stats = adminPanelState.statsLoading ? null : adminPanelState.stats;
  const pendingCount = adminCommunityApprovalState.loading || organizerRequestState.loading
    ? '...'
    : adminCommunityApprovalState.pendingCommunities.length + organizerRequestState.requests.length;
  el.innerHTML = [
    { label:'Total Users',    value: stats ? stats.totalUsers : '...',         icon:'👥', color:'purple' },
    { label:'Communities',    value: stats ? stats.totalCommunities : '...',   icon:'🌐', color:'blue' },
    { label:'Total Events',   value: stats ? stats.totalEvents : '...',        icon:'🎯', color:'cyan' },
    { label:'Registrations',  value: stats ? stats.totalRegistrations : '...', icon:'🎫', color:'pink' },
    { label:'Pending Items',  value: pendingCount,             icon:'⏳', color:'yellow' },
    { label:'Open Reports',   value: stats ? stats.reportsOpen : '...',        icon:'🚨', color:'red' },
  ].map(s => `
    <div class="stat-card">
      <div style="font-size:28px;margin-bottom:8px">${s.icon}</div>
      <div class="stat-value" data-count="${typeof s.value === 'number' ? s.value : 0}">${typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
}

function startOrganizerRequestsListener() {
  if (organizerRequestsUnsubscribe) {
    organizerRequestsUnsubscribe();
    organizerRequestsUnsubscribe = null;
  }

  organizerRequestState.loading = true;
  renderOrganizerRequests();

  if (!db) {
    organizerRequestState.requests = [];
    organizerRequestState.loading = false;
    renderOrganizerRequests();
    renderAdminStats();
    return;
  }

  const query = db.collection('organizer_requests').where('status', '==', 'pending');
  organizerRequestsUnsubscribe = query.onSnapshot(snapshot => {
    const previousIds = new Set(organizerRequestState.requests.map(request => request.uid));
    organizerRequestState.requests = snapshot.docs.map(normalizeOrganizerRequestDoc).sort((a, b) => {
      const aTime = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : 0;
      const bTime = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : 0;
      return bTime - aTime;
    });
    organizerRequestState.loading = false;
    renderOrganizerRequests();
    renderAdminStats();

    if (organizerRequestState.initialized) {
      organizerRequestState.requests.forEach(request => {
        if (!previousIds.has(request.uid)) {
          toast.info('New organizer request', `${request.name} requested organizer access.`);
        }
      });
    } else {
      organizerRequestState.initialized = true;
    }
  }, error => {
    organizerRequestState.requests = [];
    organizerRequestState.loading = false;
    renderOrganizerRequests();
    renderAdminStats();
    toast.error('Requests unavailable', error?.message || 'Unable to watch organizer requests.');
  });
}

function renderOrganizerRequests() {
  const el = document.getElementById('admin-organizer-requests-list');
  if (!el) return;

  if (organizerRequestState.loading) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Loading organizer requests...</div><div class="empty-desc">Please wait while Firestore data loads.</div></div>`;
    return;
  }

  if (organizerRequestState.requests.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No pending organizer requests.</div><div class="empty-desc">New requests from members will appear here.</div></div>`;
    return;
  }

  el.innerHTML = organizerRequestState.requests.map(request => `
    <div class="approval-card">
      <div style="font-size:28px">⚡</div>
      <div class="approval-info">
        <div class="approval-name">${escapeHtml(request.name)}</div>
        <div class="approval-meta">${escapeHtml(request.email)} · Requested ${formatAdminJoinedDate(request.requestedAt)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">Reason: “${escapeHtml(request.reason)}”</div>
      </div>
      <div class="approval-actions">
        <button class="btn btn-primary btn-sm" onclick='handleOrganizerRequest("approve", ${JSON.stringify(request.uid)}, ${JSON.stringify(request.name)})'>✅ Approve</button>
        <button class="btn btn-danger btn-sm" onclick='openOrganizerRejectModal(${JSON.stringify(request.uid)}, ${JSON.stringify(request.name)})'>❌ Reject</button>
      </div>
    </div>
  `).join('');
}

function openOrganizerRejectModal(uid, name) {
  pendingOrganizerReject = { uid, name };
  const modal = document.getElementById('organizer-reject-modal');
  const title = document.getElementById('organizer-reject-modal-title');
  const reasonInput = document.getElementById('organizer-reject-reason');

  if (title) title.textContent = `Reject ${name}?`;
  if (reasonInput) reasonInput.value = '';
  if (modal) modal.style.display = 'flex';
  if (reasonInput) setTimeout(() => reasonInput.focus(), 50);
}

function closeOrganizerRejectModal() {
  pendingOrganizerReject = null;
  const modal = document.getElementById('organizer-reject-modal');
  if (modal) modal.style.display = 'none';
}

async function submitOrganizerRejectModal() {
  if (!pendingOrganizerReject) return;
  const reasonInput = document.getElementById('organizer-reject-reason');
  const reason = reasonInput?.value.trim() || '';
  const { uid, name } = pendingOrganizerReject;
  closeOrganizerRejectModal();
  await handleOrganizerRequest('reject', uid, name, reason);
}

async function loadAdminUsers() {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  adminPanelState.usersLoading = true;
  el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Loading users...</div><div class="empty-desc">Fetching user profiles from Firestore.</div></div>`;

  try {
    if (!db) throw new Error('Firestore unavailable.');
    const snapshot = await db.collection('users').get();
    adminPanelState.users = snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name || 'User',
        email: data.email || 'No email',
        role: data.role || 'member',
        joined: formatAdminJoinedDate(data.joinedAt || data.createdAt),
        status: data.status || (data.suspended ? 'suspended' : 'active'),
      };
    });
  } catch (error) {
    adminPanelState.users = [
      { id:'demo-aarav', name:'Aarav Mehta',  email:'aarav@iiith.ac.in',  role:'member',   joined:'Jul 28, 2025', status:'active' },
      { id:'demo-priya', name:'Priya Sharma', email:'priya@gdg.dev',       role:'organizer', joined:'Jun 12, 2025', status:'active' },
      { id:'demo-karthik', name:'Karthik Nair', email:'karthik@ieee.org',    role:'organizer', joined:'May 5, 2025',  status:'active' },
      { id:'demo-sneha', name:'Sneha Reddy',  email:'sneha@cbit.ac.in',    role:'member',   joined:'Jul 10, 2025', status:'active' },
      { id:'demo-rohan', name:'Rohan Verma',  email:'rohan@nexoverse.dev',    role:'admin',     joined:'Jan 1, 2025',  status:'active' },
      { id:'demo-ananya', name:'Ananya Patel', email:'ananya@design.io',    role:'organizer', joined:'Mar 22, 2025', status:'suspended' },
    ];
  } finally {
    adminPanelState.usersLoading = false;
    el.innerHTML = adminPanelState.users.map(u => `
    <div class="admin-user-row">
      <div class="avatar avatar-md" style="background:var(--gradient-primary)">${u.name.split(' ').map(w=>w[0]).join('')}</div>
      <div class="admin-user-info flex-1">
        <div class="admin-user-name">${u.name}</div>
        <div class="admin-user-email">${u.email} · Joined ${u.joined}</div>
      </div>
      <span class="badge ${u.role==='admin'?'badge-yellow':u.role==='organizer'?'badge-purple':'badge-blue'}">${u.role}</span>
      <span class="badge ${u.status==='active'?'badge-green':'badge-pink'}" style="margin-left:8px">${u.status}</span>
      <div class="admin-user-actions" style="margin-left:12px">
        <button class="btn btn-ghost btn-sm" onclick='openAdminUserEditModal(${JSON.stringify(u.id)})'>✏️</button>
        <button class="btn btn-danger btn-sm" onclick='toggleAdminUserSuspend(${JSON.stringify(u.id)})'>${u.status === 'suspended' ? '✅' : '🚫'}</button>
      </div>
    </div>`).join('');
    renderAdminRoleBreakdown();
  }
}

function renderAdminApprovals() {
  const el = document.getElementById('admin-approvals-list');
  if (!el) return;
  if (adminCommunityApprovalState.loading) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Loading pending communities...</div><div class="empty-desc">Please wait while Firestore data loads.</div></div>`;
    return;
  }

  const all = adminCommunityApprovalState.pendingCommunities;

  if (all.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No pending community approvals.</div><div class="empty-desc">New community submissions will appear here.</div></div>`;
    return;
  }

  el.innerHTML = all.map(item => `
    <div class="approval-card mb-3" id="approval-${item.id}">
      <div style="font-size:28px">${item.emoji}</div>
      <div class="approval-info">
        <div class="approval-name">${escapeHtml(item.name)}</div>
        <div class="approval-meta">Community · ${escapeHtml(item.category)} · By ${escapeHtml(item.organizerName)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Created ${formatDate(item.createdAt)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Status · ${item.status}</div>
      </div>
      <div class="approval-actions">
        <button class="btn btn-primary btn-sm" onclick='adminApprove(${JSON.stringify(item.id)}, ${JSON.stringify(item.name)})'>✅ Approve</button>
        <button class="btn btn-danger btn-sm"  onclick='adminReject(${JSON.stringify(item.id)})'>✕ Reject</button>
      </div>
    </div>`).join('');
}

function renderRecentApprovedCommunities() {
  const el = document.getElementById('admin-recent-approved-list');
  if (!el) return;

  if (adminCommunityApprovalState.loading) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Loading recent approvals...</div><div class="empty-desc">Please wait while Firestore data loads.</div></div>`;
    return;
  }

  const items = adminCommunityApprovalState.approvedCommunities;
  if (items.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🌐</div><div class="empty-title">No recent approvals.</div><div class="empty-desc">Approved communities will appear here.</div></div>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-icon-wrap" style="background:rgba(74,222,128,0.1);font-size:18px">${item.emoji}</div>
      <div class="activity-body">
        <div class="activity-title">${item.name} <span class="badge badge-green" style="font-size:9px">Community</span></div>
        <div style="font-size:12px;color:var(--text-secondary)">By ${item.organizerName}</div>
        <div class="activity-time">${formatDateTime(item.createdAt)}</div>
      </div>
      <div style="color:var(--green-400);font-size:18px">✅</div>
    </div>
  `).join('');
}

async function adminApprove(id, name, options = {}) {
  const silent = !!options.silent;
  const el = document.getElementById('approval-'+id);
  if (!db) {
    toast.error('Approval failed', 'Firestore is unavailable right now.');
    return;
  }

  const item = adminCommunityApprovalState.pendingCommunities.find(c => c.id === id);

  try {
    await db.collection('communities').doc(id).update({
      status: 'approved',
      isApproved: true,
    });
    adminCommunityApprovalState.pendingCommunities = adminCommunityApprovalState.pendingCommunities.filter(item => item.id !== id);
    if (item) {
      adminCommunityApprovalState.approvedCommunities = [{
        ...item,
        status: 'approved',
        createdAt: item.createdAt || new Date(),
      }, ...adminCommunityApprovalState.approvedCommunities].slice(0, 4);
    }
    if (el) {
      el.remove();
    }
    renderAdminStats();
    renderRecentApprovedCommunities();
    if (!silent) {
      toast.success('Approved!', `${name} is now live on the platform.`);
    }
  } catch (error) {
    toast.error('Approval failed', error?.message || 'Unable to approve community.');
  }
}

async function adminReject(id) {
  const el = document.getElementById('approval-'+id);
  const item = adminCommunityApprovalState.pendingCommunities.find(c => c.id === id);
  if (!db) {
    toast.error('Rejection failed', 'Firestore is unavailable right now.');
    return;
  }

  try {
    await db.collection('communities').doc(id).update({
      status: 'rejected',
      isApproved: false,
    });
    adminCommunityApprovalState.pendingCommunities = adminCommunityApprovalState.pendingCommunities.filter(c => c.id !== id);
    if (el) {
      el.remove();
    }
    renderAdminStats();
    toast.error('Rejected', `${item?.name || 'Community'} has been declined.`);
  } catch (error) {
    toast.error('Rejection failed', error?.message || 'Unable to reject community.');
  }
}

async function approveAllCommunityApprovals() {
  const pending = [...adminCommunityApprovalState.pendingCommunities];
  if (pending.length === 0) {
    toast.info('Nothing pending', 'No pending community approvals.');
    return;
  }

  for (const item of pending) {
    await adminApprove(item.id, item.name, { silent: true });
  }
  toast.success('All Approved! ✅', `${pending.length} community item(s) approved and are now live.`);
}

async function handleOrganizerRequest(action, uid, name = 'User', rejectionReason = '') {
  if (!db) {
    toast.error('Request failed', 'Firestore is unavailable right now.');
    return;
  }

  try {
    const requestRef = db.collection('organizer_requests').doc(uid);
    const userRef = db.collection('users').doc(uid);

    if (action === 'approve') {
      await requestRef.set({
        uid,
        name,
        status: 'approved',
        rejectionReason: '',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await userRef.set({
        role: 'organizer',
        organizerAccess: true,
        organizerRequestStatus: 'approved',
        organizerRequestRejectionReason: '',
      }, { merge: true });

      const current = getCurrentUser();
      if (current?.uid === uid) {
        setCurrentUser({
          ...current,
          role: 'organizer',
          organizerAccess: true,
          organizerRequestStatus: 'approved',
          organizerRequestRejectionReason: '',
        });
      }

      toast.success('Approved', `${name} can now create communities and events.`);
    } else {
      await requestRef.set({
        uid,
        name,
        status: 'rejected',
        rejectionReason,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await userRef.set({
        organizerRequestStatus: 'rejected',
        organizerRequestRejectionReason: rejectionReason,
      }, { merge: true });

      toast.error('Rejected', `${name}'s organizer request was rejected.`);
    }

    startOrganizerRequestsListener();
    loadAdminUsers();
  } catch (error) {
    toast.error('Request review failed', error?.message || 'Unable to review organizer request.');
  }
}

window.adminApprove = adminApprove;
window.adminReject = adminReject;
window.handleOrganizerRequest = handleOrganizerRequest;
window.openOrganizerRejectModal = openOrganizerRejectModal;
window.closeOrganizerRejectModal = closeOrganizerRejectModal;
window.submitOrganizerRejectModal = submitOrganizerRejectModal;
window.requestOrganizerAccess = requestOrganizerAccess;
window.switchAdminTab = switchAdminTab;
window.startOrganizerRequestsListener = startOrganizerRequestsListener;
window.renderOrganizerRequests = renderOrganizerRequests;
window.approveAllCommunityApprovals = approveAllCommunityApprovals;
window.editAdminUser = editAdminUser;
window.toggleAdminUserSuspend = toggleAdminUserSuspend;
window.openAdminUserEditModal = openAdminUserEditModal;
window.closeAdminUserEditModal = closeAdminUserEditModal;
window.submitAdminUserEditModal = submitAdminUserEditModal;
window.openAdminUserSuspendModal = openAdminUserSuspendModal;
window.closeAdminUserSuspendModal = closeAdminUserSuspendModal;
window.submitAdminUserSuspendModal = submitAdminUserSuspendModal;
