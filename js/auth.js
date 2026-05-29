// =============================================
// NEXORA — Auth Module
// =============================================

// ── Demo Mode (no Firebase Auth) ─────────────
// Keep demo data only when Firebase Auth is unavailable.
const HAS_FIREBASE_AUTH = typeof auth !== 'undefined' && !!auth;
const HAS_FIRESTORE = typeof db !== 'undefined' && !!db && typeof db.collection === 'function';
const DEMO_MODE = !HAS_FIREBASE_AUTH;

// ── Dummy users for demo ──────────────────────
const DEMO_USERS = {
  'student@nexora.dev':   { uid:'u1', name:'Aarav Mehta',   email:'student@nexora.dev',   role:'student',   avatar:'AM', bio:'CS student at IIIT Hyderabad 🚀' },
  'organizer@nexora.dev': { uid:'u2', name:'Priya Sharma',  email:'organizer@nexora.dev', role:'organizer', avatar:'PS', bio:'Tech community builder' },
  'admin@nexora.dev':     { uid:'u3', name:'Rohan Verma',   email:'admin@nexora.dev',     role:'admin',     avatar:'RV', bio:'Nexora Platform Admin' },
};

function createDefaultUserProfile(overrides = {}) {
  return {
    uid: '',
    name: '',
    email: '',
    role: 'member',
    organizerAccess: false,
    avatar: '',
    bio: '',
    joinedAt: null,
    communities: [],
    events: [],
    ...overrides,
  };
}

function normalizeUserProfile(data = {}, overrides = {}) {
  return createDefaultUserProfile({
    ...data,
    ...overrides,
    role: data.role || overrides.role || 'member',
    organizerAccess: data.organizerAccess ?? overrides.organizerAccess ?? false,
    avatar: data.avatar || overrides.avatar || '',
    bio: data.bio || overrides.bio || '',
    joinedAt: data.joinedAt ?? overrides.joinedAt ?? null,
    communities: Array.isArray(data.communities) ? data.communities : (Array.isArray(overrides.communities) ? overrides.communities : []),
    events: Array.isArray(data.events) ? data.events : (Array.isArray(overrides.events) ? overrides.events : []),
  });
}

// ── Current User ─────────────────────────────
let currentUser = null;

function setCurrentUser(user, persist = true) {
  currentUser = user;
  if (user) {
    const primaryStorage = persist ? localStorage : sessionStorage;
    const secondaryStorage = persist ? sessionStorage : localStorage;
    primaryStorage.setItem('nexora_user', JSON.stringify(user));
    secondaryStorage.removeItem('nexora_user');
  } else {
    localStorage.removeItem('nexora_user');
    sessionStorage.removeItem('nexora_user');
  }
}

function getCurrentUser() {
  if (currentUser) return currentUser;
  const storedUser = localStorage.getItem('nexora_user') || sessionStorage.getItem('nexora_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    return currentUser;
  }
  return null;
}

// ── Auth State ────────────────────────────────
function onAuthChange(callback) {
  const user = getCurrentUser();
  callback(user);
}

// ── Route Protection ──────────────────────────
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = getRelativePath('login.html');
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = getRelativePath('dashboard.html');
  }
}

function getRelativePath(page) {
  // Works from any depth in the folder structure
  const path = window.location.pathname;
  const isInPages = path.includes('/pages/');
  return isInPages ? `../${page}` : page;
}

// ── Login ─────────────────────────────────────
async function loginUser(email, password, options = {}) {
  const shouldPersist = options.rememberMe !== false;
  if (DEMO_MODE) {
    const user = DEMO_USERS[email.toLowerCase()];
    if (!user) throw new Error('No account found with this email.');
    if (password.length < 6) throw new Error('Invalid password.');
    const profile = normalizeUserProfile(user, { uid: user.uid, email: user.email, name: user.name });
    setCurrentUser(profile, shouldPersist);
    return profile;
  }

  // Firebase login
  const cred = await auth.signInWithEmailAndPassword(email, password);
  let userData = {};
  if (HAS_FIRESTORE) {
    try {
      const snap = await db.collection('users').doc(cred.user.uid).get();
      userData = snap.exists ? snap.data() : {};
    } catch (error) {
      console.warn('Firestore lookup skipped during login', error);
    }
  }
  const user = normalizeUserProfile(userData, {
    uid: cred.user.uid,
    email: cred.user.email,
    name: cred.user.displayName || userData.name || 'User',
    avatar: userData.avatar || cred.user.displayName?.charAt(0) || 'U',
    joinedAt: userData.joinedAt || null,
  });
  setCurrentUser(user, shouldPersist);
  return user;
}

