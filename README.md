# 🚀 Nexora — Student Organizer Ecosystem Platform

> A premium, startup-grade SaaS platform for students, organizers, campus ambassadors, coding clubs, hackathon organizers, and tech communities.

---

## ✨ What is Nexora?

Nexora is a **role-based community + event management SaaS** that combines:

- 🌐 **Community Management** — Create, join, and manage student tech communities (GDGs, MLSAs, ACMs, IEEE)
- 🎯 **Event Management** — Plan and run hackathons, workshops, tech talks, networking events
- 🎫 **Smart Registrations** — One-click registration with digital tickets and confirmations
- 📊 **Analytics Dashboard** — Real-time charts for growth, attendance, and engagement
- 🤖 **AI Productivity Tools** — Generate titles, descriptions, announcements, emails, and captions using Claude AI
- 🛡️ **Role-Based Dashboards** — Three distinct experiences for Students, Organizers, and Admins

---

## 📁 Project Structure

```
nexora/
├── index.html               ← Landing page
├── login.html               ← Login page
├── signup.html              ← Sign up page
├── dashboard.html           ← Main role-based dashboard
│
├── pages/
│   ├── communities.html     ← Browse & join communities
│   ├── community-details.html ← Single community view
│   ├── create-community.html  ← Create new community form
│   ├── events.html          ← Browse & filter events
│   ├── event-details.html   ← Single event view + registration
│   ├── create-event.html    ← Create new event form
│   ├── registrations.html   ← My tickets & registration history
│   ├── analytics.html       ← Charts and growth metrics
│   ├── ai-tools.html        ← AI content generators
│   ├── settings.html        ← Profile, notifications, appearance
│   └── admin-panel.html     ← Admin-only management panel
│
├── css/
│   ├── global.css           ← Design system, variables, components
│   ├── landing.css          ← Landing page styles
│   ├── auth.css             ← Login & signup styles
│   ├── dashboard.css        ← Sidebar, navbar, dashboard layout
│   └── community.css        ← Community, event, analytics styles
│
├── js/
│   ├── firebase.js          ← Firebase config (replace with your keys)
│   ├── auth.js              ← Auth logic, role storage, route protection
│   ├── data.js              ← Dummy data store + DataStore API
│   ├── ui.js                ← Toast, loader, modal, tabs, search
│   ├── dashboard.js         ← Role-based dashboard rendering
│   ├── communities.js       ← Communities module
│   ├── events.js            ← Events module
│   └── analytics.js         ← Analytics, AI tools, registrations, settings, admin
│
└── components/
    └── sidebar.js           ← Sidebar + navbar builder component
```

---

## 🎭 Demo Accounts

Open the project and use these pre-built accounts on the login page:

| Role       | Email                    | Password         |
|------------|--------------------------|------------------|
| 🎓 Student  | student@nexora.dev       | any 6+ chars     |
| ⚡ Organizer| organizer@nexora.dev     | any 6+ chars     |
| 🛡️ Admin   | admin@nexora.dev         | any 6+ chars     |

> **No Firebase setup needed for the demo** — the app runs in demo mode using localStorage.

---

## 🚀 Quick Start (No Setup Required)

```bash
# 1. Clone or download the project
git clone https://github.com/your-username/nexora.git

# 2. Open in VS Code
code nexora/

# 3. Install the Live Server extension (VS Code)
# Then right-click index.html → "Open with Live Server"

# OR use Python's built-in server
cd nexora
python -m http.server 3000
# Open http://localhost:3000
```

That's it. No npm, no build step, no dependencies.

---

## 🔥 Firebase Setup (For Production)

### Step 1: Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add Project"** → Name it `nexora`
3. Enable **Google Analytics** (optional)

### Step 2: Enable Authentication

1. In Firebase console → **Authentication** → **Get Started**
2. Enable **Email/Password** provider
3. Enable **Google** provider (add your domain to authorized domains)

### Step 3: Create Firestore Database

1. **Firestore Database** → **Create Database**
2. Start in **test mode** for development
3. Firestore Rules for production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /communities/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /events/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /registrations/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 4: Get Config Keys

1. **Project Settings** → **Your Apps** → **Web App** → Register
2. Copy the `firebaseConfig` object

### Step 5: Add Config to Project

Replace the placeholder in `js/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abc123"
};
```

### Step 6: Add Firebase CDN to HTML files

Add these scripts before `</body>` in all HTML files (already included in the template):

```html
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
```

---

## 🗄️ Firestore Data Structure

