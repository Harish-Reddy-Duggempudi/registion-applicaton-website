// =============================================
// NEXOVERSE — Data Module
// =============================================

const EVENT_BANNER_BY_CATEGORY = {
  'Hackathon': 'linear-gradient(135deg,#7c3aed,#ec4899)',
  'Workshop': 'linear-gradient(135deg,#00A4EF,#22d3ee)',
  'Tech Talk': 'linear-gradient(135deg,#4285F4,#34A853)',
  'Competition': 'linear-gradient(135deg,#0891b2,#7c3aed)',
  'Networking': 'linear-gradient(135deg,#f59e0b,#ef4444)',
  'Conference': 'linear-gradient(135deg,#10b981,#3b82f6)',
};

const EVENT_EMOJI_BY_CATEGORY = {
  'Hackathon': '🏆',
  'Workshop': '🔧',
  'Tech Talk': '🎙️',
  'Competition': '⚡',
  'Networking': '🤝',
  'Conference': '🌐',
};

let firestoreEventCache = null;
let firestoreEventCacheLoaded = false;
let firestoreEventLoadPromise = null;
let firestoreCommunityCache = null;
let firestoreCommunityCacheLoaded = false;
let firestoreCommunityLoadPromise = null;
let firestoreRegistrationCache = null;
let firestoreRegistrationCacheLoaded = false;
let firestoreRegistrationLoadPromise = null;
let firestoreUserCache = null;
let firestoreUserCacheLoaded = false;
let firestoreUserLoadPromise = null;
const LOCAL_CREATED_EVENTS_KEY = 'nexora_created_events';
const LOCAL_REGISTRATIONS_KEY = 'nexora_local_registrations';
const LOCAL_COLLAB_REQUESTS_KEY = 'nexora_collab_requests';
const LOCAL_USERS_KEY = 'nexora_local_users';
const LOCAL_COMMUNITIES_KEY = 'nexora_local_communities';

const ANALYTICS_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getFallbackEventBanner(category) {
  return EVENT_BANNER_BY_CATEGORY[category] || 'linear-gradient(135deg,#4f46e5,#06b6d4)';
}

function getFallbackEventEmoji(category) {
  return EVENT_EMOJI_BY_CATEGORY[category] || '🎯';
}

