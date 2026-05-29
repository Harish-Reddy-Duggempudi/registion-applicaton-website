// =============================================
// NEXOVERSE — Events Module
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('events.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initEventsPage();
  }
  if (path.includes('event-details.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initEventDetailsPage();
  }
  if (path.includes('create-event.html')) {
    if (!requireAuth()) return;
    populateUserInfo();
    initCreateEventPage();
  }
});

// ── Events List Page ──────────────────────────
function initEventsPage() {
  renderEventCards('all');
  initEventFilters();
  initEventSearch();
}

function renderEventCards(filter, searchQuery = '') {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  createSkeletonCards(grid, 6, 320);

  setTimeout(() => {
    let list = searchQuery ? DataStore.searchEvents(searchQuery) : DataStore.getEvents(filter !== 'all' ? filter : null);

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">No events found</div>
          <div class="empty-desc">Try different filters or check back later for new events.</div>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(e => buildEventCard(e)).join('');
  }, 600);
}

function buildEventCard(e) {
  const user = getCurrentUser();
  const userRegs = DataStore.getUserRegistrations(user?.uid || '');
  const isRegistered = userRegs.some(r => r.eventId === e.id);
  const fillPct = Math.round((e.attendees / e.maxAttendees) * 100);

  return `
    <div class="event-card" data-category="${e.category}">
      <div class="event-card-banner" style="background:${e.banner}">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:52px">${e.emoji}</div>
        <div style="position:absolute;top:12px;right:12px">
          <span class="badge ${e.isFree ? 'badge-green' : 'badge-purple'}">${e.isFree ? '🆓 Free' : '₹'+e.price}</span>
        </div>
        <div style="position:absolute;top:12px;left:12px">
          <span class="badge badge-blue">${e.category}</span>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-card-title">${e.title}</div>
        <div class="event-card-meta">
          <span>📅 ${formatDate(e.date)} · ⏰ ${e.time}</span>
          <span>${e.isOnline ? '🌐 Online Event' : '📍 '+e.venue.split(',')[0]}</span>
          <span>🏛️ ${e.organizer}</span>
        </div>
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
            <span>👥 ${e.attendees.toLocaleString()} attending</span>
            <span>${fillPct}% full</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${fillPct}%"></div></div>
        </div>
        <div class="event-card-footer">
          <button class="btn ${isRegistered ? 'btn-ghost' : 'btn-primary'} btn-sm"
            onclick="handleEventRegister(event,'${e.id}','${e.title}')"
            ${isRegistered ? 'style="pointer-events:none"' : ''}>
            ${isRegistered ? '✅ Registered' : '🎫 Register Now'}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="window.location='event-details.html?id=${e.id}'">Details →</button>
        </div>
      </div>
    </div>`;
}

function initEventFilters() {
  const chips = document.querySelectorAll('.events-filter .filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const searchVal = document.getElementById('event-search')?.value || '';
      renderEventCards(chip.dataset.filter, searchVal);
    });
  });
}

function initEventSearch() {
  const input = document.getElementById('event-search');
  if (!input) return;
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const activeFilter = document.querySelector('.events-filter .filter-chip.active')?.dataset.filter || 'all';
      renderEventCards(activeFilter, input.value);
    }, 350);
  });
}

function handleEventRegister(event, eventId, eventTitle) {
  event.stopPropagation();
  const user = getCurrentUser();
  if (!user) { toast.error('Login required'); return; }

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = '⏳ Registering...';

  setTimeout(() => {
    const reg = DataStore.addRegistration(user.uid, eventId);
    btn.textContent = '✅ Registered';
    btn.className = 'btn btn-ghost btn-sm';
    toast.success('Registration confirmed! 🎉', `Your ticket ID: ${reg.ticketId}`);
  }, 900);
}

