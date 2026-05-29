// =============================================
// NEXOVERSE — Communities Module
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

const COMMUNITY_BANNERS = {
  Google: 'linear-gradient(135deg,#4285F4,#34A853)',
  Microsoft: 'linear-gradient(135deg,#00A4EF,#7FBA00)',
  ACM: 'linear-gradient(135deg,#7c3aed,#2563eb)',
  IEEE: 'linear-gradient(135deg,#0891b2,#0e7490)',
  Design: 'linear-gradient(135deg,#ec4899,#f97316)',
  Entrepreneurship: 'linear-gradient(135deg,#f59e0b,#ef4444)',
  Other: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
};

const communityPageState = {
  approvedCommunities: [],
  approvedLoaded: false,
  approvedLoading: false,
  approvedError: '',
  memberCommunityIds: new Set(),
  joiningCommunityIds: new Set(),
  myCommunities: [],
  myLoaded: false,
  myLoading: false,
  myError: '',
  filter: 'all',
  search: '',
};

function getFallbackCommunityBanner(category) {
  return COMMUNITY_BANNERS[category] || COMMUNITY_BANNERS.Other;
}

function getCommunityMemberCount(data) {
  if (typeof data.memberCount === 'number') return data.memberCount;
  if (Array.isArray(data.members)) return data.members.length;
  return 0;
}

function formatCommunityDate(value) {
  if (!value) return 'Recently';
  if (typeof value.toDate === 'function') return formatCommunityDate(value.toDate());
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'string') return value;
  return 'Recently';
}

function toDateValue(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatJoinedRelativeTime(value) {
  const joinedDate = toDateValue(value);
  if (!joinedDate) return 'Recently';

  const diffMs = Date.now() - joinedDate.getTime();
  if (diffMs <= 0) return 'Just now';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function getMembershipDocId(communityId, userId) {
  return `${communityId}_${userId}`;
}

function getCommunityMembershipRef(communityId, userId) {
  return db.collection('community_members').doc(getMembershipDocId(communityId, userId));
}

function getCommunityDetailsUrl(communityId) {
  return `community-details.html?id=${encodeURIComponent(communityId)}`;
}

function getCommunityEditUrl(communityId) {
  return `create-community.html?edit=${encodeURIComponent(communityId)}`;
}

function normalizeCommunityDoc(doc) {
  const data = doc.data() || {};
  const category = data.category || 'Other';
  const memberCount = getCommunityMemberCount(data);
  const description = data.description || data.desc || '';

  return {
    id: doc.id,
    name: data.name || 'Untitled Community',
    description,
    desc: description,
    category,
    emoji: data.emoji || '🌐',
    banner: data.banner || getFallbackCommunityBanner(category),
    logo: data.logo || '',
    website: data.website || '',
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    github: data.github || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    college: data.college || '',
    city: data.city || '',
    organizerId: data.organizerId || data.organizer_uid || '',
    organizerName: data.organizerName || data.organizer || 'NEXOVERSE',
    organizerEmail: data.organizerEmail || '',
    organizer: data.organizerName || data.organizer || 'NEXOVERSE',
    memberCount,
    members: memberCount,
    events: Number(data.events || data.eventsCount || 0),
    createdAt: data.createdAt || null,
    founded: data.createdAt || data.founded || null,
    status: data.status || '',
    isApproved: data.isApproved !== false,
  };
}

function normalizeEventDoc(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || 'Untitled Event',
    emoji: data.emoji || '🎯',
    date: data.date || '',
    time: data.time || '',
    venue: data.venue || '',
    isOnline: !!data.isOnline,
    isFree: data.isFree !== false,
    price: data.price || 0,
    organizer: data.organizer || '',
    communityId: data.communityId || '',
    isApproved: data.isApproved !== false,
  };
}

function renderGridState(grid, state, options = {}) {
  if (!grid) return;
  const columns = options.columns || 6;
  const skeletonHeight = options.skeletonHeight || 260;

  if (state === 'loading') {
    createSkeletonCards(grid, columns, skeletonHeight);
    return;
  }

  if (state === 'error') {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">${options.title || 'Failed to load communities.'}</div>
        <div class="empty-desc">${options.message || 'Please try again in a moment.'}</div>
        ${options.action || ''}
      </div>`;
    return;
  }

  if (state === 'empty') {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🌐</div>
        <div class="empty-title">${options.title || 'No communities found.'}</div>
        <div class="empty-desc">${options.message || 'Try a different search or filter.'}</div>
        ${options.action || ''}
      </div>`;
  }
}

async function hydrateCommunityMemberCounts(communities) {
  if (!db || !Array.isArray(communities) || communities.length === 0) return communities;

  const counts = await Promise.all(communities.map(async community => {
    try {
      const snapshot = await db.collection('community_members').where('communityId', '==', community.id).get();
      const uniqueUserIds = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        if (data.userId) uniqueUserIds.add(data.userId);
      });
      return { id: community.id, count: uniqueUserIds.size };
    } catch (error) {
      return { id: community.id, count: community.memberCount || community.members || 0 };
    }
  }));

  const countMap = new Map(counts.map(item => [item.id, item.count]));
  return communities.map(community => ({
    ...community,
    memberCount: countMap.get(community.id) ?? community.memberCount,
    members: countMap.get(community.id) ?? community.members,
  }));
}