// ── Register ──────────────────────────────────
async function registerUser(name, email, password) {
  if (DEMO_MODE) {
    const user = createDefaultUserProfile({
      uid: 'u_' + Date.now(),
      name,
      email,
      role: 'member',
      organizerAccess: false,
      avatar: name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
      bio: '',
      joinedAt: new Date().toISOString(),
      communities: [],
      events: [],
    });
    setCurrentUser(user);
    DEMO_USERS[email.toLowerCase()] = user;
    return user;
  }

  // Firebase register
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: name });

  const userData = createDefaultUserProfile({
    uid:       cred.user.uid,
    name,
    email,
    role:      'member',
    organizerAccess: false,
    avatar:    name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
    bio:       '',
    joinedAt:  firebase.firestore.FieldValue.serverTimestamp(),
    communities: [],
    events: [],
  });
  if (HAS_FIRESTORE) {
    try {
      await db.collection('users').doc(cred.user.uid).set(userData);
    } catch (error) {
      console.warn('Firestore profile write skipped during registration', error);
    }
  }

  const sessionUser = normalizeUserProfile(userData, { joinedAt: new Date().toISOString() });
  setCurrentUser(sessionUser);
  return sessionUser;
}

// ── Google Auth ───────────────────────────────
async function loginWithGoogle() {
  if (DEMO_MODE) {
    const user = createDefaultUserProfile({
      uid:'ug_'+Date.now(),
      name:'Demo User',
      email:'demo@gmail.com',
      role:'member',
      organizerAccess:false,
      avatar:'DU',
      bio:'',
      joinedAt:new Date().toISOString(),
      communities:[],
      events:[],
    });
    setCurrentUser(user);
    return user;
  }
  const cred = await auth.signInWithPopup(googleProvider);
  const uid = cred.user.uid;
  let snap = null;
  if (HAS_FIRESTORE) {
    try {
      snap = await db.collection('users').doc(uid).get();
    } catch (error) {
      console.warn('Firestore lookup skipped during Google sign-in', error);
    }
  }

  if (!snap || !snap.exists) {
    const userData = createDefaultUserProfile({
      uid,
      name:   cred.user.displayName,
      email:  cred.user.email,
      role:   'member',
      organizerAccess: false,
      avatar: cred.user.photoURL || cred.user.displayName?.charAt(0) || 'G',
      bio:    '',
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      communities: [], events: [],
    });
    if (HAS_FIRESTORE) {
      try {
        await db.collection('users').doc(uid).set(userData);
      } catch (error) {
        console.warn('Firestore profile write skipped during Google sign-in', error);
      }
    }
    const sessionUser = normalizeUserProfile(userData, { joinedAt: new Date().toISOString() });
    setCurrentUser(sessionUser);
    return sessionUser;
  }

  const userData = normalizeUserProfile(snap.data(), {
    uid,
    name: cred.user.displayName || snap.data()?.name || 'User',
    email: cred.user.email,
    avatar: snap.data()?.avatar || cred.user.photoURL || cred.user.displayName?.charAt(0) || 'G',
  });
  setCurrentUser(userData);
  return userData;
}

// ── Logout ────────────────────────────────────
async function logoutUser() {
  if (!DEMO_MODE) {
    try { await auth.signOut(); } catch(e) {}
  }
  setCurrentUser(null);
  window.location.href = getRelativePath('login.html');
}

// ── Populate navbar user info ─────────────────
function populateUserInfo() {
  const user = getCurrentUser();
  if (!user) return;

  // Avatar
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    el.textContent = user.avatar || user.name?.charAt(0) || 'U';
  });
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = user.email;
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = user.role?.charAt(0).toUpperCase() + user.role?.slice(1);
  });

  // Role badge
  document.querySelectorAll('.role-badge').forEach(el => {
    el.className = `role-badge ${user.role}`;
    el.textContent = user.role?.toUpperCase();
  });
}