function readLocalCreatedEvents() {
  try {
    const raw = localStorage.getItem(LOCAL_CREATED_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalCreatedEvents(events) {
  try {
    localStorage.setItem(LOCAL_CREATED_EVENTS_KEY, JSON.stringify(Array.isArray(events) ? events : []));
  } catch (error) {
    console.warn('Failed to persist local created events', error);
  }
}

function readLocalRegistrations() {
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalRegistrations(registrations) {
  try {
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(Array.isArray(registrations) ? registrations : []));
  } catch (error) {
    console.warn('Failed to persist local registrations', error);
  }
}

function readLocalCollabRequests() {
  try {
    const raw = localStorage.getItem(LOCAL_COLLAB_REQUESTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalCollabRequests(requests) {
  try {
    localStorage.setItem(LOCAL_COLLAB_REQUESTS_KEY, JSON.stringify(Array.isArray(requests) ? requests : []));
  } catch (error) {
    console.warn('Failed to persist local collaboration requests', error);
  }
}

function readLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(Array.isArray(users) ? users : []));
  } catch (error) {
    console.warn('Failed to persist local users', error);
  }
}

function readLocalCommunities() {
  try {
    const raw = localStorage.getItem(LOCAL_COMMUNITIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalCommunities(communities) {
  try {
    localStorage.setItem(LOCAL_COMMUNITIES_KEY, JSON.stringify(Array.isArray(communities) ? communities : []));
  } catch (error) {
    console.warn('Failed to persist local communities', error);
  }
}

function getCachedCommunities() {
  return Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : readLocalCommunities();
}

function getCachedEvents() {
  return Array.isArray(firestoreEventCache) ? firestoreEventCache : [];
}

function getCachedRegistrations() {
  return Array.isArray(firestoreRegistrationCache) ? firestoreRegistrationCache : readLocalRegistrations();
}

function getCachedUsers() {
  return Array.isArray(firestoreUserCache) ? firestoreUserCache : readLocalUsers();
}

function normalizeRegistrationRecord(data = {}, fallbackId = '') {
  return {
    id: data.id || fallbackId,
    userId: data.userId || '',
    eventId: data.eventId || '',
    status: data.status || 'confirmed',
    registeredAt: data.registeredAt || data.createdAt || null,
    ticketId: data.ticketId || '',
    attended: !!data.attended,
    createdAt: data.createdAt || null,
  };
}

function mergeRegistrationSources(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const normalized = normalizeRegistrationRecord(item, item?.id || '');
    if (!normalized.id) normalized.id = `${normalized.userId || 'reg'}-${normalized.eventId || Date.now()}`;
    map.set(normalized.id, normalized);
  });
  return Array.from(map.values());
}

function mergeUserSources(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const id = String(item?.id || item?.uid || '').trim();
    if (!id) return;
    map.set(id, {
      id,
      uid: item.uid || id,
      name: item.name || 'User',
      email: item.email || '',
      role: item.role || 'member',
      organizerAccess: item.organizerAccess === true,
      status: item.status || (item.suspended ? 'suspended' : 'active'),
      suspended: !!item.suspended,
      organizerRequestStatus: item.organizerRequestStatus || 'none',
      organizerRequestReason: item.organizerRequestReason || '',
      organizerRequestRejectionReason: item.organizerRequestRejectionReason || '',
      joined: item.joined || item.joinedAt || null,
      joinedAt: item.joinedAt || item.joined || null,
      avatar: item.avatar || '',
      bio: item.bio || '',
      communities: Array.isArray(item.communities) ? item.communities : [],
      events: Array.isArray(item.events) ? item.events : [],
      ...item,
    });
  });
  return Array.from(map.values());
}

function getMonthIndex(value) {
  if (!value) return -1;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getMonth();
}

function buildMonthlySeries(items = [], dateGetter = item => item?.createdAt || item?.date || '', valueGetter = item => 1, aggregate = 'sum') {
  const totals = ANALYTICS_MONTHS.map(() => 0);
  const counts = ANALYTICS_MONTHS.map(() => 0);

  items.forEach(item => {
    const monthIndex = getMonthIndex(dateGetter(item));
    if (monthIndex < 0) return;
    const value = Number(valueGetter(item) || 0);
    totals[monthIndex] += Number.isFinite(value) ? value : 0;
    counts[monthIndex] += 1;
  });

  if (aggregate === 'average') {
    return totals.map((value, index) => counts[index] ? Math.round(value / counts[index]) : 0);
  }

  if (aggregate === 'cumulative') {
    let running = 0;
    return totals.map(value => {
      running += value;
      return running;
    });
  }

  return totals;
}

function formatSeriesGrowthLabel(series = []) {
  if (!Array.isArray(series) || series.length < 2) return 'Live';

  const current = Number(series[series.length - 1] || 0);
  const previous = Number(series[series.length - 2] || 0);

  if (current === previous) return '0%';
  if (previous <= 0) return current > 0 ? 'New' : '0%';

  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? '+' : ''}${change}%`;
}

async function loadRegistrationsFromFirestore(force = false) {
  const localRegistrations = readLocalRegistrations();
  if (!db) {
    firestoreRegistrationCache = localRegistrations;
    firestoreRegistrationCacheLoaded = true;
    return localRegistrations;
  }
  if (firestoreRegistrationLoadPromise && !force) return firestoreRegistrationLoadPromise;

  firestoreRegistrationLoadPromise = (async () => {
    try {
      const snapshot = await db.collection('registrations').get();
      const remoteRegistrations = snapshot.docs.map(doc => normalizeRegistrationRecord({ id: doc.id, ...(doc.data() || {}) }, doc.id));
      firestoreRegistrationCache = mergeRegistrationSources(remoteRegistrations, localRegistrations);
      firestoreRegistrationCacheLoaded = true;
      return firestoreRegistrationCache;
    } catch (error) {
      console.warn('Failed to load registrations from Firestore', error);
      firestoreRegistrationCacheLoaded = true;
      if (!Array.isArray(firestoreRegistrationCache)) {
        firestoreRegistrationCache = mergeRegistrationSources(localRegistrations);
      }
      return firestoreRegistrationCache;
    } finally {
      firestoreRegistrationLoadPromise = null;
    }
  })();

  return firestoreRegistrationLoadPromise;
}

async function loadUsersFromFirestore(force = false) {
  const localUsers = readLocalUsers();
  if (!db) {
    firestoreUserCache = mergeUserSources(localUsers, firestoreUserCache);
    firestoreUserCacheLoaded = true;
    return firestoreUserCache;
  }
  if (firestoreUserLoadPromise && !force) return firestoreUserLoadPromise;

  firestoreUserLoadPromise = (async () => {
    try {
      const snapshot = await db.collection('users').get();
      const remoteUsers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
      firestoreUserCache = mergeUserSources(localUsers, remoteUsers);
      firestoreUserCacheLoaded = true;
      return firestoreUserCache;
    } catch (error) {
      console.warn('Failed to load users from Firestore', error);
      firestoreUserCacheLoaded = true;
      if (!Array.isArray(firestoreUserCache) || firestoreUserCache.length === 0) {
        firestoreUserCache = mergeUserSources(localUsers, firestoreUserCache);
      }
      return firestoreUserCache;
    } finally {
      firestoreUserLoadPromise = null;
    }
  })();

  return firestoreUserLoadPromise;
}

function mergeEventSources(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const normalized = normalizeEventRecord(item, item?.id || '');
    if (normalized.id) map.set(normalized.id, normalized);
  });
  return Array.from(map.values());
}

function mergeCommunitySources(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const normalized = normalizeCommunityRecord(item, item?.id || '');
    if (normalized.id) map.set(normalized.id, normalized);
  });
  return Array.from(map.values());
}

function normalizeEventRecord(data = {}, fallbackId = '') {
  const category = data.category || 'Other';
  const title = data.title || 'Untitled Event';
  const description = data.desc || data.description || '';
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const normalizeList = value => Array.isArray(value)
    ? value.map(item => {
      if (item && typeof item === 'object') {
        return [item.name || item.title || '', item.designation || item.role || ''].filter(Boolean).join(' — ').trim();
      }
      return String(item).trim();
    }).filter(Boolean)
    : (typeof value === 'string' ? value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean) : []);
  const attendees = typeof data.attendees === 'number' ? data.attendees : Number(data.attendees || 0);
  const maxAttendees = typeof data.maxAttendees === 'number' ? data.maxAttendees : Number(data.maxAttendees || 0);

  return {
    id: data.id || data.eventId || fallbackId,
    title,
    desc: description,
    description,
    category,
    date: data.date || '',
    time: data.time || '',
    venue: data.venue || '',
    isOnline: !!data.isOnline,
    isFree: data.isFree !== false,
    price: Number(data.price || 0),
    organizer: data.organizer || data.organizerName || '',
    organizerId: data.organizerId || data.organizer_uid || '',
    communityId: data.communityId || '',
    attendees,
    maxAttendees,
    tags,
    agenda: normalizeList(data.agenda),
    speakers: normalizeList(data.speakers),
    sponsors: normalizeList(data.sponsors),
    collaborators: normalizeList(data.collaborators || data.collaboration),
    organizingTeam: normalizeList(data.organizingTeam || data.organisingTeam),
    emoji: data.emoji || getFallbackEventEmoji(category),
    banner: data.banner || getFallbackEventBanner(category),
    isApproved: data.isApproved !== false,
    status: data.status || 'upcoming',
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
    removedByAdmin: !!data.removedByAdmin,
    createdAt: data.createdAt || null,
    registrationDeadline: data.registrationDeadline || null,
  };
}

function normalizeCommunityRecord(data = {}, fallbackId = '') {
  const category = data.category || 'Other';
  const description = data.description || data.desc || '';
  const members = typeof data.memberCount === 'number' ? data.memberCount : Number(data.memberCount || data.members || 0);

  return {
    id: data.id || data.communityId || fallbackId,
    name: data.name || 'Untitled Community',
    description,
    desc: description,
    category,
    emoji: data.emoji || '🌐',
    banner: data.banner || getFallbackEventBanner(category),
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
    memberCount: members,
    members,
    events: Number(data.events || data.eventsCount || 0),
    createdAt: data.createdAt || null,
    founded: data.createdAt || data.founded || null,
    status: data.status || '',
    isApproved: data.isApproved !== false,
    removedByAdmin: !!data.removedByAdmin,
  };
}

async function loadEventsFromFirestore(force = false) {
  const localEvents = readLocalCreatedEvents();
  if (!db) {
    const fallback = mergeEventSources(localEvents);
    firestoreEventCache = fallback;
    firestoreEventCacheLoaded = true;
    return fallback;
  }
  if (firestoreEventLoadPromise && !force) return firestoreEventLoadPromise;

  firestoreEventLoadPromise = (async () => {
    try {
      const snapshot = await db.collection('events').get();
      const remoteEvents = snapshot.docs.map(doc => normalizeEventRecord({ id: doc.id, ...(doc.data() || {}) }, doc.id));
      firestoreEventCache = mergeEventSources(localEvents, remoteEvents);
      firestoreEventCacheLoaded = true;
      return firestoreEventCache;
    } catch (error) {
      console.warn('Failed to load events from Firestore', error);
      firestoreEventCacheLoaded = true;
      if (!Array.isArray(firestoreEventCache) || firestoreEventCache.length === 0) {
        firestoreEventCache = mergeEventSources(localEvents);
      }
      return firestoreEventCache;
    } finally {
      firestoreEventLoadPromise = null;
    }
  })();

  return firestoreEventLoadPromise;
}

async function loadCommunitiesFromFirestore(force = false) {
  const localCommunities = readLocalCommunities();
  if (!db) {
    const fallback = mergeCommunitySources(localCommunities, firestoreCommunityCache);
    firestoreCommunityCache = fallback;
    firestoreCommunityCacheLoaded = true;
    return fallback;
  }
  if (firestoreCommunityLoadPromise && !force) return firestoreCommunityLoadPromise;

  firestoreCommunityLoadPromise = (async () => {
    try {
      const snapshot = await db.collection('communities').get();
      const remoteCommunities = snapshot.docs.map(doc => normalizeCommunityRecord({ id: doc.id, ...(doc.data() || {}) }, doc.id));
      firestoreCommunityCache = mergeCommunitySources(localCommunities, remoteCommunities);
      writeLocalCommunities(firestoreCommunityCache);
      firestoreCommunityCacheLoaded = true;
      return firestoreCommunityCache;
    } catch (error) {
      console.warn('Failed to load communities from Firestore', error);
      firestoreCommunityCacheLoaded = true;
      if (!Array.isArray(firestoreCommunityCache) || firestoreCommunityCache.length === 0) {
        firestoreCommunityCache = mergeCommunitySources(localCommunities, firestoreCommunityCache);
      }
      return firestoreCommunityCache;
    } finally {
      firestoreCommunityLoadPromise = null;
    }
  })();

  return firestoreCommunityLoadPromise;
}

// ── Data Access Helpers ───────────────────────
const DataStore = {
  async loadEventsFromFirestore(force = false) {
    return loadEventsFromFirestore(force);
  },
  getLiveEvents() {
    return getCachedEvents();
  },
  hasLoadedEventsFromFirestore() {
    return firestoreEventCacheLoaded;
  },
  async loadCommunitiesFromFirestore(force = false) {
    return loadCommunitiesFromFirestore(force);
  },
  async loadRegistrationsFromFirestore(force = false) {
    return loadRegistrationsFromFirestore(force);
  },
  async loadUsersFromFirestore(force = false) {
    return loadUsersFromFirestore(force);
  },
  getLiveRegistrations() {
    return getCachedRegistrations();
  },
  getLiveUsers() {
    return getCachedUsers();
  },
  saveLocalUserProfile(user) {
    if (!user) return null;
    const id = String(user.id || user.uid || '').trim();
    if (!id) return null;
    const nextUsers = mergeUserSources(readLocalUsers(), [{ ...user, id, uid: user.uid || id }]);
    writeLocalUsers(nextUsers);
    firestoreUserCache = mergeUserSources(firestoreUserCache || [], nextUsers);
    firestoreUserCacheLoaded = true;
    return nextUsers.find(item => item.id === id) || null;
  },
  getCommunitiesForUser(userId) {
    const source = getCachedCommunities();
    return source.filter(c => !c.removedByAdmin && (
      c.organizerId === userId ||
      c.organizer_uid === userId ||
      c.ownerId === userId ||
      c.createdBy === userId
    ));
  },
  getCommunities(filter = null) {
    const source = getCachedCommunities();
    let list = source.filter(c => c.isApproved && !c.removedByAdmin);
    if (filter && filter !== 'all') list = list.filter(c => c.category === filter);
    return list;
  },
  getCommunity(id) {
    const source = getCachedCommunities();
    return source.find(c => c.id === id) || null;
  },
  getEvents(filter = null) {
    const source = getCachedEvents();
    let list = source.filter(e => e.isApproved && !e.removedByAdmin);
    if (filter && filter !== 'all') list = list.filter(e => e.category === filter);
    return list;
  },
  getEvent(id) {
    const source = getCachedEvents();
    return source.find(e => e.id === id) || null;
  },
  getUserRegistrations(uid) {
    const regs = getCachedRegistrations().filter(r => r.userId === uid);
    return regs.map(r => ({ ...r, event: DataStore.getEvent(r.eventId) })).filter(item => !!item.event || !!item.eventId);
  },
  async getEventAttendeeProfiles(eventId, limit = 12) {
    if (!eventId) return { profiles: [], count: 0 };

    if (db && typeof db.collection === 'function') {
      try {
        const snapshot = await db.collection('registrations').where('eventId', '==', eventId).get();
        const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
        const count = registrations.length;
        const attendeeIds = [...new Set(registrations.map(item => item.userId).filter(Boolean))].slice(0, limit);
        if (attendeeIds.length === 0) return { profiles: [], count };

        const userDocs = await Promise.all(attendeeIds.map(userId => db.collection('users').doc(userId).get()));
        return {
          count,
          profiles: userDocs
          .map((doc, index) => {
            const data = doc.exists ? (doc.data() || {}) : {};
            const fallbackName = attendeeIds[index];
            const name = data.name || data.displayName || fallbackName;
            const initials = (data.avatar || name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'U');
            const reg = registrations.find(item => item.userId === attendeeIds[index]) || {};
            return {
              id: attendeeIds[index],
              name,
              email: data.email || '',
              avatar: initials,
              role: data.role || 'member',
              registeredAt: reg.registeredAt || reg.createdAt || null,
              ticketId: reg.ticketId || '',
            };
          })
          .filter(Boolean),
        };
      } catch (error) {
        console.warn('Failed to load event attendee profiles from Firestore', error);
      }
    }

    const fallbackRegs = getCachedRegistrations().filter(item => item.eventId === eventId).slice(0, limit);
    return {
      count: fallbackRegs.length,
      profiles: fallbackRegs.map(item => {
      const fallbackLabel = item.userId || 'Attendee';
      const name = fallbackLabel.replace(/[._-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) || 'Attendee';
      return {
        id: item.userId,
        name,
        email: '',
        avatar: name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'U',
        role: 'member',
        registeredAt: item.registeredAt || null,
        ticketId: item.ticketId || '',
      };
      }),
    };
  },
  getNotifications(uid) {
    return [];
  },
  getAnalytics() {
    const communities = getCachedCommunities().filter(c => c.isApproved && !c.removedByAdmin);
    const events = getCachedEvents().filter(e => e.isApproved && !e.removedByAdmin);
    const registrations = getCachedRegistrations();

    const registrationsOverTime = buildMonthlySeries(registrations, item => item.registeredAt || item.createdAt || '', item => 1, 'sum');
    const communityGrowth = buildMonthlySeries(communities, item => item.createdAt || item.founded || '', item => 1, 'cumulative');
    const eventAttendance = buildMonthlySeries(events, item => item.date || item.createdAt || '', item => {
      const attendees = Number(item.attendees || 0);
      const maxAttendees = Number(item.maxAttendees || 0);
      if (!maxAttendees) return 0;
      return Math.round((attendees / maxAttendees) * 100);
    }, 'average');

    const categoryTotals = new Map();
    events.forEach(event => {
      const category = event.category || 'Other';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + 1);
    });
    const totalEvents = events.length || 1;
    const palette = ['#a855f7', '#3b82f6', '#22d3ee', '#f472b6', '#94a3b8', '#f59e0b'];
    const categories = Array.from(categoryTotals.entries()).map(([label, count], index) => ({
      label,
      value: Math.round((count / totalEvents) * 100),
      color: palette[index % palette.length],
    }));

    return {
      registrationsOverTime,
      communityGrowth,
      eventAttendance,
      months: ANALYTICS_MONTHS,
      categories,
    };
  },
  addRegistration(userId, eventId) {
    const registrations = getCachedRegistrations();
    const existing = registrations.find(r => r.userId === userId && r.eventId === eventId);
    if (existing) return existing;
    const reg = {
      id: 'r'+Date.now(), userId, eventId,
      status: 'confirmed',
      registeredAt: new Date().toISOString().split('T')[0],
      ticketId: 'NXR-'+eventId.toUpperCase()+'-'+Math.floor(Math.random()*900+100),
      attended: false
    };
    const nextRegistrations = mergeRegistrationSources(registrations, [reg]);
    firestoreRegistrationCache = nextRegistrations;
    firestoreRegistrationCacheLoaded = true;
    writeLocalRegistrations(nextRegistrations);
    // bump attendee count
    const evt = DataStore.getEvent(eventId);
    if (evt) evt.attendees++;
    return reg;
  },
  searchEvents(query) {
    const q = query.toLowerCase();
    const source = getCachedEvents();
    return source.filter(e =>
      e.isApproved && !e.removedByAdmin && (
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    );
  },
  saveCreatedEventLocal(event) {
    if (!event) return;
    const merged = mergeEventSources(readLocalCreatedEvents(), [event]);
    writeLocalCreatedEvents(merged);
    if (Array.isArray(firestoreEventCache) && firestoreEventCache.length > 0) {
      firestoreEventCache = mergeEventSources(firestoreEventCache, [event]);
    }
  },
  searchCommunities(query) {
    const q = query.toLowerCase();
    const source = getCachedCommunities();
    return source.filter(c =>
      c.isApproved && !c.removedByAdmin && (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q)
      )
    );
  },
  getPendingApprovals() {
    const source = getCachedEvents();
    return {
      communities: getCachedCommunities().filter(c => !c.isApproved),
      events: source.filter(e => !e.isApproved),
    };
  },
  getDashboardStats(role, userId = '') {
    const communities = getCachedCommunities();
    const events = getCachedEvents();
    const registrations = getCachedRegistrations();
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const activeUserId = userId || currentUser?.uid || '';
    const userCommunityIds = Array.isArray(currentUser?.communities) ? currentUser.communities : [];
    const userRegistrations = registrations.filter(reg => reg.userId === activeUserId);
    const userGrowthSeries = buildMonthlySeries(Array.isArray(firestoreUserCache) ? firestoreUserCache : [], item => item.joinedAt || item.createdAt || item.registeredAt || '', item => 1, 'sum');
    const eventGrowthSeries = buildMonthlySeries(events, item => item.createdAt || item.date || '', item => 1, 'sum');
    const communityGrowthSeries = buildMonthlySeries(communities, item => item.createdAt || item.founded || '', item => 1, 'cumulative');
    const registrationGrowthSeries = buildMonthlySeries(registrations, item => item.registeredAt || item.createdAt || '', item => 1, 'sum');

    if (role === 'admin') return {
      totalUsers: Array.isArray(firestoreUserCache) ? firestoreUserCache.length : 0,
      totalCommunities: communities.length,
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      pendingApprovals: communities.filter(c => !c.isApproved).length + events.filter(e => !e.isApproved).length,
      reportsOpen: 0,
      growthUsers: formatSeriesGrowthLabel(userGrowthSeries),
      growthEvents: formatSeriesGrowthLabel(eventGrowthSeries),
      growthCommunities: formatSeriesGrowthLabel(communityGrowthSeries),
      growthRegistrations: formatSeriesGrowthLabel(registrationGrowthSeries),
    };

    if (role === 'organizer') {
      const organizerCommunities = activeUserId ? communities.filter(item => item.organizerId === activeUserId || item.organizer_uid === activeUserId || item.createdBy === activeUserId) : [];
      const organizerEvents = activeUserId ? events.filter(item => item.organizerId === activeUserId || item.organizer_uid === activeUserId || item.createdBy === activeUserId) : [];
      const organizerEventIds = new Set(organizerEvents.map(item => item.id));
      const organizerRegistrations = registrations.filter(item => organizerEventIds.has(item.eventId));
      const totalAttendees = organizerEvents.reduce((sum, item) => sum + Number(item.attendees || 0), 0);
      const organizerEventGrowthSeries = buildMonthlySeries(organizerEvents, item => item.createdAt || item.date || '', item => 1, 'sum');
      const organizerRegistrationGrowthSeries = buildMonthlySeries(organizerRegistrations, item => item.registeredAt || item.createdAt || '', item => 1, 'sum');
      const organizerAttendeeGrowthSeries = buildMonthlySeries(organizerEvents, item => item.createdAt || item.date || '', item => Number(item.attendees || 0), 'sum');
      const organizerCommunityGrowthSeries = buildMonthlySeries(organizerCommunities, item => item.createdAt || item.founded || '', item => 1, 'cumulative');

      return {
        totalEvents: organizerEvents.length,
        totalAttendees,
        totalCommunities: organizerCommunities.length,
        totalRegistrations: organizerRegistrations.length,
        viewsThisMonth: 0,
        engagementRate: organizerEvents.length ? `${Math.round((organizerRegistrations.length / organizerEvents.length) * 100)}%` : '0%',
        growthEvents: formatSeriesGrowthLabel(organizerEventGrowthSeries),
        growthRegistrations: formatSeriesGrowthLabel(organizerRegistrationGrowthSeries),
        growthAttendees: formatSeriesGrowthLabel(organizerAttendeeGrowthSeries),
        growthCommunities: formatSeriesGrowthLabel(organizerCommunityGrowthSeries),
      };
    }

    return {
      joinedCommunities: userCommunityIds.length,
      registeredEvents: userRegistrations.length,
      upcomingEvents: userRegistrations.filter(reg => {
        const event = DataStore.getEvent(reg.eventId);
        return event && event.status !== 'completed';
      }).length,
      certificates: 0,
      attendanceRate: '0%',
      points: userRegistrations.length * 100,
      growthCommunities: formatSeriesGrowthLabel(communityGrowthSeries),
      growthEvents: formatSeriesGrowthLabel(eventGrowthSeries),
      growthRegistrations: formatSeriesGrowthLabel(registrationGrowthSeries),
    };
  },
  async sendCollabRequest(toCommunityId, requestPayload = {}) {
    if (!toCommunityId) throw new Error('Missing community id');
    if (db && typeof db.collection === 'function') {
      try {
        const docRef = await db.collection('collabRequests').add({
          toCommunityId,
          payload: requestPayload,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: docRef.id, toCommunityId, payload: requestPayload, status: 'pending' };
      } catch (err) {
        console.warn('Failed to send collaboration request to Firestore', err);
        throw err;
      }
    }
    // fallback to local storage
    const req = { id: 'cr' + Date.now(), toCommunityId, payload: requestPayload, status: 'pending', createdAt: new Date().toISOString() };
    const nextRequests = [...readLocalCollabRequests(), req];
    writeLocalCollabRequests(nextRequests);
    return req;
  },
  async getCommunityCollabRequests(communityId) {
    if (!communityId) return [];
    if (db && typeof db.collection === 'function') {
      try {
        const snapshot = await db.collection('collabRequests').where('toCommunityId', '==', communityId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
      } catch (err) {
        console.warn('Failed to load collab requests from Firestore', err);
      }
    }
    return readLocalCollabRequests().filter(r => r.toCommunityId === communityId);
  },
  async getSentCollabRequests(userId) {
    if (!userId) return [];
    if (db && typeof db.collection === 'function') {
      try {
        const snapshot = await db.collection('collabRequests').where('payload.fromUserId', '==', userId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
      } catch (err) {
        console.warn('Failed to load sent collaboration requests', err);
      }
    }
    return readLocalCollabRequests().filter(r => r.payload && r.payload.fromUserId === userId);
  },
  async getAcceptedCollaborationNamesForEvent(event = {}) {
    const normalizeText = value => String(value || '').trim().toLowerCase();
    const matchEventRequest = (request) => {
      const eventId = request?.payload?.eventId || request?.payload?.eventDraft?.eventId || '';
      const draftId = request?.payload?.eventDraft?.draftId || request?.payload?.draftId || '';
      const title = String(request?.payload?.eventDraft?.title || request?.payload?.title || '').trim();
      const date = String(request?.payload?.eventDraft?.date || request?.payload?.date || '').trim();

      if (event.id && eventId && normalizeText(event.id) === normalizeText(eventId)) return true;
      if (event.collaborationDraftId && draftId && normalizeText(event.collaborationDraftId) === normalizeText(draftId)) return true;
      if (title && date) {
        return normalizeText(event.title) === normalizeText(title) && normalizeText(event.date) === normalizeText(date);
      }
      if (title) return normalizeText(event.title) === normalizeText(title);
      return false;
    };
    const requestToLabel = (request) => {
      const communityName = request?.payload?.toCommunity?.name || request?.payload?.toCommunityName || request?.toCommunityName || '';
      return String(communityName || request?.toCommunityId || '').trim();
    };
    const isRemovedRequest = (request) => !!(request?.removedAt || request?.removedBy || request?.isRemoved === true);

    if (db && typeof db.collection === 'function') {
      try {
        const snapshot = await db.collection('collabRequests').where('status', '==', 'accepted').get();
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
          .filter(request => matchEventRequest(request) && !isRemovedRequest(request))
          .map(requestToLabel)
          .filter(Boolean);
      } catch (err) {
        console.warn('Failed to load accepted collaboration names', err);
      }
    }

    return readLocalCollabRequests()
      .filter(req => req.status === 'accepted' && matchEventRequest(req) && !isRemovedRequest(req))
      .map(requestToLabel)
      .filter(Boolean);
  },
  async getAcceptedCollaborationEntriesForEvent(event = {}) {
    const normalizeText = value => String(value || '').trim().toLowerCase();
    const matchEventRequest = (request) => {
      const eventId = request?.payload?.eventId || request?.payload?.eventDraft?.eventId || '';
      const draftId = request?.payload?.eventDraft?.draftId || request?.payload?.draftId || '';
      const title = String(request?.payload?.eventDraft?.title || request?.payload?.title || '').trim();
      const date = String(request?.payload?.eventDraft?.date || request?.payload?.date || '').trim();

      if (event.id && eventId && normalizeText(event.id) === normalizeText(eventId)) return true;
      if (event.collaborationDraftId && draftId && normalizeText(event.collaborationDraftId) === normalizeText(draftId)) return true;
      if (title && date) {
        return normalizeText(event.title) === normalizeText(title) && normalizeText(event.date) === normalizeText(date);
      }
      if (title) return normalizeText(event.title) === normalizeText(title);
      return false;
    };
    const requestToEntry = (request) => {
      const communityName = request?.payload?.toCommunity?.name || request?.payload?.toCommunityName || request?.toCommunityName || request?.toCommunityId || '';
      return {
        requestId: request?.id || '',
        label: String(communityName || '').trim(),
        status: request?.status || 'pending',
        handledBy: request?.handledBy || '',
        handledAt: request?.handledAt || null,
        removedBy: request?.removedBy || '',
        removedAt: request?.removedAt || null,
      };
    };
    const isRemovedRequest = (request) => !!(request?.removedAt || request?.removedBy || request?.isRemoved === true);

    if (db && typeof db.collection === 'function') {
      try {
        const snapshot = await db.collection('collabRequests').where('status', '==', 'accepted').get();
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
          .filter(request => matchEventRequest(request) && !isRemovedRequest(request))
          .map(requestToEntry)
          .filter(entry => !!entry.label);
      } catch (err) {
        console.warn('Failed to load accepted collaboration entries', err);
      }
    }

    return readLocalCollabRequests()
      .filter(req => req.status === 'accepted' && matchEventRequest(req) && !isRemovedRequest(req))
      .map(requestToEntry)
      .filter(entry => !!entry.label);
  },
  async handleCollabRequest(requestId, action = 'accept', handlerUid = '', opts = {}) {
    if (!requestId) throw new Error('Missing requestId');
    const normalizeText = value => String(value || '').trim().toLowerCase();
    const resolveCollaboratorLabel = async (data) => {
      const candidate = data?.payload?.toCommunity?.name || data?.payload?.toCommunityName || data?.toCommunityName || '';
      if (candidate) return String(candidate).trim();

      const communityId = String(data?.toCommunityId || data?.payload?.toCommunityId || '').trim();
      if (!communityId) return '';

      if (db && typeof db.collection === 'function') {
        try {
          const doc = await db.collection('communities').doc(communityId).get();
          const community = doc.exists ? normalizeCommunityRecord({ id: doc.id, ...(doc.data() || {}) }, doc.id) : null;
          if (community?.name) return community.name;
        } catch (error) {
          console.warn('Failed to resolve collaborator community name', error);
        }
      }

      const community = Array.isArray(firestoreCommunityCache)
        ? firestoreCommunityCache.find(item => item.id === communityId)
        : null;
      return String(community?.name || communityId).trim();
    };
    const findEventByRequest = async (data) => {
      const eventId = data?.payload?.eventId || data?.payload?.eventDraft?.eventId || '';
      const draftId = data?.payload?.eventDraft?.draftId || data?.payload?.draftId || '';
      const draftTitle = String(data?.payload?.eventDraft?.title || data?.payload?.title || '').trim();
      const draftDate = String(data?.payload?.eventDraft?.date || data?.payload?.date || '').trim();
      const fromUserId = String(data?.payload?.fromUserId || data?.fromUserId || '').trim();

      if (eventId) {
        const byId = db.collection('events').doc(eventId).get();
        return byId;
      }

      if (draftId) {
        const draftQuery = await db.collection('events').where('collaborationDraftId', '==', draftId).get();
        if (!draftQuery.empty) return draftQuery.docs[0];
      }

      if (draftTitle && draftDate) {
        const titleQuery = await db.collection('events')
          .where('title', '==', draftTitle)
          .where('date', '==', draftDate)
          .get();
        if (!titleQuery.empty) return titleQuery.docs[0];
      }

      if (draftTitle) {
        const titleQuery = await db.collection('events').where('title', '==', draftTitle).get();
        if (!titleQuery.empty) {
          const sorted = [...titleQuery.docs].sort((a, b) => {
            const aTime = a.data()?.createdAt?.toMillis ? a.data().createdAt.toMillis() : 0;
            const bTime = b.data()?.createdAt?.toMillis ? b.data().createdAt.toMillis() : 0;
            return bTime - aTime;
          });
          return sorted[0];
        }
      }

      if (draftTitle || draftDate) {
        const fallbackQuery = await db.collection('events').get();
        const candidates = fallbackQuery.docs.filter(docSnap => {
          const docData = docSnap.data() || {};
          const titleMatch = draftTitle ? normalizeText(docData.title) === normalizeText(draftTitle) : true;
          const dateMatch = draftDate ? normalizeText(docData.date) === normalizeText(draftDate) : true;
          const organizerMatch = fromUserId ? normalizeText(docData.organizerId || docData.organizer_uid || '') === normalizeText(fromUserId) : true;
          return titleMatch && dateMatch && organizerMatch;
        });
        if (candidates.length) {
          candidates.sort((a, b) => {
            const aTime = a.data()?.createdAt?.toMillis ? a.data().createdAt.toMillis() : 0;
            const bTime = b.data()?.createdAt?.toMillis ? b.data().createdAt.toMillis() : 0;
            return bTime - aTime;
          });
          return candidates[0];
        }
      }

      return null;
    };
    if (db && typeof db.collection === 'function') {
      try {
        const ref = db.collection('collabRequests').doc(requestId);
        await ref.update({ status: action === 'accept' ? 'accepted' : 'rejected', handledBy: handlerUid || null, handledAt: firebase.firestore.FieldValue.serverTimestamp(), ...(opts || {}) });
        const doc = await ref.get();
        const data = doc.exists ? doc.data() : null;
        if (action === 'accept' && data) {
          const collaboratorLabel = await resolveCollaboratorLabel(data);
          const targetDoc = await findEventByRequest(data);
          if (targetDoc?.ref && collaboratorLabel) {
            await targetDoc.ref.update({ collaborators: firebase.firestore.FieldValue.arrayUnion(collaboratorLabel) });
          }
        }
        return true;
      } catch (err) {
        console.warn('Failed to handle collab request in Firestore', err);
        throw err;
      }
    }
    // local fallback
    const localRequests = readLocalCollabRequests();
    if (Array.isArray(localRequests)) {
      const idx = localRequests.findIndex(r => r.id === requestId);
      if (idx === -1) return false;
      localRequests[idx].status = action === 'accept' ? 'accepted' : 'rejected';
      localRequests[idx].handledBy = handlerUid || null;
      localRequests[idx].handledAt = new Date().toISOString();
      writeLocalCollabRequests(localRequests);
      const data = localRequests[idx];
      if (action === 'accept' && data) {
        const collaboratorLabel = await resolveCollaboratorLabel(data);
        const eventId = data?.payload?.eventId || data?.payload?.eventDraft?.eventId || '';
        const draftId = data?.payload?.eventDraft?.draftId || data?.payload?.draftId || '';
        const draftTitle = String(data?.payload?.eventDraft?.title || data?.payload?.title || '').trim();
        const draftDate = String(data?.payload?.eventDraft?.date || data?.payload?.date || '').trim();
        const fromUserId = String(data?.payload?.fromUserId || data?.fromUserId || '').trim();
        const ev = eventId
          ? getCachedEvents().find(e => e.id === eventId)
          : (draftId
            ? getCachedEvents().find(e => e.collaborationDraftId === draftId)
            : (draftTitle && draftDate
              ? getCachedEvents().find(e => normalizeText(e.title) === normalizeText(draftTitle) && normalizeText(e.date) === normalizeText(draftDate) && (!fromUserId || normalizeText(e.organizerId || e.organizer_uid || '') === normalizeText(fromUserId)))
              : (draftTitle ? getCachedEvents().find(e => normalizeText(e.title) === normalizeText(draftTitle) && (!fromUserId || normalizeText(e.organizerId || e.organizer_uid || '') === normalizeText(fromUserId))) : null)));
        if (ev && collaboratorLabel) {
          ev.collaborators = Array.isArray(ev.collaborators) ? ev.collaborators.concat([collaboratorLabel]) : [collaboratorLabel];
        }
      }
      return true;
    }
    return false;
  },
  async removeEventCollaborator(eventId, collaboratorLabel, actorUid = '') {
    if (!eventId) throw new Error('Missing eventId');
    const label = String(collaboratorLabel || '').trim();
    if (!label) throw new Error('Missing collaborator');

    const normalizeText = value => String(value || '').trim().toLowerCase();
    const aliases = new Set([normalizeText(label)]);
    const communityPool = getCachedCommunities();
    const matchedCommunity = communityPool.find(item => normalizeText(item?.name) === normalizeText(label) || normalizeText(item?.id) === normalizeText(label));
    if (matchedCommunity) {
      aliases.add(normalizeText(matchedCommunity.name));
      aliases.add(normalizeText(matchedCommunity.id));
    }

    const removeFromList = (source = []) => {
      const list = Array.isArray(source) ? source : [];
      return list.filter(item => !aliases.has(normalizeText(item)));
    };

    const applyCacheUpdate = (nextCollaborators) => {
      if (Array.isArray(firestoreEventCache)) {
        firestoreEventCache = firestoreEventCache.map(item => item.id === eventId
          ? { ...item, collaborators: nextCollaborators }
          : item);
      }

      const localEvents = readLocalCreatedEvents();
      if (Array.isArray(localEvents) && localEvents.length) {
        const updatedLocal = localEvents.map(item => item.id === eventId
          ? { ...item, collaborators: nextCollaborators }
          : item);
        writeLocalCreatedEvents(updatedLocal);
      }
    };

    const markMatchedRequestsAsRemoved = async (eventData = {}) => {
      const eventTitle = String(eventData?.title || '').trim();
      const eventDate = String(eventData?.date || '').trim();
      const eventDraftId = String(eventData?.collaborationDraftId || '').trim();
      const eventRefId = String(eventData?.id || eventId || '').trim();

      const requestMatchesEvent = (request = {}) => {
        const requestEventId = String(request?.payload?.eventId || request?.payload?.eventDraft?.eventId || '').trim();
        const requestDraftId = String(request?.payload?.eventDraft?.draftId || request?.payload?.draftId || '').trim();
        const requestTitle = String(request?.payload?.eventDraft?.title || request?.payload?.title || '').trim();
        const requestDate = String(request?.payload?.eventDraft?.date || request?.payload?.date || '').trim();

        if (eventRefId && requestEventId && normalizeText(eventRefId) === normalizeText(requestEventId)) return true;
        if (eventDraftId && requestDraftId && normalizeText(eventDraftId) === normalizeText(requestDraftId)) return true;
        if (eventTitle && requestTitle && normalizeText(eventTitle) === normalizeText(requestTitle)) {
          if (!eventDate || !requestDate) return true;
          return normalizeText(eventDate) === normalizeText(requestDate);
        }
        return false;
      };

      const requestMatchesCollaborator = (request = {}) => {
        const candidates = [
          request?.toCommunityId,
          request?.payload?.toCommunityId,
          request?.payload?.toCommunity?.id,
          request?.payload?.toCommunity?.name,
          request?.payload?.toCommunityName,
          request?.toCommunityName,
        ];
        return candidates.some(item => aliases.has(normalizeText(item)));
      };

      if (db && typeof db.collection === 'function') {
        const snapshot = await db.collection('collabRequests').where('status', '==', 'accepted').get();
        const matches = snapshot.docs.filter(doc => {
          const data = doc.data() || {};
          return !data.removedAt && requestMatchesEvent(data) && requestMatchesCollaborator(data);
        });
        await Promise.all(matches.map(doc => doc.ref.update({
          removedBy: actorUid || null,
          removedAt: firebase.firestore.FieldValue.serverTimestamp(),
          removedReason: 'organizer_removed',
        })));
        return;
      }

      const localRequests = readLocalCollabRequests();
      if (Array.isArray(localRequests)) {
        localRequests.forEach(request => {
          if (request.status !== 'accepted') return;
          if (request.removedAt) return;
          if (!requestMatchesEvent(request)) return;
          if (!requestMatchesCollaborator(request)) return;
          request.removedBy = actorUid || null;
          request.removedAt = new Date().toISOString();
          request.removedReason = 'organizer_removed';
        });
        writeLocalCollabRequests(localRequests);
      }
    };

    if (db && typeof db.collection === 'function') {
      try {
        const ref = db.collection('events').doc(eventId);
        const doc = await ref.get();
        if (!doc.exists) return false;
        const data = doc.data() || {};
        const currentCollaborators = Array.isArray(data.collaborators)
          ? data.collaborators
          : (Array.isArray(data.collaboration) ? data.collaboration : []);
        const nextCollaborators = removeFromList(currentCollaborators);
        if (nextCollaborators.length === currentCollaborators.length) return false;

        await ref.update({
          collaborators: nextCollaborators,
          updatedBy: actorUid || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await markMatchedRequestsAsRemoved({ id: eventId, ...data });

        applyCacheUpdate(nextCollaborators);
        return true;
      } catch (error) {
        console.warn('Failed to remove event collaborator in Firestore', error);
        throw error;
      }
    }

    const event = this.getEvent(eventId);
    if (!event) return false;
    const currentCollaborators = Array.isArray(event.collaborators) ? event.collaborators : [];
    const nextCollaborators = removeFromList(currentCollaborators);
    if (nextCollaborators.length === currentCollaborators.length) return false;

    await markMatchedRequestsAsRemoved(event);
    applyCacheUpdate(nextCollaborators);
    return true;
  },
};