function filterLoadedCommunities(filter, searchQuery) {
  let list = [...communityPageState.approvedCommunities];
  if (filter && filter !== 'all') {
    list = list.filter(c => (c.category || '').toLowerCase() === filter.toLowerCase());
  }
  const query = (searchQuery || '').trim().toLowerCase();
  if (query) {
    list = list.filter(c => {
      const haystack = [c.name, c.category, c.description].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }
  return list;
}

function getTrendingCommunities(limit = 6) {
  return [...communityPageState.approvedCommunities]
    .sort((a, b) => {
      const aMembers = typeof a.memberCount === 'number' ? a.memberCount : 0;
      const bMembers = typeof b.memberCount === 'number' ? b.memberCount : 0;
      if (bMembers !== aMembers) return bMembers - aMembers;

      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

function renderTrendingCommunities() {
  const grid = document.getElementById('trending-communities-grid');
  if (!grid) return;

  if (communityPageState.approvedLoading) {
    renderGridState(grid, 'loading', { columns: 3, skeletonHeight: 260 });
    return;
  }

  if (communityPageState.approvedError && !communityPageState.approvedCommunities.length) {
    renderGridState(grid, 'error', {
      title: 'Failed to load trending communities.',
      message: communityPageState.approvedError,
      action: '<button class="btn btn-primary mt-3" onclick="window.location.reload()">Retry</button>',
    });
    return;
  }

  const list = getTrendingCommunities();
  if (list.length === 0) {
    renderGridState(grid, 'empty', {
      title: 'No trending communities yet.',
      message: 'Trending communities will appear here once people start joining.',
    });
    return;
  }

  grid.innerHTML = list.map((community, index) => `
    <div style="position:relative">
      <div style="position:absolute;top:12px;left:12px;z-index:2" class="badge badge-purple">#${index + 1}</div>
      ${buildCommunityCard(community)}
    </div>
  `).join('');
}

// ── Communities List Page ─────────────────────
function initCommunitiesPage() {
  initCommunityFilters();
  initCommunitySearch();
  initTabsManual();
  loadApprovedCommunities();
  loadMyCommunities();
}

function renderCommunityCards(filter, searchQuery = '') {
  communityPageState.filter = filter || 'all';
  communityPageState.search = searchQuery || '';
  const grid = document.getElementById('communities-grid');
  if (!grid) return;

  if (communityPageState.approvedLoading) {
    renderGridState(grid, 'loading', { columns: 6, skeletonHeight: 260 });
    return;
  }

  if (communityPageState.approvedError && !communityPageState.approvedCommunities.length) {
    renderGridState(grid, 'error', {
      title: 'Failed to load communities.',
      message: communityPageState.approvedError,
      action: '<button class="btn btn-primary mt-3" onclick="window.location.reload()">Retry</button>',
    });
    return;
  }

  const list = filterLoadedCommunities(filter, searchQuery);
  if (list.length === 0) {
    renderGridState(grid, 'empty', {
      title: 'No communities found.',
      message: 'Try a different search or filter, or create your own community!',
      action: '<a href="create-community.html" class="btn btn-primary mt-3">+ Create Community</a>',
    });
    return;
  }

  grid.innerHTML = list.map(c => buildCommunityCard(c)).join('');
}

async function loadApprovedCommunities() {
  const grid = document.getElementById('communities-grid');
  communityPageState.approvedLoading = true;
  communityPageState.approvedError = '';
  renderGridState(grid, 'loading', { columns: 6, skeletonHeight: 260 });

  try {
    if (!db) throw new Error('Firestore is unavailable right now.');
    const snapshot = await db.collection('communities').where('isApproved', '==', true).get();
    communityPageState.approvedCommunities = snapshot.docs.map(normalizeCommunityDoc).sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    communityPageState.approvedCommunities = await hydrateCommunityMemberCounts(communityPageState.approvedCommunities);
    communityPageState.approvedLoaded = true;
    communityPageState.approvedLoading = false;
    renderCommunityCards(communityPageState.filter, communityPageState.search);
    renderTrendingCommunities();
  } catch (error) {
    communityPageState.approvedLoading = false;
    communityPageState.approvedError = error?.message || 'Failed to load communities.';
    renderGridState(grid, 'error', {
      title: 'Failed to load communities.',
      message: communityPageState.approvedError,
      action: '<button class="btn btn-primary mt-3" onclick="window.location.reload()">Retry</button>',
    });
  }
}

async function loadMyCommunities() {
  const grid = document.getElementById('my-communities-grid');
  if (!grid) return;

  communityPageState.myLoading = true;
  communityPageState.myError = '';
  renderGridState(grid, 'loading', { columns: 3, skeletonHeight: 240 });

  try {
    if (!db) throw new Error('Firestore is unavailable right now.');
    const user = getCurrentUser();
    if (!user?.uid) throw new Error('User profile not available.');

    const memberships = await db.collection('community_members').where('userId', '==', user.uid).get();
    const communityIds = [...new Set(memberships.docs.map(doc => (doc.data() || {}).communityId).filter(Boolean))];
    communityPageState.memberCommunityIds = new Set(communityIds);

    if (communityIds.length === 0) {
      communityPageState.myCommunities = [];
      communityPageState.myLoaded = true;
      communityPageState.myLoading = false;
      if (communityPageState.approvedLoaded) {
        renderCommunityCards(communityPageState.filter, communityPageState.search);
      }
      renderGridState(grid, 'empty', {
        title: 'No communities yet',
        message: 'Explore and join your first community!',
        action: '<button class="btn btn-primary mt-3" onclick="document.getElementById(\'explore-tab\').click()">Explore Communities</button>',
      });
      return;
    }

    const communityDocs = await Promise.all(communityIds.map(id => db.collection('communities').doc(id).get()));
    communityPageState.myCommunities = communityDocs
      .filter(doc => doc.exists)
      .map(normalizeCommunityDoc)
      .filter(c => c.isApproved);
    communityPageState.myCommunities = await hydrateCommunityMemberCounts(communityPageState.myCommunities);
    communityPageState.myLoaded = true;
    communityPageState.myLoading = false;
    if (communityPageState.approvedLoaded) {
      renderCommunityCards(communityPageState.filter, communityPageState.search);
    }
    renderMyCommunities();
  } catch (error) {
    communityPageState.myLoading = false;
    communityPageState.myError = error?.message || 'Failed to load communities.';
    renderGridState(grid, 'error', {
      title: 'Failed to load communities.',
      message: communityPageState.myError,
      action: '<button class="btn btn-primary mt-3" onclick="window.location.reload()">Retry</button>',
    });
  }
}

function renderMyCommunities() {
  const grid = document.getElementById('my-communities-grid');
  if (!grid) return;

  if (communityPageState.myLoading) {
    renderGridState(grid, 'loading', { columns: 3, skeletonHeight: 240 });
    return;
  }

  if (communityPageState.myError && !communityPageState.myCommunities.length) {
    renderGridState(grid, 'error', {
      title: 'Failed to load communities.',
      message: communityPageState.myError,
      action: '<button class="btn btn-primary mt-3" onclick="window.location.reload()">Retry</button>',
    });
    return;
  }

  if (communityPageState.myCommunities.length === 0) {
    renderGridState(grid, 'empty', {
      title: 'No communities yet',
      message: 'Explore and join your first community!',
      action: '<button class="btn btn-primary mt-3" onclick="document.getElementById(\'explore-tab\').click()">Explore Communities</button>',
    });
    return;
  }

  grid.innerHTML = communityPageState.myCommunities.map(c => buildJoinedCommunityCard(c)).join('');
}

function buildJoinedCommunityCard(c) {
  const members = typeof c.memberCount === 'number' ? c.memberCount : (typeof c.members === 'number' ? c.members : 0);
  const events = typeof c.events === 'number' ? c.events : 0;
  const description = c.description || c.desc || '';
  return `
    <div class="community-card" onclick="window.location='${getCommunityDetailsUrl(c.id)}'">
      <div class="community-card-banner" style="background:${c.banner || getFallbackCommunityBanner(c.category)};height:90px">
        <div class="community-card-logo">${c.emoji}</div>
      </div>
      <div class="community-card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div class="community-card-name">${c.name}</div>
          <span class="badge badge-green" style="flex-shrink:0">✅ Joined</span>
        </div>
        <div class="community-card-desc">${description}</div>
        <div class="community-card-meta">
          <span class="community-card-members">👥 ${members.toLocaleString()} members</span>
          <span class="text-muted text-xs">🗓️ ${events} events</span>
        </div>
        <div class="divider" style="margin:12px 0"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm w-full" onclick='event.stopPropagation();leaveCommunity(${JSON.stringify(c.id)}, ${JSON.stringify(c.name)})'>
            Leave
          </button>
          <button class="btn btn-ghost btn-sm" onclick='event.stopPropagation();window.location="${getCommunityDetailsUrl(c.id)}"'>
            View →
          </button>
        </div>
      </div>
    </div>`;
}

function buildCommunityCard(c) {
  const user = getCurrentUser();
  const description = c.description || c.desc || '';
  const members = typeof c.memberCount === 'number' ? c.memberCount : (typeof c.members === 'number' ? c.members : 0);
  const events = typeof c.events === 'number' ? c.events : 0;
  const isMember = communityPageState.memberCommunityIds.has(c.id);
  const isJoining = communityPageState.joiningCommunityIds.has(c.id);
  return `
    <div class="community-card" data-category="${c.category}" onclick="window.location='${getCommunityDetailsUrl(c.id)}'">
      <div class="community-card-banner" style="background:${c.banner || getFallbackCommunityBanner(c.category)};height:90px">
        <div class="community-card-logo">${c.emoji}</div>
      </div>
      <div class="community-card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div class="community-card-name">${c.name}</div>
          <span class="badge badge-purple" style="flex-shrink:0">${c.category}</span>
        </div>
        <div class="community-card-desc">${description}</div>
        <div class="community-card-meta">
          <span class="community-card-members">👥 ${members.toLocaleString()} members</span>
          <span class="text-muted text-xs">🗓️ ${events} events</span>
        </div>
        <div class="divider" style="margin:12px 0"></div>
        <div style="display:flex;gap:8px">
          ${isMember ? `
            <button class="btn btn-ghost btn-sm w-full" disabled style="opacity:1;cursor:default">
              ✅ Joined
            </button>
          ` : isJoining ? `
            <button class="btn btn-ghost btn-sm w-full" disabled style="opacity:1;cursor:default">
              ⏳ Joining...
            </button>
          ` : `
            <button class="btn btn-primary btn-sm w-full" onclick='event.stopPropagation();joinCommunity(${JSON.stringify(c.id)}, ${JSON.stringify(c.name)})'>
              🌟 Join
            </button>
          `}
          <button class="btn btn-ghost btn-sm" onclick='event.stopPropagation();window.location="${getCommunityDetailsUrl(c.id)}"'>
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
  if (!db) {
    toast.error('Join failed', 'Firestore is unavailable right now.');
    return;
  }

  if (communityPageState.memberCommunityIds.has(id) || communityPageState.joiningCommunityIds.has(id)) {
    return;
  }

  communityPageState.joiningCommunityIds.add(id);
  renderCommunityCards(communityPageState.filter, communityPageState.search);

  const membershipRef = getCommunityMembershipRef(id, user.uid);
  const communityRef = db.collection('communities').doc(id);

  db.runTransaction(async transaction => {
    const membershipSnap = await transaction.get(membershipRef);
    if (membershipSnap.exists) {
      throw new Error('You are already a member of this community.');
    }

    const communitySnap = await transaction.get(communityRef);
    if (!communitySnap.exists) {
      throw new Error('Community not found.');
    }

    const communityData = communitySnap.data() || {};
    if (communityData.isApproved === false) {
      throw new Error('This community is still pending approval.');
    }

    transaction.set(membershipRef, {
      communityId: id,
      userId: user.uid,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(communityRef, {
      memberCount: firebase.firestore.FieldValue.increment(1),
    });
  }).then(() => {
    toast.success(`Joined ${name}! 🎉`, 'You are now a member of this community.');
    loadMyCommunities();
    loadApprovedCommunities();

    if (window.location.pathname.includes('communities.html')) {
      const mineTab = document.getElementById('mine-tab');
      if (mineTab) mineTab.click();
    }
  }).catch(error => {
    toast.error('Join failed', error?.message || 'Unable to join community.');
  }).finally(() => {
    communityPageState.joiningCommunityIds.delete(id);
    renderCommunityCards(communityPageState.filter, communityPageState.search);
  });
}

function leaveCommunity(id, name) {
  const user = getCurrentUser();
  if (!user) { toast.error('Login required', 'Please sign in to leave communities.'); return; }
  if (!db) {
    toast.error('Leave failed', 'Firestore is unavailable right now.');
    return;
  }

  const membershipRef = getCommunityMembershipRef(id, user.uid);
  const communityRef = db.collection('communities').doc(id);

  db.runTransaction(async transaction => {
    const membershipSnap = await transaction.get(membershipRef);
    if (!membershipSnap.exists) {
      throw new Error('You are not a member of this community.');
    }

    transaction.delete(membershipRef);
    transaction.update(communityRef, {
      memberCount: firebase.firestore.FieldValue.increment(-1),
    });
  }).then(() => {
    toast.success(`Left ${name}`, 'You have left this community.');
    loadMyCommunities();
    loadApprovedCommunities();
  }).catch(error => {
    toast.error('Leave failed', error?.message || 'Unable to leave community.');
  });
}

// ── Community Details Page ────────────────────
async function initCommunityDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('community-detail-content');

  if (!content) return;

  if (!id) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Community not found</div>
        <a href="communities.html" class="btn btn-primary mt-3">Browse Communities</a>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="skeleton" style="height:220px;border-radius:20px 20px 0 0"></div>
    <div style="padding:0 32px;margin-top:-40px;margin-bottom:28px;display:flex;align-items:flex-end;gap:20px">
      <div class="skeleton" style="width:80px;height:80px;border-radius:20px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding-bottom:4px">
        <div class="skeleton" style="height:28px;width:50%"></div>
        <div class="skeleton" style="height:14px;width:70%"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:24px">
      <div>
        <div class="skeleton" style="height:200px;border-radius:16px;margin-bottom:16px"></div>
        <div class="skeleton" style="height:180px;border-radius:16px"></div>
      </div>
      <div>
        <div class="skeleton" style="height:300px;border-radius:16px"></div>
      </div>
    </div>`;

  try {
    if (!db) throw new Error('Firestore is unavailable right now.');
    const snapshot = await db.collection('communities').doc(id).get();

    if (!snapshot.exists) {
      content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Community not found</div>
        <div class="empty-desc">This community may have been removed or is still pending review.</div>
        <a href="communities.html" class="btn btn-primary mt-3">Browse Communities</a>
      </div>`;
      return;
    }

    const community = normalizeCommunityDoc(snapshot);
    if (!community.isApproved) {
      content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-title">Community pending approval</div>
        <div class="empty-desc">This community is not visible until an admin approves it.</div>
        <a href="communities.html" class="btn btn-primary mt-3">Browse Communities</a>
      </div>`;
      return;
    }

      try {
          const membershipSnapshot = await db.collection('community_members').where('communityId', '==', community.id).get();
          const uniqueUserIds = new Set();
          membershipSnapshot.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.userId) uniqueUserIds.add(data.userId);
          });
          community.memberCount = uniqueUserIds.size;
          community.members = uniqueUserIds.size;
      } catch (error) {
        // Fall back to the stored count if Firestore membership lookup fails.
      }

    await renderCommunityDetail(community);
  } catch (error) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Failed to load community.</div>
        <div class="empty-desc">${error?.message || 'Please try again in a moment.'}</div>
        <a href="communities.html" class="btn btn-primary mt-3">Browse Communities</a>
      </div>`;
  }
}

async function renderCommunityDetail(c) {
  const el = document.getElementById('community-detail-content');
  if (!el) return;

  const user = getCurrentUser();
  const canManage = !!user?.uid && (user.uid === c.organizerId || user.uid === c.organizer_uid);

  // Future role rules for Community Details:
  // member: view community, join community, leave community
  // owner: view community, join community, edit community, manage community, create events

  // Future Firestore structure:
  // communities collection
  // {
  //   id: "",
  //   name: "",
  //   description: "",
  //   category: "",
  //   logo: "",
  //   banner: "",
  //   organizerId: "",
  //   memberCount: 0,
  //   createdAt: "",
  //   isApproved: true
  // }
  //
  // community_members collection
  // {
  //   communityId: "",
  //   userId: "",
  //   joinedAt: ""
  // }

  // Future event integration:
  // Each community can have upcoming events, past events, and event analytics.
  // Events should be linked using communityId.

  let communityEvents = [];
  try {
    if (db) {
      const snapshot = await db.collection('events')
        .where('communityId', '==', c.id)
        .where('isApproved', '==', true)
        .get();
      communityEvents = snapshot.docs.map(normalizeEventDoc);
    }
  } catch (error) {
    communityEvents = [];
  }

  let recentMembers = [];
  try {
    if (db) {
      const membershipSnapshot = await db.collection('community_members')
        .where('communityId', '==', c.id)
        .get();

      const uniqueMemberships = new Map();
      membershipSnapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        if (!data.userId || uniqueMemberships.has(data.userId)) return;
        uniqueMemberships.set(data.userId, data);
      });

      const sortedMemberships = Array.from(uniqueMemberships.entries())
        .map(([userId, data]) => ({ userId, joinedAt: data.joinedAt || null }))
        .sort((a, b) => {
          const aTime = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : 0;
          const bTime = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : 0;
          return bTime - aTime;
        })
        .slice(0, 6);

      const userDocs = await Promise.all(sortedMemberships.map(member => db.collection('users').doc(member.userId).get()));
      recentMembers = sortedMemberships.map((member, index) => {
        const userDoc = userDocs[index];
        const userData = userDoc?.exists ? (userDoc.data() || {}) : {};
        const name = userData.name || userData.displayName || member.userId || 'Community Member';
        return {
          name,
          avatar: userData.avatar || name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'U',
          joinedLabel: formatJoinedRelativeTime(member.joinedAt),
        };
      });
    }
  } catch (error) {
    recentMembers = [];
  }

  el.innerHTML = `
    <!-- Banner -->
    <div class="community-banner" style="background:${c.banner || getFallbackCommunityBanner(c.category)}">
      <div class="community-banner-overlay"></div>
    </div>

    <!-- Header -->
    <div class="community-detail-header">
      <div class="community-detail-logo">${c.emoji}</div>
      <div class="community-detail-info">
        <div class="community-detail-name">${c.name}</div>
        <div class="community-detail-meta">
          <span class="badge badge-purple">${c.category}</span>
          <span class="community-detail-stat">👥 ${c.memberCount.toLocaleString()} members</span>
          <span class="community-detail-stat">🗓️ ${communityEvents.length} events</span>
          <span class="community-detail-stat">👤 By ${c.organizerName || c.organizer}</span>
        </div>
      </div>
      <div class="community-detail-actions">
        <!-- Future action placeholders:
             👥 Join Community
             ⭐ Following
             📅 View Events -->
        <button class="btn btn-primary" onclick='joinCommunity(${JSON.stringify(c.id)}, ${JSON.stringify(c.name)})'>🌟 Join Community</button>
        <button class="btn btn-ghost btn-icon" title="Share">🔗</button>
           <!-- These owner controls should only be visible to the community owner.
             Members should never see them.

             Future organizer-only actions:
             ✏️ Edit Community
             👥 Manage Members
             📊 Community Analytics
             📅 Create Event
             🗑️ Delete Community -->
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="window.location='${getCommunityEditUrl(c.id)}'">✏️ Edit Community</button>
          <button class="btn btn-outline btn-sm" onclick="window.location='create-event.html?community=${encodeURIComponent(c.id)}'">+ Create Event</button>
        ` : ''}
      </div>
    </div>

    <!-- Body -->
    <div style="display:grid;grid-template-columns:1fr 300px;gap:28px;align-items:start" class="community-body-grid">
      <!-- Main -->
      <div>
        <!-- About -->
        <div class="card mb-4">
          <div class="section-title mb-3">📋 About</div>
          <p style="color:var(--text-secondary);font-size:14px;line-height:1.8">${c.description}</p>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            ${c.tags.map(t=>`<span class="badge badge-blue">${t}</span>`).join('')}
          </div>
        </div>

        <!-- Future community statistics placeholders:
             👥 Total Members
             📅 Events Hosted
             🔥 Upcoming Events
             ⭐ Community Rating -->

        <!-- Events -->
        <div class="card">
          <div class="section-header">
            <div class="section-title">🎯 Community Events</div>
            <!-- Future event integration will keep using communityId to connect events to this community. -->
            ${canManage ? `<a href="create-event.html?community=${c.id}" class="btn btn-primary btn-sm">+ Create</a>` : ''}
          </div>
          ${communityEvents.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No events yet</div><div class="empty-desc">This community hasn't created any events yet.</div></div>`
            : communityEvents.map(e => `
              <div class="ticket-card mb-3" style="cursor:pointer" onclick="window.location='event-details.html?id=${e.id}'">
                <div class="ticket-icon" style="background:rgba(168,85,247,0.1)">${e.emoji}</div>
                <div class="ticket-info">
                  <div class="ticket-name">${e.title}</div>
                  <div class="ticket-detail">${formatDate(e.date)} · ${e.isOnline ? '🌐 Online' : '📍 '+(e.venue || '').split(',')[0]}</div>
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
            { label:'Members',    value: c.memberCount.toLocaleString(), icon:'👥' },
            { label:'Events Run', value: communityEvents.length, icon:'🎯' },
            { label:'Founded',    value: formatCommunityDate(c.founded), icon:'📅' },
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
          ${recentMembers.length === 0 ? `
            <div class="empty-state" style="padding:18px 12px">
              <div class="empty-icon">👥</div>
              <div class="empty-title">No members yet</div>
              <div class="empty-desc">Member activity will appear here once people join.</div>
            </div>
          ` : recentMembers.map(member => `
            <div class="attendee-row" style="border-bottom:1px solid var(--border);padding:10px 0">
              <div class="avatar avatar-sm" style="background:var(--gradient-primary)">${member.avatar}</div>
              <div class="attendee-info">
                <div class="attendee-name">${member.name}</div>
                <div class="attendee-email">Joined ${member.joinedLabel}</div>
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
  if (typeof canUseOrganizerFeatures === 'function' ? !canUseOrganizerFeatures(user) : user?.role === 'member') {
    toast.warning('Restricted', 'Only organizers can create communities.');
  }

  const form = document.getElementById('create-community-form');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const editCommunityId = params.get('edit');
  const isEditMode = !!editCommunityId;
  const pageTitle = document.querySelector('h1');
  const pageSubtitle = document.querySelector('.text-secondary.text-sm.mt-1');
  const submitBtn = form.querySelector('[type=submit]');
  const btnText = submitBtn?.querySelector('.btn-text');

  if (isEditMode) {
    if (pageTitle) pageTitle.textContent = 'Edit Community ✏️';
    if (pageSubtitle) pageSubtitle.textContent = 'Update your community details. Changes are saved directly.';
    if (btnText) btnText.textContent = '💾 Save Changes';
  }

  async function loadCommunityForEdit() {
    if (!isEditMode) return;
    if (!db) {
      toast.error('Load failed', 'Firestore is unavailable right now.');
      window.location.href = 'communities.html';
      return;
    }

    try {
      const snapshot = await db.collection('communities').doc(editCommunityId).get();
      if (!snapshot.exists) {
        toast.error('Community not found', 'Unable to load this community for editing.');
        window.location.href = 'communities.html';
        return;
      }

      const data = snapshot.data() || {};
      const isOwner = user?.uid && (user.uid === data.organizerId || user.uid === data.organizer_uid);
      if (!isOwner) {
        toast.error('Restricted', 'Only the community owner can edit this community.');
        window.location.href = 'communities.html';
        return;
      }

      const values = {
        '#c-name': data.name || '',
        '#c-category': data.category || '',
        '#c-emoji': data.emoji || '',
        '#c-desc': data.description || data.desc || '',
        '#c-website': data.website || '',
        '#c-linkedin': data.linkedin || '',
        '#c-instagram': data.instagram || '',
        '#c-github': data.github || '',
        '#c-tags': Array.isArray(data.tags) ? data.tags.join(', ') : '',
        '#c-college': data.college || '',
        '#c-city': data.city || '',
      };

      Object.entries(values).forEach(([selector, value]) => {
        const field = form.querySelector(selector);
        if (field) field.value = value;
      });

      const previewName = document.getElementById('preview-name');
      const previewCategory = document.getElementById('preview-category');
      const previewEmoji = document.getElementById('preview-emoji');
      const previewDesc = document.getElementById('preview-desc');
      if (previewName) previewName.textContent = data.name || 'Community Name';
      if (previewCategory) previewCategory.innerHTML = `<span class="badge badge-purple">${data.category || 'Category'}</span>`;
      if (previewEmoji) previewEmoji.textContent = data.emoji || '🌐';
      if (previewDesc) previewDesc.textContent = data.description || data.desc || 'Your description will appear here...';
    } catch (error) {
      toast.error('Load failed', error?.message || 'Unable to load community data.');
      window.location.href = 'communities.html';
    }
  }

  loadCommunityForEdit();

  function validateCreateCommunityForm() {
    const requiredFields = [
      { selector: '#c-name', label: 'Community Name' },
      { selector: '#c-category', label: 'Category' },
      { selector: '#c-desc', label: 'Description' },
      { selector: '#c-college', label: 'College' },
      { selector: '#c-city', label: 'City' },
    ];

    let valid = true;
    requiredFields.forEach(({ selector }) => {
      const field = form.querySelector(selector);
      if (!field) return;
      field.classList.remove('error');
      if (!field.value.trim()) {
        field.classList.add('error');
        valid = false;
      }
    });

    if (!valid) {
      toast.error('Form incomplete', 'Please fill in all required fields.');
    }

    return valid;
  }

  function buildCommunityPayload() {
    const name = form.querySelector('#c-name').value.trim();
    const category = form.querySelector('#c-category').value.trim();
    const description = form.querySelector('#c-desc').value.trim();
    const emoji = form.querySelector('#c-emoji').value.trim() || '🌐';
    const website = form.querySelector('#c-website').value.trim();
    const linkedin = form.querySelector('#c-linkedin').value.trim();
    const instagram = form.querySelector('#c-instagram').value.trim();
    const github = form.querySelector('#c-github').value.trim();
    const tags = form.querySelector('#c-tags').value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const college = form.querySelector('#c-college').value.trim();
    const city = form.querySelector('#c-city').value.trim();

    return {
      name,
      description,
      category,
      emoji,
      website,
      linkedin,
      instagram,
      github,
      tags,
      college,
      city,
      organizerId: user?.uid || '',
      organizerName: user?.name || '',
      organizerEmail: user?.email || '',
      memberCount: 1,
    };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCreateCommunityForm()) return;

    if (!db) {
      toast.error('Submission Failed', 'Firestore is unavailable right now.');
      return;
    }

    if (!submitBtn) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    if (btnText) btnText.textContent = '⏳ Submitting...';

    try {
      const payload = buildCommunityPayload();
      if (isEditMode) {
        const existingSnapshot = await db.collection('communities').doc(editCommunityId).get();
        if (!existingSnapshot.exists) {
          throw new Error('Community not found.');
        }

        const existingData = existingSnapshot.data() || {};
        await db.collection('communities').doc(editCommunityId).update({
          ...payload,
          memberCount: typeof existingData.memberCount === 'number' ? existingData.memberCount : payload.memberCount,
          createdAt: existingData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
          status: existingData.status || 'pending',
          isApproved: typeof existingData.isApproved === 'boolean' ? existingData.isApproved : false,
          organizerId: existingData.organizerId || payload.organizerId,
          organizerName: existingData.organizerName || payload.organizerName,
          organizerEmail: existingData.organizerEmail || payload.organizerEmail,
        });

        toast.success('Community Updated ✨', 'Your changes were saved successfully.');
      } else {
        await db.collection('communities').add({
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          isApproved: false,
        });

        toast.success(
          'Community Submitted 🚀',
          'Your community has been submitted for admin review.'
        );
      }
      window.location.href = 'communities.html';
    } catch (error) {
      toast.error(isEditMode ? 'Update Failed' : 'Submission Failed', error?.message || (isEditMode ? 'Unable to update community.' : 'Unable to submit community.'));
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      if (btnText) btnText.textContent = isEditMode ? '💾 Save Changes' : '🚀 Submit for Review';
    }
  });
}