// ── Event Details Page ────────────────────────
function initEventDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id') || 'e1';
  const event  = DataStore.getEvent(id);

  if (!event) {
    document.getElementById('event-detail-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Event not found</div>
        <a href="events.html" class="btn btn-primary mt-3">Browse Events</a>
      </div>`;
    return;
  }

  renderEventDetail(event);
}

function renderEventDetail(e) {
  const el = document.getElementById('event-detail-content');
  if (!el) return;

  const user = getCurrentUser();
  const userRegs = DataStore.getUserRegistrations(user?.uid || '');
  const isRegistered = userRegs.some(r => r.eventId === e.id);
  const fillPct = Math.round((e.attendees / e.maxAttendees) * 100);
  const canManage = typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user?.role === 'organizer' || user?.role === 'admin');

  el.innerHTML = `
    <!-- Banner -->
    <div class="event-detail-banner">
      <div style="position:absolute;inset:0;background:${e.banner};display:flex;align-items:center;justify-content:center;font-size:80px">${e.emoji}</div>
      <div class="event-detail-banner-overlay"></div>
      <div class="event-detail-banner-content">
        <div class="event-detail-category">${e.category}</div>
        <div class="event-detail-title">${e.title}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${e.tags.map(t=>`<span class="badge badge-blue">${t}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- Layout -->
    <div class="event-detail-layout">
      <!-- Main Content -->
      <div>
        <!-- About -->
        <div class="card mb-4">
          <div class="section-title mb-3">📋 About this Event</div>
          <p style="color:var(--text-secondary);font-size:14px;line-height:1.9">${e.desc}</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px">
            ${[
              { icon:'📅', label:'Date', value: formatDate(e.date) },
              { icon:'⏰', label:'Time', value: e.time },
              { icon:'📍', label:'Venue', value: e.isOnline ? 'Online Event' : e.venue },
              { icon:'🏛️', label:'Organizer', value: e.organizer },
              { icon:'👥', label:'Capacity', value: `${e.attendees}/${e.maxAttendees} registered` },
              { icon:'💰', label:'Entry', value: e.isFree ? 'Free' : '₹'+e.price },
            ].map(row => `
              <div style="display:flex;align-items:flex-start;gap:10px">
                <span style="font-size:18px">${row.icon}</span>
                <div>
                  <div class="text-muted text-xs">${row.label}</div>
                  <div class="text-sm font-semibold mt-1">${row.value}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Schedule -->
        ${e.schedule && e.schedule.length > 0 ? `
          <div class="card mb-4">
            <div class="section-title mb-4">📅 Event Schedule</div>
            ${e.schedule.map(s => `
              <div class="schedule-item">
                <div class="schedule-time">${s.time}</div>
                <div class="schedule-dot"></div>
                <div class="schedule-content">
                  <div class="schedule-title">${s.title}</div>
                  ${s.speaker ? `<div class="schedule-speaker">🎙️ ${s.speaker}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Attendees -->
        <div class="card">
          <div class="section-header">
            <div class="section-title">👥 Attendees (${e.attendees.toLocaleString()})</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
            ${['AM','PS','KN','SR','RV','AP','VJ','MK','TL','PR'].map(av => `
              <div class="avatar avatar-md" style="background:var(--gradient-primary)">${av}</div>
            `).join('')}
            <div class="avatar avatar-md" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);font-size:11px">
              +${e.attendees - 10}
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${fillPct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-top:6px">
            <span>${e.attendees} registered</span>
            <span>${e.maxAttendees - e.attendees} spots left</span>
          </div>
        </div>

        ${canManage ? `
          <div class="card mt-4">
            <div class="section-title mb-4">⚙️ Organizer Controls</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" onclick="toast.info('Coming soon','Export feature launching next sprint')">📊 Export Registrations</button>
              <button class="btn btn-outline btn-sm" onclick="toast.info('Coming soon','Email blast feature launching next sprint')">📧 Email All Attendees</button>
              <button class="btn btn-danger btn-sm">🗑️ Cancel Event</button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Sidebar: Registration Card -->
      <div>
        <div class="event-info-card">
          <div class="event-info-card-price">
            ${e.isFree ? '<span class="text-green">Free</span>' : `<span class="text-gradient">₹${e.price}</span>`}
          </div>
          ${isRegistered
            ? `<div style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:center">
                <div style="color:var(--green-400);font-weight:700;font-size:14px">✅ You're Registered!</div>
                <div style="color:var(--text-muted);font-size:12px;margin-top:4px">${userRegs.find(r=>r.eventId===e.id)?.ticketId || ''}</div>
              </div>`
            : `<button class="btn btn-primary w-full mb-3" style="justify-content:center" onclick="quickRegister('${e.id}','${e.title}')">🎫 Register Now</button>`
          }

          ${[
            { icon:'📅', label:'Event Date',   value: formatDate(e.date) },
            { icon:'⏰', label:'Start Time',   value: e.time },
            { icon:'📍', label:'Location',     value: e.isOnline ? 'Online' : e.venue },
            { icon:'🏛️', label:'Organized by', value: e.organizer },
          ].map(row => `
            <div class="event-info-row">
              <span class="event-info-icon">${row.icon}</span>
              <div>
                <div class="event-info-label">${row.label}</div>
                <div class="event-info-value">${row.value}</div>
              </div>
            </div>
          `).join('')}

          <div style="margin-top:16px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px">
              <span>Seats filling up</span>
              <span>${fillPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${fillPct}%"></div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-ghost btn-sm w-full" onclick="shareEvent('${e.id}')">🔗 Share</button>
            <button class="btn btn-ghost btn-sm w-full" onclick="toast.info('Saved!','Event added to your wishlist')">🔖 Save</button>
          </div>
        </div>

        <!-- Community card -->
        ${e.communityId ? (() => {
          const c = DataStore.getCommunity(e.communityId);
          return c ? `
            <div class="card mt-4">
              <div class="text-muted text-xs mb-3">ORGANIZED BY</div>
              <div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="window.location='community-details.html?id=${c.id}'">
                <div style="width:44px;height:44px;border-radius:10px;background:${c.banner};display:flex;align-items:center;justify-content:center;font-size:20px">${c.emoji}</div>
                <div>
                  <div class="font-semibold text-sm">${c.name}</div>
                  <div class="text-muted text-xs">👥 ${c.members.toLocaleString()} members</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm w-full mt-3" onclick="joinCommunity && joinCommunity('${c.id}','${c.name}')">🌟 Join Community</button>
            </div>` : '';
        })() : ''}
      </div>
    </div>
  `;
}

function quickRegister(eventId, title) {
  const user = getCurrentUser();
  if (!user) { toast.error('Login required'); return; }
  const reg = DataStore.addRegistration(user.uid, eventId);
  toast.success('Registration confirmed! 🎉', `Ticket: ${reg.ticketId}`);
  setTimeout(() => initEventDetailsPage(), 800);
}

function shareEvent(id) {
  const url = window.location.origin + window.location.pathname + '?id=' + id;
  copyToClipboard(url);
}

// ── Create Event Page ─────────────────────────
function initCreateEventPage() {
  const user = getCurrentUser();
  if (typeof canUseOrganizerFeatures === 'function' ? !canUseOrganizerFeatures(user) : user?.role === 'member') {
    toast.warning('Restricted', 'Only organizers can create events.');
  }

  // Pre-fill community if passed in URL
  const params = new URLSearchParams(window.location.search);
  const communityId = params.get('community');
  if (communityId) {
    const sel = document.getElementById('e-community');
    if (sel) {
      // Populate options
      DataStore.getCommunities().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === communityId) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  } else {
    const sel = document.getElementById('e-community');
    if (sel) {
      DataStore.getCommunities().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
  }

  const form = document.getElementById('create-event-form');
  if (!form) return;

  // Free/Paid toggle
  const freeToggle = document.getElementById('e-is-free');
  const priceGroup = document.getElementById('price-group');
  if (freeToggle && priceGroup) {
    freeToggle.addEventListener('change', () => {
      priceGroup.style.display = freeToggle.checked ? 'none' : '';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCreateEventForm(form)) return;

    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.classList.add('loading');
    await new Promise(r => setTimeout(r, 1400));

    const title = form.querySelector('#e-title').value;
    toast.success('Event Created! 🎉', `"${title}" submitted for review. It'll be live once approved.`);
    submitBtn.classList.remove('loading');
    setTimeout(() => window.location.href = 'events.html', 1600);
  });
}

function validateCreateEventForm(form) {
  let valid = true;
  const required = form.querySelectorAll('[required]');
  required.forEach(field => {
    field.classList.remove('error');
    const errEl = field.parentElement.querySelector('.input-error');
    if (errEl) errEl.remove();

    if (!field.value.trim()) {
      valid = false;
      field.classList.add('error');
      const err = document.createElement('div');
      err.className = 'input-error';
      err.textContent = 'This field is required';
      field.parentElement.appendChild(err);
    }
  });
  if (!valid) toast.error('Form incomplete', 'Please fill in all required fields.');
  return valid;
}
