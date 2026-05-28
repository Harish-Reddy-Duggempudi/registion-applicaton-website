// =============================================
// NEXOVERSE — Auth Module
// =============================================

// ── Demo Mode (no Firebase) ──────────────────
// When Firebase is not configured, we use localStorage for demo
const DEMO_MODE = !window.db;

// ── Dummy users for demo ──────────────────────
const DEMO_USERS = {
  'student@nexoverse.dev':   { uid:'u1', name:'Aarav Mehta',   email:'student@nexoverse.dev',   role:'student',   avatar:'AM', bio:'CS student at IIIT Hyderabad 🚀' },
  'organizer@nexoverse.dev': { uid:'u2', name:'Priya Sharma',  email:'organizer@nexoverse.dev', role:'organizer', avatar:'PS', bio:'Tech community builder' },
  'admin@nexoverse.dev':     { uid:'u3', name:'Rohan Verma',   email:'admin@nexoverse.dev',     role:'admin',     avatar:'RV', bio:'NEXOVERSE Platform Admin' },
};

// ── Current User ─────────────────────────────
let currentUser = null;

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('nexoverse_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('nexoverse_user');
  }
}

function getCurrentUser() {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem('nexoverse_user');
  if (stored) {
    currentUser = JSON.parse(stored);
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
async function loginUser(email, password) {
  if (DEMO_MODE) {
    const user = DEMO_USERS[email.toLowerCase()];
    if (!user) throw new Error('No account found with this email.');
    if (password.length < 6) throw new Error('Invalid password.');
    setCurrentUser(user);
    return user;
  }

  // Firebase login
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const snap = await db.collection('users').doc(cred.user.uid).get();
  const userData = snap.exists ? snap.data() : { role: 'student' };
  const user = {
    uid:    cred.user.uid,
    email:  cred.user.email,
    name:   cred.user.displayName || userData.name || 'User',
    role:   userData.role,
    avatar: userData.avatar || cred.user.displayName?.charAt(0) || 'U',
  };
  setCurrentUser(user);
  return user;
}

// ── Register ──────────────────────────────────
async function registerUser(name, email, password, role) {
  if (DEMO_MODE) {
    const user = {
      uid:    'u_' + Date.now(),
      name,
      email,
      role,
      avatar: name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
      bio: '',
    };
    setCurrentUser(user);
    DEMO_USERS[email.toLowerCase()] = user;
    return user;
  }

  // Firebase register
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: name });

  const userData = {
    uid:       cred.user.uid,
    name,
    email,
    role,
    avatar:    name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
    bio:       '',
    joinedAt:  firebase.firestore.FieldValue.serverTimestamp(),
    communities: [],
    events: [],
  };
  await db.collection('users').doc(cred.user.uid).set(userData);

  setCurrentUser({ ...userData, uid: cred.user.uid });
  return userData;
}

// ── Google Auth ───────────────────────────────
async function loginWithGoogle() {
  if (DEMO_MODE) {
    // Demo: create student account
    const user = { uid:'ug_'+Date.now(), name:'Demo User', email:'demo@gmail.com', role:'student', avatar:'DU', bio:'' };
    setCurrentUser(user);
    return user;
  }
  const cred = await auth.signInWithPopup(googleProvider);
  const uid = cred.user.uid;
  const snap = await db.collection('users').doc(uid).get();

  if (!snap.exists) {
    const userData = {
      uid,
      name:   cred.user.displayName,
      email:  cred.user.email,
      role:   'student',
      avatar: cred.user.displayName?.charAt(0) || 'G',
      bio:    '',
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      communities: [], events: [],
    };
    await db.collection('users').doc(uid).set(userData);
    setCurrentUser(userData);
    return userData;
  }

  const userData = snap.data();
  setCurrentUser({ ...userData, uid });
  return { ...userData, uid };
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
