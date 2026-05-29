// =============================================
// NEXOVERSE — Firebase Config
// =============================================
// Replace these with your actual Firebase project config from Firebase Console
// https://console.firebase.google.com

const firebaseConfig = {
  apiKey: "AIzaSyDVwBEszUfCLc-u2H5MSxqgsPGveUN-3MA",
  authDomain: "nexoverse-f3666.firebaseapp.com",
  projectId: "nexoverse-f3666",
  storageBucket: "nexoverse-f3666.firebasestorage.app",
  messagingSenderId: "269560561832",
  appId: "1:269560561832:web:5c9300f24c406b6a5a429d",
  measurementId: "G-9V77F6M1D9"
};

// ── Initialize Firebase ──
// NOTE: We use the compat SDK loaded via CDN in HTML files.
// Make sure these scripts are included BEFORE firebase.js:
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization failed', error);
}

// ── Export globals ──
let db = null;
let auth = null;
let googleProvider = null;

try {
  if (typeof firebase !== 'undefined') {
    auth = firebase.auth();
    console.log('Auth:', auth);
    googleProvider = new firebase.auth.GoogleAuthProvider();

    try {
      db = firebase.firestore();
    } catch (firestoreError) {
      console.warn('Firestore unavailable, continuing with authentication only', firestoreError);
      db = null;
    }
  }
} catch (error) {
  console.error('Firebase initialization failed', error);
}

// ── Firestore Collections ──
// users/         { uid, name, email, role, avatar, bio, joinedAt, communities[], events[] }
// communities/   { id, name, desc, category, banner, logo, organizer, members[], createdAt, isApproved }
// events/        { id, title, desc, category, date, time, venue, isOnline, organizer, communityId, attendees[], banner, isApproved, tags[], maxAttendees, isFree, price }
// registrations/ { id, userId, eventId, status, registeredAt, ticketId }
// notifications/ { id, userId, type, title, message, read, createdAt }
