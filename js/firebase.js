// =============================================
// NEXOVERSE — Firebase Config
// =============================================
// Replace these with your actual Firebase project config from Firebase Console
// https://console.firebase.google.com

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ── Initialize Firebase ──
// NOTE: We use the compat SDK loaded via CDN in HTML files.
// Make sure these scripts are included BEFORE firebase.js:
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}

// ── Export globals ──
const db   = typeof firebase !== 'undefined' ? firebase.firestore()  : null;
const auth = typeof firebase !== 'undefined' ? firebase.auth()       : null;
const googleProvider = typeof firebase !== 'undefined'
  ? new firebase.auth.GoogleAuthProvider()
  : null;

// ── Firestore Collections ──
// users/         { uid, name, email, role, avatar, bio, joinedAt, communities[], events[] }
// communities/   { id, name, desc, category, banner, logo, organizer, members[], createdAt, isApproved }
// events/        { id, title, desc, category, date, time, venue, isOnline, organizer, communityId, attendees[], banner, isApproved, tags[], maxAttendees, isFree, price }
// registrations/ { id, userId, eventId, status, registeredAt, ticketId }
// notifications/ { id, userId, type, title, message, read, createdAt }
