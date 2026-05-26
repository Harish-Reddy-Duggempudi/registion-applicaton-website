// =============================================
// NEXORA — Communities Module
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('communities.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initCommunitiesPage();
  }
  if (window.location.pathname.includes('community-details.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initCommunityDetailsPage();
  }
  if (window.location.pathname.includes('create-community.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initCreateCommunityPage();
  }
});

// ── Communities List Page ─────────────────────
function initCommunitiesPage() {
  renderCommunityCards('all');
  initCommunityFilters();
  initCommunitySearch();
  initTabsManual();
}

function renderCommunityCards(filter, searchQuery = '') {
  const grid = document.getElementById('communities-grid');
  if (!grid) return;

  // Show skeletons first
  createSkeletonCards(grid, 6, 260);

  setTimeout(() => {
    let list = DataStore.getCommunities();
    if (filter && filter !== 'all') list = list.filter(c => c.category.toLowerCase() === filter.toLowerCase());
    if (searchQuery) list = DataStore.searchCommunities(searchQuery);

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🌐</div>
          <div class="empty-title">No communities found</div>
          <div class="empty-desc">Try a different search or filter, or create your own community!</div>
          <a href="create-community.html" class="btn btn-primary mt-3">+ Create Community</a>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(c => buildCommunityCard(c)).join('');
  }, 600);
}

function buildCommunityCard(c) {
  const user = getCurrentUser();
  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  return `
    <div class="community-card" data-category="${c.category}" onclick="window.location='community-details.html?id=${c.id}'">
      <div class="community-card-banner" style="background:${c.banner};height:90px">
        <div class="community-card-logo">${c.emoji}</div>
      </div>
      <div class="community-card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div class="community-card-name">${c.name}</div>
          <span class="badge badge-purple" style="flex-shrink:0">${c.category}</span>
        </div>
        <div class="community-card-desc">${c.desc}</div>
        <div class="community-card-meta">
          <span class="community-card-members">👥 ${c.members.toLocaleString()} members</span>
          <span class="text-muted text-xs">🗓️ ${c.events} events</span>
        </div>
        <div class="divider" style="margin:12px 0"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm w-full" onclick="event.stopPropagation();joinCommunity('${c.id}','${c.name}')">
            🌟 Join
          </button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window.location='community-details.html?id=${c.id}'">
            View →
          </button>
        </div>
      </div>
    </div>`;
}

function initCommunityFilters() {
  const chips = document.querySelectorAll('.communities-filter .filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const searchInput = document.getElementById('community-search');
      renderCommunityCards(chip.dataset.filter, searchInput?.value || '');
    });
  });
}

function initCommunitySearch() {
  const input = document.getElementById('community-search');
  if (!input) return;
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const activeFilter = document.querySelector('.communities-filter .filter-chip.active')?.dataset.filter || 'all';
      renderCommunityCards(activeFilter, input.value);
    }, 350);
  });
}

function initTabsManual() {
  // My Communities tab vs Explore tab
  const tabs = document.querySelectorAll('[data-tab-target]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tabTarget;
      document.querySelectorAll('[data-tab-panel]').forEach(p => {
        p.style.display = p.dataset.tabPanel === target ? '' : 'none';
      });
    });
  });
}

function joinCommunity(id, name) {
  const user = getCurrentUser();
  if (!user) { toast.error('Login required', 'Please sign in to join communities.'); return; }
  toast.success(`Joined ${name}! 🎉`, 'You are now a member of this community.');
}