```
users/
  {uid}/
    name: string
    email: string
    role: "student" | "organizer" | "admin"
    avatar: string          ← initials e.g. "AM"
    bio: string
    joinedAt: timestamp
    communities: string[]   ← array of community IDs
    events: string[]        ← array of registered event IDs

communities/
  {id}/
    name: string
    desc: string
    category: string
    banner: string          ← CSS gradient or image URL
    emoji: string
    organizer: string       ← organizer name
    organizer_uid: string
    members: number
    events: number
    tags: string[]
    isApproved: boolean
    createdAt: timestamp

events/
  {id}/
    title: string
    desc: string
    category: string
    date: string            ← ISO date
    time: string
    venue: string
    isOnline: boolean
    isFree: boolean
    price: number
    organizer: string
    organizer_uid: string
    communityId: string
    attendees: number
    maxAttendees: number
    tags: string[]
    banner: string
    emoji: string
    isApproved: boolean
    createdAt: timestamp

registrations/
  {id}/
    userId: string
    eventId: string
    status: "confirmed" | "pending" | "cancelled"
    registeredAt: timestamp
    ticketId: string
    attended: boolean

notifications/
  {id}/
    userId: string
    type: "event" | "community" | "registration" | "system"
    title: string
    message: string
    read: boolean
    createdAt: timestamp
```

---

## 🤖 AI Tools Setup

The AI Tools page uses the **Anthropic Claude API**.

1. Get your API key at [https://console.anthropic.com](https://console.anthropic.com)
2. **Note:** API keys should never be exposed in frontend code in production
3. For production, create a backend proxy (Node.js / Firebase Cloud Functions) that holds the key server-side
4. For demo/dev: the app falls back to realistic placeholder outputs automatically

---

## 🌐 Deployment

### Netlify (Recommended — Free)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Deploy
cd nexora
netlify deploy --prod --dir .
```

Or drag & drop the `nexora/` folder at [app.netlify.com](https://app.netlify.com)

### Vercel

```bash
npm install -g vercel
cd nexora
vercel --prod
```

### GitHub Pages

```bash
# Push to GitHub, then:
# Settings → Pages → Source: main branch / root
```

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: . (current)
firebase deploy
```

---

## 🧰 Tech Stack

| Layer        | Technology                     |
|--------------|-------------------------------|
| Frontend     | HTML5, CSS3, Vanilla JS (ES6+) |
| Fonts        | Syne (display), DM Sans (body) |
| Auth         | Firebase Authentication        |
| Database     | Firestore (NoSQL)              |
| AI           | Anthropic Claude API           |
| Hosting      | Netlify / Vercel / Firebase    |

**Zero build step. Zero npm. Zero frameworks. Pure web.**

---

## 🎨 Design System

| Token           | Value                          |
|-----------------|-------------------------------|
| Background      | `#060612` (deep dark)          |
| Primary Purple  | `#a855f7`                      |
| Blue            | `#3b82f6`                      |
| Cyan            | `#22d3ee`                      |
| Gradient        | `135deg, #a855f7 → #3b82f6`    |
| Border          | `rgba(255,255,255,0.08)`       |
| Font Display    | Syne (700, 800)                |
| Font Body       | DM Sans (400, 500, 600)        |
| Border Radius   | 6px / 10px / 16px / 24px       |

---

## 🔐 Role-Based Access

| Feature               | Student | Organizer | Admin |
|-----------------------|:-------:|:---------:|:-----:|
| View Dashboard        | ✅      | ✅        | ✅    |
| Join Communities      | ✅      | ✅        | ✅    |
| Register for Events   | ✅      | ✅        | ✅    |
| Create Communities    | ❌      | ✅        | ✅    |
| Create Events         | ❌      | ✅        | ✅    |
| View Own Analytics    | ✅      | ✅        | ✅    |
| View Organizer Stats  | ❌      | ✅        | ✅    |
| Access Admin Panel    | ❌      | ❌        | ✅    |
| Approve Content       | ❌      | ❌        | ✅    |
| Manage Users          | ❌      | ❌        | ✅    |

---

## 📱 Responsive Breakpoints

| Breakpoint | Width     | Behavior                        |
|------------|-----------|---------------------------------|
| Desktop    | ≥ 1024px  | Full sidebar + multi-column layout |
| Tablet     | 768–1023px| Sidebar hidden, hamburger menu  |
| Mobile     | < 768px   | Single column, slide-out sidebar |

---

## 🛣️ Roadmap

- [ ] Firebase Storage for banner/avatar uploads
- [ ] QR Code ticket scanner for event check-in
- [ ] Certificate generator with custom templates
- [ ] Real-time notifications with Firestore listeners
- [ ] Dark / Light theme toggle
- [ ] Mobile app (React Native or PWA)
- [ ] Community feed / announcements board
- [ ] Event livestream integration

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — free for personal and commercial use.

---

## 💬 Support

Built with ❤️ for the student community ecosystem.

**Questions?** Open a GitHub issue or reach out at hello@nexora.dev

---

*Nexora — Where student communities thrive. 🚀*
