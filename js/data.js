// =============================================
// NEXOVERSE — Dummy Data & Data Module
// =============================================

const DUMMY_DATA = {

  communities: [
    {
      id:'c1', name:'GDG Hyderabad', category:'Google', members:1240,
      desc:'Official Google Developer Group for Hyderabad region. Building the next generation of developers.',
      emoji:'🌐', banner:'linear-gradient(135deg,#4285F4,#34A853)',
      organizer:'Priya Sharma', organizer_uid:'u2', isApproved:true,
      events:12, founded:'2019-03-15',
      tags:['Android','Flutter','Cloud','AI/ML'],
    },
    {
      id:'c2', name:'MLSA IIIT-H', category:'Microsoft', members:890,
      desc:'Microsoft Learn Student Ambassadors chapter at IIIT Hyderabad. Empowering students with Microsoft tech.',
      emoji:'🔷', banner:'linear-gradient(135deg,#00A4EF,#7FBA00)',
      organizer:'Rahul Singh', organizer_uid:'u2', isApproved:true,
      events:8, founded:'2020-08-01',
      tags:['Azure','AI','Web','Power Platform'],
    },
    {
      id:'c3', name:'ACM CBIT', category:'ACM', members:650,
      desc:'Association for Computing Machinery student chapter at CBIT. Where code meets community.',
      emoji:'⚙️', banner:'linear-gradient(135deg,#7c3aed,#2563eb)',
      organizer:'Sneha Reddy', organizer_uid:'u2', isApproved:true,
      events:15, founded:'2018-01-10',
      tags:['Algorithms','CP','Open Source','Hackathons'],
    },
    {
      id:'c4', name:'IEEE CS Society', category:'IEEE', members:420,
      desc:'IEEE Computer Society student branch. Advancing technology for humanity through innovation.',
      emoji:'🔬', banner:'linear-gradient(135deg,#0891b2,#0e7490)',
      organizer:'Karthik Nair', organizer_uid:'u2', isApproved:true,
      events:6, founded:'2017-09-01',
      tags:['Robotics','IoT','Research','Publications'],
    },
    {
      id:'c5', name:'Design Collective', category:'Design', members:310,
      desc:'A community of designers, creators, and visual thinkers. Building beautiful digital experiences.',
      emoji:'🎨', banner:'linear-gradient(135deg,#ec4899,#f97316)',
      organizer:'Ananya Patel', organizer_uid:'u2', isApproved:true,
      events:5, founded:'2021-04-20',
      tags:['UI/UX','Figma','Branding','Motion'],
    },
    {
      id:'c6', name:'StartupHub Campus', category:'Entrepreneurship', members:780,
      desc:'Connecting student entrepreneurs, mentors, and investors. Building the next big startup.',
      emoji:'🚀', banner:'linear-gradient(135deg,#f59e0b,#ef4444)',
      organizer:'Vikram Joshi', organizer_uid:'u2', isApproved:false,
      events:9, founded:'2020-11-05',
      tags:['Startups','Fundraising','Product','Pitch'],
    },
  ],

  events: [
    {
      id:'e1', title:'Google I/O Extended Hyderabad 2025', category:'Tech Talk',
      date:'2025-08-15', time:'10:00 AM', venue:'HICC Convention Centre, Hyderabad',
      isOnline:false, isFree:true, price:0,
      desc:'Join us for the biggest Google developer event in Hyderabad! Keynotes, workshops, codelabs, and networking.',
      emoji:'🌐', banner:'linear-gradient(135deg,#4285F4,#34A853)',
      organizer:'GDG Hyderabad', organizer_uid:'u2', communityId:'c1',
      attendees:843, maxAttendees:1000, tags:['Android','Flutter','AI','Web'],
      isApproved:true, status:'upcoming',
      schedule:[
        { time:'10:00', title:'Registration & Networking', speaker:'' },
        { time:'11:00', title:'Keynote: AI at Google', speaker:'Sundar Pichai (Live Stream)' },
        { time:'12:30', title:'Lunch Break', speaker:'' },
        { time:'14:00', title:'Flutter Workshop', speaker:'Tim Sneath' },
        { time:'16:00', title:'Google Cloud Session', speaker:'Priya Sharma' },
        { time:'17:30', title:'Q&A & Networking', speaker:'' },
      ]
    },
    {
      id:'e2', title:'HackHyderabad 3.0 — 36hr Hackathon', category:'Hackathon',
      date:'2025-09-05', time:'9:00 AM', venue:'T-Hub, Hyderabad',
      isOnline:false, isFree:false, price:299,
      desc:'The biggest student hackathon in Telangana. 36 hours. 500+ hackers. ₹5 Lakh prize pool.',
      emoji:'🏆', banner:'linear-gradient(135deg,#7c3aed,#ec4899)',
      organizer:'ACM CBIT', organizer_uid:'u2', communityId:'c3',
      attendees:487, maxAttendees:600, tags:['AI/ML','Web3','FinTech','HealthTech'],
      isApproved:true, status:'upcoming',
      schedule:[
        { time:'09:00', title:'Opening Ceremony & Team Formation', speaker:'' },
        { time:'10:00', title:'Hacking Begins 🚀', speaker:'' },
        { time:'20:00', title:'Mentoring Sessions', speaker:'Industry Experts' },
        { time:'21:00', title:'Midnight Snacks & Games', speaker:'' },
        { time:'20:00+1', title:'Submissions Close', speaker:'' },
        { time:'21:00+1', title:'Judging & Award Ceremony', speaker:'' },
      ]
    },
    {
      id:'e3', title:'UI/UX Design Bootcamp', category:'Workshop',
      date:'2025-08-25', time:'11:00 AM', venue:'Online (Zoom)',
      isOnline:true, isFree:true, price:0,
      desc:'A 3-day intensive bootcamp covering Figma, design systems, prototyping, and portfolio building.',
      emoji:'🎨', banner:'linear-gradient(135deg,#ec4899,#f97316)',
      organizer:'Design Collective', organizer_uid:'u2', communityId:'c5',
      attendees:234, maxAttendees:300, tags:['Figma','Design Systems','UX Research'],
      isApproved:true, status:'upcoming',
      schedule:[]
    },
    {
      id:'e4', title:'Cloud Computing with Azure', category:'Workshop',
      date:'2025-08-20', time:'2:00 PM', venue:'Online (Teams)',
      isOnline:true, isFree:true, price:0,
      desc:'Hands-on Azure workshop covering cloud fundamentals, serverless, and deploying your first app.',
      emoji:'☁️', banner:'linear-gradient(135deg,#00A4EF,#7FBA00)',
      organizer:'MLSA IIIT-H', organizer_uid:'u2', communityId:'c2',
      attendees:156, maxAttendees:250, tags:['Azure','Serverless','Cloud'],
      isApproved:true, status:'upcoming',
      schedule:[]
    },
    {
      id:'e5', title:'Startup Pitch Night — Demo Day', category:'Networking',
      date:'2025-09-12', time:'6:00 PM', venue:'NASSCOM HQ, Hyderabad',
      isOnline:false, isFree:false, price:99,
      desc:'Watch 10 student startups pitch to real investors. Network with founders, VCs, and ecosystem leaders.',
      emoji:'💡', banner:'linear-gradient(135deg,#f59e0b,#ef4444)',
      organizer:'StartupHub Campus', organizer_uid:'u2', communityId:'c6',
      attendees:312, maxAttendees:400, tags:['Startups','VC','Pitch','Networking'],
      isApproved:true, status:'upcoming',
      schedule:[]
    },
    {
      id:'e6', title:'Competitive Programming Contest', category:'Competition',
      date:'2025-08-30', time:'10:00 AM', venue:'CBIT Auditorium, Hyderabad',
      isOnline:false, isFree:true, price:0,
      desc:'Annual CP contest with LeetCode-style problems. Cash prizes for top 10. Open to all students.',
      emoji:'⚡', banner:'linear-gradient(135deg,#0891b2,#7c3aed)',
      organizer:'ACM CBIT', organizer_uid:'u2', communityId:'c3',
      attendees:198, maxAttendees:300, tags:['Algorithms','Data Structures','CP'],
      isApproved:true, status:'upcoming',
      schedule:[]
    },
  ],

  registrations: [
    { id:'r1', userId:'u1', eventId:'e1', status:'confirmed', registeredAt:'2025-07-28', ticketId:'NXR-E1-001', attended:false },
    { id:'r2', userId:'u1', eventId:'e3', status:'confirmed', registeredAt:'2025-07-30', ticketId:'NXR-E3-042', attended:false },
    { id:'r3', userId:'u1', eventId:'e6', status:'pending',   registeredAt:'2025-08-01', ticketId:'NXR-E6-019', attended:false },
  ],

  notifications: [
    { id:'n1', type:'event', title:'Event starts in 3 days!', message:'Google I/O Extended Hyderabad is on Aug 15', read:false, time:'1h ago' },
    { id:'n2', type:'community', title:'New event in GDG Hyderabad', message:'Flutter Workshop announced for Aug 25', read:false, time:'3h ago' },
    { id:'n3', type:'registration', title:'Registration confirmed', message:'Your spot for HackHyderabad is secured ✅', read:true, time:'1d ago' },
    { id:'n4', type:'system', title:'Welcome to NEXOVERSE!', message:'Complete your profile to get personalized recommendations', read:true, time:'3d ago' },
  ],

  analytics: {
    registrationsOverTime: [12,24,18,36,28,45,52,61,48,73,84,92],
    communityGrowth:       [80,120,145,180,220,280,340,390,450,520,610,680],
    eventAttendance:       [65,72,58,80,76,88,92,85,90,95,88,93],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    categories: [
      { label:'Hackathons', value:38, color:'#a855f7' },
      { label:'Workshops',  value:29, color:'#3b82f6' },
      { label:'Tech Talks', value:18, color:'#22d3ee' },
      { label:'Networking', value:10, color:'#f472b6' },
      { label:'Other',      value:5,  color:'#94a3b8' },
    ],
  },
};

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
const LOCAL_CREATED_EVENTS_KEY = 'nexora_created_events';

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