// ── Community Details Page ────────────────────
function initCommunityDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id') || 'c1';
  const community = DataStore.getCommunity(id);

  if (!community) {
    document.getElementById('community-detail-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Community not found</div>
        <a href="communities.html" class="btn btn-primary mt-3">Browse Communities</a>
      </div>`;
    return;
  }

  renderCommunityDetail(community);
}

function renderCommunityDetail(c) {
  const el = document.getElementById('community-detail-content');
  if (!el) return;

  const user = getCurrentUser();
  const canManage = user?.role === 'organizer' || user?.role === 'admin';

  const communityEvents = DataStore.getEvents().filter(e => e.communityId === c.id);

  el.innerHTML = `
    <!-- Banner -->
    <div class="community-banner" style="background:${c.banner}">
      <div class="community-banner-overlay"></div>
    </div>

    <!-- Header -->
    <div class="community-detail-header">
      <div class="community-detail-logo">${c.emoji}</div>
      <div class="community-detail-info">
        <div class="community-detail-name">${c.name}</div>
        <div class="community-detail-meta">
          <span class="badge badge-purple">${c.category}</span>
          <span class="community-detail-stat">👥 ${c.members.toLocaleString()} members</span>
          <span class="community-detail-stat">🗓️ ${c.events} events</span>
          <span class="community-detail-stat">👤 By ${c.organizer}</span>
        </div>
      </div>
      <div class="community-detail-actions">
        <button class="btn btn-primary" onclick="joinCommunity('${c.id}','${c.name}')">🌟 Join Community</button>
        <button class="btn btn-ghost btn-icon" title="Share">🔗</button>
        ${canManage ? `<button class="btn btn-outline btn-sm" onclick="window.location='create-event.html?community=${c.id}'">+ Create Event</button>` : ''}
      </div>
    </div>

    <!-- Body -->
    <div style="display:grid;grid-template-columns:1fr 300px;gap:28px;align-items:start" class="community-body-grid">
      <!-- Main -->
      <div>
        <!-- About -->
        <div class="card mb-4">
          <div class="section-title mb-3">📋 About</div>
          <p style="color:var(--text-secondary);font-size:14px;line-height:1.8">${c.desc}</p>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            ${c.tags.map(t=>`<span class="badge badge-blue">${t}</span>`).join('')}
          </div>
        </div>

        <!-- Events -->
        <div class="card">
          <div class="section-header">
            <div class="section-title">🎯 Community Events</div>
            ${canManage ? `<a href="create-event.html?community=${c.id}" class="btn btn-primary btn-sm">+ Create</a>` : ''}
          </div>
          ${communityEvents.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No events yet</div><div class="empty-desc">This community hasn't created any events yet.</div></div>`
            : communityEvents.map(e => `
              <div class="ticket-card mb-3" style="cursor:pointer" onclick="window.location='event-details.html?id=${e.id}'">
                <div class="ticket-icon" style="background:rgba(168,85,247,0.1)">${e.emoji}</div>
                <div class="ticket-info">
                  <div class="ticket-name">${e.title}</div>
                  <div class="ticket-detail">${formatDate(e.date)} · ${e.isOnline ? '🌐 Online' : '📍 '+e.venue.split(',')[0]}</div>
                </div>
                <span class="badge ${e.isFree ? 'badge-green' : 'badge-purple'}">${e.isFree ? 'Free' : '₹'+e.price}</span>
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- Sidebar -->
      <div>
        <div class="card mb-4">
          <div class="section-title mb-4">📊 Stats</div>
          ${[
            { label:'Members',    value: c.members.toLocaleString(), icon:'👥' },
            { label:'Events Run', value: c.events, icon:'🎯' },
            { label:'Founded',    value: formatDate(c.founded), icon:'📅' },
            { label:'Category',   value: c.category, icon:'🏷️' },
          ].map(s => `
            <div class="activity-item" style="padding:10px 0">
              <div class="activity-icon-wrap" style="background:rgba(168,85,247,0.1)">${s.icon}</div>
              <div class="activity-body">
                <div class="activity-title">${s.label}</div>
                <div class="text-sm font-semibold">${s.value}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="card">
          <div class="section-title mb-4">👥 Recent Members</div>
          ${['Aarav M.','Priya S.','Karthik N.','Sneha R.','Rahul V.','Ananya P.'].map((name, i) => `
            <div class="attendee-row" style="border-bottom:1px solid var(--border);padding:10px 0">
              <div class="avatar avatar-sm" style="background:var(--gradient-primary)">${name.split(' ').map(w=>w[0]).join('')}</div>
              <div class="attendee-info">
                <div class="attendee-name">${name}</div>
                <div class="attendee-email">Joined ${['today','yesterday','2d ago','3d ago','1w ago','2w ago'][i]}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Responsive: stack on mobile
  const style = document.createElement('style');
  style.textContent = `@media(max-width:768px){.community-body-grid{grid-template-columns:1fr!important}}`;
  document.head.appendChild(style);
}

// ── Create Community Page ─────────────────────
function initCreateCommunityPage() {
  const user = getCurrentUser();
  if (user?.role === 'student') {
    toast.warning('Restricted', 'Only organizers can create communities.');
  }

  const form = document.getElementById('create-community-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.classList.add('loading');

    await new Promise(r => setTimeout(r, 1200));

    const name = form.querySelector('#c-name').value;
    toast.success('Community Created! 🎉', `${name} has been submitted for review.`);
    submitBtn.classList.remove('loading');

    setTimeout(() => window.location.href = 'communities.html', 1500);
  });
}