function mergeEventSources(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const normalized = normalizeEventRecord(item, item?.id || '');
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
    const fallback = mergeEventSources(DUMMY_DATA.events, localEvents);
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
  if (!db) return Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
  if (firestoreCommunityLoadPromise && !force) return firestoreCommunityLoadPromise;

  firestoreCommunityLoadPromise = (async () => {
    try {
      const snapshot = await db.collection('communities').get();
      firestoreCommunityCache = snapshot.docs.map(doc => normalizeCommunityRecord({ id: doc.id, ...(doc.data() || {}) }, doc.id));
      firestoreCommunityCacheLoaded = true;
      return firestoreCommunityCache;
    } catch (error) {
      console.warn('Failed to load communities from Firestore', error);
      firestoreCommunityCacheLoaded = true;
      if (!Array.isArray(firestoreCommunityCache)) firestoreCommunityCache = null;
      return Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
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
    return Array.isArray(firestoreEventCache) ? firestoreEventCache : [];
  },
  hasLoadedEventsFromFirestore() {
    return firestoreEventCacheLoaded;
  },
  async loadCommunitiesFromFirestore(force = false) {
    return loadCommunitiesFromFirestore(force);
  },
  getCommunitiesForUser(userId) {
    const source = Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
    return source.filter(c => !c.removedByAdmin && (
      c.organizerId === userId ||
      c.organizer_uid === userId ||
      c.isApproved
    ));
  },
  getCommunities(filter = null) {
    const source = Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
    let list = source.filter(c => c.isApproved && !c.removedByAdmin);
    if (filter && filter !== 'all') list = list.filter(c => c.category === filter);
    return list;
  },
  getCommunity(id) {
    const source = Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
    return source.find(c => c.id === id) || DUMMY_DATA.communities.find(c => c.id === id);
  },
  getEvents(filter = null) {
    const source = Array.isArray(firestoreEventCache) ? firestoreEventCache : DUMMY_DATA.events;
    let list = source.filter(e => e.isApproved && !e.removedByAdmin);
    if (filter && filter !== 'all') list = list.filter(e => e.category === filter);
    return list;
  },
  getEvent(id) {
    const source = Array.isArray(firestoreEventCache) ? firestoreEventCache : DUMMY_DATA.events;
    return source.find(e => e.id === id) || DUMMY_DATA.events.find(e => e.id === id);
  },
  getUserRegistrations(uid) {
    const regs = DUMMY_DATA.registrations.filter(r => r.userId === uid);
    return regs.map(r => ({ ...r, event: DataStore.getEvent(r.eventId) }));
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

    const fallbackRegs = DUMMY_DATA.registrations.filter(item => item.eventId === eventId).slice(0, limit);
    const demoUsers = typeof DEMO_USERS !== 'undefined' ? DEMO_USERS : {};
    return {
      count: fallbackRegs.length,
      profiles: fallbackRegs.map(item => {
      const user = Object.values(demoUsers).find(profile => profile.uid === item.userId) || null;
      const name = user?.name || item.userId || 'Attendee';
      return {
        id: item.userId,
        name,
        email: user?.email || '',
        avatar: user?.avatar || name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'U',
        role: user?.role || 'member',
        registeredAt: item.registeredAt || null,
        ticketId: item.ticketId || '',
      };
      }),
    };
  },
  getNotifications(uid) {
    // If demo notifications include userId, filter by uid; otherwise return demo list
    if (!Array.isArray(DUMMY_DATA.notifications)) return [];
    try {
      const hasUserId = DUMMY_DATA.notifications.some(n => Object.prototype.hasOwnProperty.call(n, 'userId'));
      if (hasUserId && uid) {
        return DUMMY_DATA.notifications.filter(n => n.userId === uid);
      }
      return DUMMY_DATA.notifications;
    } catch (e) {
      return DUMMY_DATA.notifications;
    }
  },
  getAnalytics() {
    return DUMMY_DATA.analytics;
  },
  addRegistration(userId, eventId) {
    const existing = DUMMY_DATA.registrations.find(r => r.userId === userId && r.eventId === eventId);
    if (existing) return existing;
    const reg = {
      id: 'r'+Date.now(), userId, eventId,
      status: 'confirmed',
      registeredAt: new Date().toISOString().split('T')[0],
      ticketId: 'NXR-'+eventId.toUpperCase()+'-'+Math.floor(Math.random()*900+100),
      attended: false
    };
    DUMMY_DATA.registrations.push(reg);
    // bump attendee count
    const evt = DataStore.getEvent(eventId);
    if (evt) evt.attendees++;
    return reg;
  },
  searchEvents(query) {
    const q = query.toLowerCase();
    const source = Array.isArray(firestoreEventCache) ? firestoreEventCache : DUMMY_DATA.events;
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
    const source = Array.isArray(firestoreCommunityCache) ? firestoreCommunityCache : DUMMY_DATA.communities;
    return source.filter(c =>
      c.isApproved && !c.removedByAdmin && (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q)
      )
    );
  },
  getPendingApprovals() {
    const source = Array.isArray(firestoreEventCache) ? firestoreEventCache : DUMMY_DATA.events;
    return {
      communities: DUMMY_DATA.communities.filter(c => !c.isApproved),
      events: source.filter(e => !e.isApproved),
    };
  },
  getDashboardStats(role) {
    if (role === 'admin') return {
      totalUsers: 3847, totalCommunities: 48, totalEvents: 124,
      totalRegistrations: 15230, pendingApprovals: 6, reportsOpen: 3,
      growthUsers: '+12%', growthEvents: '+8%',
    };
    if (role === 'organizer') return {
      totalEvents: 8, totalAttendees: 1543, totalCommunities: 3,
      totalRegistrations: 643, viewsThisMonth: 2840, engagementRate: '68%',
    };
    return {
      joinedCommunities: 4, registeredEvents: 3, upcomingEvents: 2,
      certificates: 1, attendanceRate: '85%', points: 340,
    };
  },
};
