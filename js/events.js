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
async function initEventsPage() {
  if (DataStore?.loadEventsFromFirestore) {
    try {
      await DataStore.loadEventsFromFirestore();
    } catch (error) {
      console.warn('Event sync failed', error);
    }
  }
  renderFeaturedEvent();
  renderEventCards('all');
  initEventFilters();
  initEventSearch();
}

function renderFeaturedEvent() {
  const banner = document.getElementById('featured-event-banner');
  const titleEl = document.getElementById('featured-event-title');
  const metaEl = document.getElementById('featured-event-meta');
  const linkEl = document.getElementById('featured-event-link');
  if (!banner || !titleEl || !metaEl || !linkEl) return;

  const liveEvents = typeof DataStore.getLiveEvents === 'function' ? DataStore.getLiveEvents() : [];
  const source = liveEvents.filter(event => event.isApproved && !event.removedByAdmin);

  if (!source.length) {
    banner.style.display = 'none';
    return;
  }

  const featured = [...source].sort((a, b) => {
    const aAttendees = Number(a.attendees || 0);
    const bAttendees = Number(b.attendees || 0);
    if (bAttendees !== aAttendees) return bAttendees - aAttendees;
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  })[0];

  const seatsFilled = `${Number(featured.attendees || 0)}/${Number(featured.maxAttendees || 0)} seats filled`;
  titleEl.textContent = featured.title || 'Featured Event';
  metaEl.textContent = `📅 ${formatDate(featured.date)} · ${featured.venue || 'Venue TBA'} · 👥 ${seatsFilled}`;
  linkEl.href = `event-details.html?id=${encodeURIComponent(featured.id)}`;
}

function renderEventCards(filter, searchQuery = '') {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  createSkeletonCards(grid, 6, 320);

  setTimeout(() => {
    let list = searchQuery ? DataStore.searchEvents(searchQuery) : DataStore.getEvents(filter !== 'all' ? filter : null);
    // Filter out content administratively hidden
    list = (list || []).filter(item => !item.removedByAdmin);
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
  if (e && e.removedByAdmin) return '';
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

async function handleEventRegister(event, eventId, eventTitle) {
  event.stopPropagation();
  const user = getCurrentUser();
  if (!user) { toast.error('Login required'); return; }

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = '⏳ Registering...';

  try {
    const reg = await DataStore.addRegistration(user.uid, eventId);
    btn.textContent = '✅ Registered';
    btn.className = 'btn btn-ghost btn-sm';
    toast.success('Registration confirmed! 🎉', `Your ticket ID: ${reg.ticketId}`);
  } catch (error) {
    btn.disabled = false;
    btn.textContent = '🎫 Register Now';
    toast.error('Registration failed', error?.message || 'Unable to register for this event.');
  }
}

// ── Event Details Page ────────────────────────
async function initEventDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id') || '';
  if (DataStore?.loadEventsFromFirestore) {
    try {
      await DataStore.loadEventsFromFirestore();
    } catch (error) {
      console.warn('Event detail sync failed', error);
    }
  }
  const event = (typeof DataStore.getLiveEvents === 'function' ? DataStore.getLiveEvents() : []).find(e => e.id === id);

  if (!event) {
    document.getElementById('event-detail-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Event not found</div>
        <div class="empty-desc">This event is not available in the live Firestore list yet.</div>
        <a href="events.html" class="btn btn-primary mt-3">Browse Events</a>
      </div>`;
    return;
  }

  renderEventDetail(event, { profiles: [], count: event.attendees || 0 });

  if (DataStore?.getEventAttendeeProfiles) {
    DataStore.getEventAttendeeProfiles(id, 10)
      .then(attendeeData => {
        const latestEvent = (typeof DataStore.getLiveEvents === 'function' ? DataStore.getLiveEvents() : []).find(item => item.id === id);
        if (!latestEvent) return;
        renderEventDetail(latestEvent, attendeeData);
      })
      .catch(error => {
        console.warn('Attendee profile load failed', error);
      });
  }
}

function renderEventDetail(e, attendeeData = { profiles: [], count: 0 }) {
  const el = document.getElementById('event-detail-content');
  if (!el) return;

  if (e.removedByAdmin) {
    el.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">🚫</div>
          <div class="empty-title">Content removed by admin</div>
          <div class="empty-desc">This event has been hidden by an administrator. If you believe this is an error, contact support.</div>
        </div>
      </div>`;
    return;
  }

  const user = getCurrentUser();
  const userRegs = DataStore.getUserRegistrations(user?.uid || '');
  const isRegistered = userRegs.some(r => r.eventId === e.id);
  const liveAttendeeCount = Number(attendeeData.count || e.attendees || 0);
  const attendeeProfiles = Array.isArray(attendeeData.profiles) ? attendeeData.profiles : [];
  const fillPct = Math.round((liveAttendeeCount / e.maxAttendees) * 100);
  const canManage = typeof canUseOrganizerFeatures === 'function' ? canUseOrganizerFeatures(user) : (user?.role === 'organizer' || user?.role === 'admin');
  const renderSpeakerValue = (item) => {
    if (item && typeof item === 'object') {
      const name = item.name || item.title || '';
      const designation = item.designation || item.role || '';
      return [name, designation].filter(Boolean).join(' — ');
    }
    return String(item || '');
  };
  const renderList = (items) => Array.isArray(items) && items.length > 0
    ? items.map(item => `<li style="margin-bottom:8px">${renderSpeakerValue(item)}</li>`).join('')
    : '<li style="color:var(--text-muted)">Not added yet</li>';

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
                  ${Array.isArray(s.speakers) && s.speakers.length ? `<div class="schedule-speaker">🎙️ ${s.speakers.map(renderSpeakerValue).join(', ')}</div>` : (s.speaker ? `<div class="schedule-speaker">🎙️ ${renderSpeakerValue(s.speaker)}</div>` : '')}
                  ${s.tag ? `<div class="schedule-speaker">🏷️ ${s.tag}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="card mb-4">
          <div class="section-title mb-4">🧭 Agenda</div>
          <ul style="padding-left:18px;color:var(--text-secondary);line-height:1.8;margin:0">${renderList(e.agenda)}</ul>
        </div>

        <div class="card mb-4">
          <div class="section-title mb-4">🎙️ Speakers</div>
          <ul style="padding-left:18px;color:var(--text-secondary);line-height:1.8;margin:0">${renderList(e.speakers)}</ul>
        </div>

        <div class="card mb-4">
          <div class="section-title mb-4">🤝 Sponsors</div>
          <ul style="padding-left:18px;color:var(--text-secondary);line-height:1.8;margin:0">${renderList(e.sponsors)}</ul>
        </div>

        <div class="card mb-4">
          <div class="section-title mb-4">🔗 Collaboration</div>
          <ul style="padding-left:18px;color:var(--text-secondary);line-height:1.8;margin:0">${renderList(e.collaborators)}</ul>
        </div>

        <div class="card mb-4">
          <div class="section-title mb-4">👥 Organising Team</div>
          <ul style="padding-left:18px;color:var(--text-secondary);line-height:1.8;margin:0">${renderList(e.organizingTeam)}</ul>
        </div>

        <!-- Attendees -->
        <div class="card">
          <div class="section-header">
            <div class="section-title">👥 Attendees (${liveAttendeeCount.toLocaleString()})</div>
          </div>
          ${attendeeProfiles.length > 0 ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
              ${attendeeProfiles.map(person => `
                <div style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--bg-card)">
                  <div class="avatar avatar-sm" style="background:var(--gradient-primary)">${person.avatar}</div>
                  <div style="min-width:0">
                    <div class="text-sm font-semibold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${person.name}</div>
                    <div class="text-muted text-xs" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${person.role || 'member'}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-desc" style="margin-bottom:16px">No attendee profiles are available yet.</div>
          `}
          <div class="progress-bar">
            <div class="progress-fill" style="width:${fillPct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-top:6px">
            <span>${liveAttendeeCount} registered</span>
            <span>${Math.max(e.maxAttendees - liveAttendeeCount, 0)} spots left</span>
          </div>
        </div>

        ${canManage ? `
          <div class="card mt-4">
            <div class="section-title mb-4">⚙️ Organizer Controls</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="window.location='create-event.html?edit=${encodeURIComponent(e.id)}'">✏️ Edit Event</button>
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
            <button class="btn btn-ghost btn-sm w-full" onclick="openReportModal('event','${e.id}','${(e.title||'').replace(/'/g, "\\'")}')">🚨 Report</button>
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

async function quickRegister(eventId, title) {
  const user = getCurrentUser();
  if (!user) { toast.error('Login required'); return; }
  try {
    const reg = await DataStore.addRegistration(user.uid, eventId);
    toast.success('Registration confirmed! 🎉', `Ticket: ${reg.ticketId}`);
    setTimeout(() => initEventDetailsPage(), 250);
  } catch (error) {
    toast.error('Registration failed', error?.message || 'Unable to register for this event.');
  }
}

function shareEvent(id) {
  const url = window.location.origin + window.location.pathname + '?id=' + id;
  copyToClipboard(url);
}

function getEventDraftDefaults(category) {
  const normalized = String(category || '').trim();
  const defaults = {
    'Hackathon': { emoji: '🏆', banner: 'linear-gradient(135deg,#7c3aed,#ec4899)' },
    'Workshop': { emoji: '🔧', banner: 'linear-gradient(135deg,#00A4EF,#22d3ee)' },
    'Tech Talk': { emoji: '🎙️', banner: 'linear-gradient(135deg,#4285F4,#34A853)' },
    'Competition': { emoji: '⚡', banner: 'linear-gradient(135deg,#0891b2,#7c3aed)' },
    'Networking': { emoji: '🤝', banner: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
    'Conference': { emoji: '🌐', banner: 'linear-gradient(135deg,#10b981,#3b82f6)' },
  };
  return defaults[normalized] || { emoji: '🎯', banner: 'linear-gradient(135deg,#4f46e5,#06b6d4)' };
}

function splitListField(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseAgendaBlocks(value) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const schedule = [];
  let index = 0;
  while (index < lines.length) {
    const compactMatch = lines[index]?.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.*)$/);
    if (compactMatch) {
      schedule.push({
        time: `${compactMatch[1]} - ${compactMatch[2]}`,
        title: compactMatch[3],
        speaker: '',
      });
      index += 1;
      continue;
    }

    const startTime = lines[index];
    const endTime = lines[index + 1];
    const title = lines[index + 2];
    if (!startTime || !endTime || !title) break;
    schedule.push({
      time: `${startTime} - ${endTime}`,
      title,
      speaker: '',
    });
    index += 3;
  }
  return schedule;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitTimeRange(value) {
  const match = String(value || '').trim().match(/^(.+?)\s*[-–]\s*(.+)$/);
  return match ? { startTime: match[1].trim(), endTime: match[2].trim() } : { startTime: '', endTime: '' };
}

function normalizeSessionDraft(session = {}) {
  const speakerList = Array.isArray(session.speakers)
    ? session.speakers.map(item => {
      if (item && typeof item === 'object') {
        return [item.name || item.title || '', item.designation || item.role || ''].filter(Boolean).join(' — ').trim();
      }
      return String(item).trim();
    }).filter(Boolean)
    : splitListField(session.speaker || '');
  const timeParts = session.startTime || session.endTime
    ? { startTime: session.startTime || '', endTime: session.endTime || '' }
    : splitTimeRange(session.time || '');

  return {
    speakers: speakerList.length ? speakerList : [''],
    title: session.title || session.name || '',
    date: session.date || '',
    startTime: timeParts.startTime || '',
    endTime: timeParts.endTime || '',
    tag: session.tag || '',
  };
}

function splitSpeakerLabel(value) {
  const text = String(value || '').trim();
  if (!text) return { name: '', designation: '' };
  const parts = text.split(/\s+[—-]\s+|\s*\|\s*/);
  return {
    name: parts[0] || '',
    designation: parts.slice(1).join(' — ').trim(),
  };
}

function getSpeakerEntries() {
  const items = document.querySelectorAll('#speaker-builder .speaker-builder-item');
  return Array.from(items).map(item => {
    const name = item.querySelector('.speaker-name')?.value.trim() || '';
    const designation = item.querySelector('.speaker-designation')?.value.trim() || '';
    return { name, designation };
  }).filter(item => item.name || item.designation);
}

function getSpeakerLabels() {
  return getSpeakerEntries().map(item => item.designation ? `${item.name} — ${item.designation}` : item.name).filter(Boolean);
}

function renderSpeakerSelectOptions(selected = '') {
  const labels = getSpeakerLabels();
  const options = ['<option value="">Select Speaker (optional)</option>'];
  labels.forEach(label => {
    options.push(`<option value="${escapeHtml(label)}" ${label === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`);
  });
  if (selected && !labels.includes(selected)) {
    options.push(`<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>`);
  }
  return options.join('');
}

function buildSpeakerRow(speaker = '', removable = true) {
  return `
    <div class="speaker-row" style="display:flex;gap:8px;align-items:center">
      <select class="input-field session-speaker" style="flex:1">${renderSpeakerSelectOptions(speaker)}</select>
      ${removable ? '<button type="button" class="btn btn-ghost btn-sm remove-speaker-btn">✕</button>' : ''}
    </div>
  `;
}

function buildSpeakerBuilderItem(speaker = {}) {
  const draft = typeof speaker === 'string' ? splitSpeakerLabel(speaker) : speaker;
  return `
    <div class="speaker-builder-item" style="border:1px solid var(--border);border-radius:16px;padding:16px;background:var(--bg-card)">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button type="button" class="btn btn-ghost btn-sm remove-speaker-entry-btn">Remove</button>
      </div>
      <div class="form-row">
        <div class="input-group">
          <label class="input-label">Speaker Name *</label>
          <input class="input-field speaker-name" placeholder="Speaker name" value="${escapeHtml(draft.name || '')}" />
        </div>
        <div class="input-group">
          <label class="input-label">Designation</label>
          <input class="input-field speaker-designation" placeholder="e.g. Senior Developer Advocate" value="${escapeHtml(draft.designation || '')}" />
        </div>
      </div>
    </div>
  `;
}

function populateSpeakerBuilder(speakers = []) {
  const container = document.getElementById('speaker-builder');
  if (!container) return;
  const list = Array.isArray(speakers) && speakers.length ? speakers : [{}];
  container.innerHTML = list.map(item => buildSpeakerBuilderItem(item)).join('');
}

function refreshSessionSpeakerSelectors() {
  const selects = document.querySelectorAll('.session-speaker');
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = renderSpeakerSelectOptions(currentValue);
    select.value = currentValue;
  });
}

function collectSpeakerBuilder() {
  return getSpeakerLabels();
}

function splitSponsorLabel(value) {
  const text = String(value || '').trim();
  if (!text) return { name: '', designation: '' };
  const parts = text.split(/\s+[—-]\s+|\s*\|\s*/);
  return {
    name: parts[0] || '',
    designation: parts.slice(1).join(' — ').trim(),
  };
}

function getSponsorEntries() {
  const items = document.querySelectorAll('#sponsor-builder .sponsor-builder-item');
  return Array.from(items).map(item => {
    const name = item.querySelector('.sponsor-name')?.value.trim() || '';
    const designation = item.querySelector('.sponsor-designation')?.value.trim() || '';
    return { name, designation };
  }).filter(item => item.name || item.designation);
}

function getSponsorLabels() {
  return getSponsorEntries().map(item => item.designation ? `${item.name} — ${item.designation}` : item.name).filter(Boolean);
}

function buildSponsorBuilderItem(sponsor = {}) {
  const draft = typeof sponsor === 'string' ? splitSponsorLabel(sponsor) : sponsor;
  return `
    <div class="sponsor-builder-item" style="border:1px solid var(--border);border-radius:16px;padding:16px;background:var(--bg-card)">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button type="button" class="btn btn-ghost btn-sm remove-sponsor-entry-btn">Remove</button>
      </div>
      <div class="form-row">
        <div class="input-group">
          <label class="input-label">Sponsor Name *</label>
          <input class="input-field sponsor-name" placeholder="Sponsor name" value="${escapeHtml(draft.name || '')}" />
        </div>
        <div class="input-group">
          <label class="input-label">Designation</label>
          <input class="input-field sponsor-designation" placeholder="e.g. Platinum Sponsor" value="${escapeHtml(draft.designation || '')}" />
        </div>
      </div>
    </div>
  `;
}

function populateSponsorBuilder(sponsors = []) {
  const container = document.getElementById('sponsor-builder');
  if (!container) return;
  const list = Array.isArray(sponsors) && sponsors.length ? sponsors : [{}];
  container.innerHTML = list.map(item => buildSponsorBuilderItem(item)).join('');
}

function collectSponsorBuilder() {
  return getSponsorLabels();
}

function getCollaborationCommunitySource() {
  if (typeof DataStore?.getCommunities === 'function') {
    return DataStore.getCommunities();
  }
  return Array.isArray(DUMMY_DATA?.communities) ? DUMMY_DATA.communities.filter(item => item.isApproved && !item.removedByAdmin) : [];
}

function getCollaborationCommunityLabels() {
  return getCollaborationCommunitySource().map(item => ({
    id: item.id || '',
    name: item.name || '',
    category: item.category || '',
  })).filter(item => item.name);
}

function normalizeCollaborationDraft(value) {
  if (value && typeof value === 'object') {
    return {
      id: value.id || '',
      name: value.name || value.title || '',
      category: value.category || '',
    };
  }
  const text = String(value || '').trim();
  if (!text) return { id: '', name: '', category: '' };
  return { id: '', name: text, category: '' };
}

function buildCollaborationChip(collaboration = {}) {
  const draft = normalizeCollaborationDraft(collaboration);
  const label = draft.category ? `${draft.name} — ${draft.category}` : draft.name;
  return `
    <div class="collaboration-chip" data-collaboration-id="${escapeHtml(draft.id || '')}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:999px;background:var(--bg-card)">
      <div style="min-width:0">
        <div class="text-sm font-semibold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(draft.name || '')}</div>
        ${draft.category ? `<div class="text-muted text-xs" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(draft.category)}</div>` : ''}
      </div>
      <button type="button" class="btn btn-ghost btn-sm remove-collaboration-btn">Remove</button>
    </div>
  `;
}

function renderCollaborationOptions() {
  const list = document.getElementById('collaboration-community-options');
  if (!list) return;
  const labels = getCollaborationCommunityLabels();
  list.innerHTML = labels.map(item => {
    const label = item.category ? `${item.name} — ${item.category}` : item.name;
    return `<option value="${escapeHtml(item.name)}" data-id="${escapeHtml(item.id)}" label="${escapeHtml(label)}"></option>`;
  }).join('');
}

function populateCollaborationBuilder(collaborators = []) {
  const container = document.getElementById('collaboration-builder');
  if (!container) return;
  const list = Array.isArray(collaborators) && collaborators.length ? collaborators : [];
  container.innerHTML = list.map(item => buildCollaborationChip(item)).join('');
}

function collectCollaborationBuilder() {
  const items = document.querySelectorAll('#collaboration-builder .collaboration-chip');
  return Array.from(items).map(item => {
    const name = item.querySelector('.text-sm.font-semibold')?.textContent.trim() || '';
    const category = item.querySelector('.text-muted.text-xs')?.textContent.trim() || '';
    return category ? `${name} — ${category}` : name;
  }).filter(Boolean);
}

function addCollaborationFromInput() {
  const input = document.getElementById('collaboration-search');
  const container = document.getElementById('collaboration-builder');
  if (!input || !container) return;

  const query = input.value.trim();
  if (!query) return;

  const source = getCollaborationCommunityLabels();
  const match = source.find(item => item.name.toLowerCase() === query.toLowerCase()) ||
    source.find(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const entry = match || { name: query, category: '' };
  const existing = collectCollaborationBuilder();
  const label = entry.category ? `${entry.name} — ${entry.category}` : entry.name;
  if (existing.includes(label)) {
    input.value = '';
    return;
  }

  container.insertAdjacentHTML('beforeend', buildCollaborationChip(entry));
  input.value = '';
}

function buildSessionBuilderItem(session = {}) {
  const draft = normalizeSessionDraft(session);
  const speakerRows = draft.speakers.map((speaker, index) => buildSpeakerRow(speaker, index > 0)).join('');

  return `
    <div class="session-builder-item" style="border:1px solid var(--border);border-radius:16px;padding:16px;background:var(--bg-card)">
      <div style="display:flex;align-items:flex-end;justify-content:flex-end;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-sm remove-session-btn">Remove</button>
      </div>

      <div class="input-group mb-3">
        <label class="input-label">Speaker</label>
        <div class="session-speakers" style="display:flex;flex-direction:column;gap:8px">${speakerRows}</div>
        <button type="button" class="btn btn-ghost btn-sm add-speaker-btn" style="margin-top:10px">+ Add Another Speaker</button>
      </div>

      <div class="input-group mb-3">
        <label class="input-label">Session Name *</label>
        <input class="input-field session-title" placeholder="Session Name*" required value="${escapeHtml(draft.title)}" />
      </div>

      <div class="form-row mb-3">
        <div class="input-group">
          <label class="input-label">Date</label>
          <input type="date" class="input-field session-date" value="${escapeHtml(draft.date)}" />
        </div>
        <div class="input-group">
          <label class="input-label">Tag</label>
          <input class="input-field session-tag" placeholder="Type a tag name" value="${escapeHtml(draft.tag)}" />
        </div>
      </div>

      <div class="form-row">
        <div class="input-group">
          <label class="input-label">Start Time</label>
          <input type="time" class="input-field session-start" value="${escapeHtml(draft.startTime)}" />
        </div>
        <div class="input-group">
          <label class="input-label">End Time</label>
          <input type="time" class="input-field session-end" value="${escapeHtml(draft.endTime)}" />
        </div>
      </div>
    </div>
  `;
}

function populateSessionBuilder(sessions = []) {
  const container = document.getElementById('session-builder');
  if (!container) return;
  const list = Array.isArray(sessions) && sessions.length ? sessions : [{}];
  container.innerHTML = list.map(item => buildSessionBuilderItem(item)).join('');
}

function collectSessionBuilder() {
  const items = document.querySelectorAll('#session-builder .session-builder-item');
  return Array.from(items)
    .map(item => {
      const speakers = Array.from(item.querySelectorAll('.session-speaker'))
        .map(input => input.value.trim())
        .filter(Boolean);
      const startTime = item.querySelector('.session-start')?.value || '';
      const endTime = item.querySelector('.session-end')?.value || '';
      const title = item.querySelector('.session-title')?.value.trim() || '';
      return {
        speakers,
        title,
        date: item.querySelector('.session-date')?.value || '',
        startTime,
        endTime,
        time: [startTime, endTime].filter(Boolean).join(' - '),
        tag: item.querySelector('.session-tag')?.value.trim() || '',
      };
    })
    .filter(session => session.title || session.date || session.startTime || session.endTime || session.speakers.length || session.tag);
}

function populateEventForm(event) {
  if (!event) return;

  const setValue = (selector, value) => {
    const field = document.querySelector(selector);
    if (field) field.value = value ?? '';
  };

  setValue('#e-title', event.title || '');
  setValue('#e-category', event.category || '');
  setValue('#e-description', event.desc || event.description || '');
  setValue('#e-date', event.date || '');
  setValue('#e-time', event.time || '');
  setValue('#e-end-time', event.endTime || '');
  setValue('#e-reg-deadline', event.registrationDeadline || '');
  setValue('#e-venue', event.venue || '');
  setValue('#e-link', event.eventLink || event.link || '');
  setValue('#e-capacity', event.maxAttendees ?? '');
  setValue('#e-tags', Array.isArray(event.tags) ? event.tags.join(', ') : '');
  populateSpeakerBuilder(Array.isArray(event.speakers) ? event.speakers : []);
  populateSponsorBuilder(Array.isArray(event.sponsors) ? event.sponsors : []);
  populateCollaborationBuilder(Array.isArray(event.collaborators) ? event.collaborators : []);
  setValue('#e-organizing-team', Array.isArray(event.organizingTeam) ? event.organizingTeam.join('\n') : '');
  populateSessionBuilder(Array.isArray(event.schedule) && event.schedule.length ? event.schedule : parseAgendaBlocks(Array.isArray(event.agenda) ? event.agenda.join('\n') : ''));
  refreshSessionSpeakerSelectors();

  const communityField = document.querySelector('#e-community');
  if (communityField) communityField.value = event.communityId || '';

  const onlineCheck = document.getElementById('e-is-online');
  if (onlineCheck) onlineCheck.checked = !!event.isOnline;
  const freeCheck = document.getElementById('e-is-free');
  if (freeCheck) freeCheck.checked = event.isFree !== false;

  const priceGroup = document.getElementById('price-group');
  if (priceGroup && freeCheck) priceGroup.style.display = freeCheck.checked ? 'none' : '';
  const venueGroup = document.getElementById('venue-group');
  const linkGroup = document.getElementById('link-group');
  if (venueGroup && linkGroup && onlineCheck) {
    venueGroup.style.display = onlineCheck.checked ? 'none' : '';
    linkGroup.style.display = onlineCheck.checked ? '' : 'none';
  }

  const priceField = document.getElementById('e-price');
  if (priceField) priceField.value = event.price ?? '';
}

// ── Create Event Page ─────────────────────────
async function initCreateEventPage() {
  const user = getCurrentUser();
  if (typeof canUseOrganizerFeatures === 'function' ? !canUseOrganizerFeatures(user) : user?.role === 'member') {
    toast.warning('Restricted', 'Only organizers can create events.');
  }

  if (DataStore?.loadCommunitiesFromFirestore) {
    try {
      await DataStore.loadCommunitiesFromFirestore();
    } catch (error) {
      console.warn('Community sync failed', error);
    }
  }
  renderCollaborationOptions();

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit') || '';
  let editEvent = null;
  if (editId && DataStore?.loadEventsFromFirestore) {
    try {
      await DataStore.loadEventsFromFirestore();
      editEvent = typeof DataStore.getEvent === 'function' ? DataStore.getEvent(editId) : null;
    } catch (error) {
      console.warn('Edit event sync failed', error);
    }
  }

  // Pre-fill community if passed in URL
  const communityId = params.get('community');
  const userCommunities = typeof DataStore.getCommunitiesForUser === 'function'
    ? DataStore.getCommunitiesForUser(user?.uid || '')
    : DataStore.getCommunities();
  if (communityId) {
    const sel = document.getElementById('e-community');
    if (sel) {
      sel.innerHTML = '<option value="">Independent Event</option>';
      // Populate options
      userCommunities.forEach(c => {
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
      sel.innerHTML = '<option value="">Independent Event</option>';
      userCommunities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
  }

  const form = document.getElementById('create-event-form');
  if (!form) return;

  const speakerBuilder = document.getElementById('speaker-builder');
  const sponsorBuilder = document.getElementById('sponsor-builder');
  const collaborationBuilder = document.getElementById('collaboration-builder');
  const addSpeakerBtn = document.getElementById('add-speaker-btn');
  addSpeakerBtn?.addEventListener('click', () => {
    speakerBuilder?.insertAdjacentHTML('beforeend', buildSpeakerBuilderItem({}));
    refreshSessionSpeakerSelectors();
  });

  const addSponsorBtn = document.getElementById('add-sponsor-btn');
  addSponsorBtn?.addEventListener('click', () => {
    sponsorBuilder?.insertAdjacentHTML('beforeend', buildSponsorBuilderItem({}));
  });

  const addCollaborationBtn = document.getElementById('add-collaboration-btn');
  addCollaborationBtn?.addEventListener('click', () => {
    addCollaborationFromInput();
  });

  speakerBuilder?.addEventListener('input', () => {
    refreshSessionSpeakerSelectors();
  });

  speakerBuilder?.addEventListener('click', (event) => {
    const speakerItem = event.target.closest('.speaker-builder-item');
    if (!speakerItem) return;
    if (event.target.closest('.remove-speaker-entry-btn')) {
      speakerItem.remove();
      if (speakerBuilder && !speakerBuilder.querySelector('.speaker-builder-item')) {
        populateSpeakerBuilder([]);
      }
      refreshSessionSpeakerSelectors();
    }
  });

  sponsorBuilder?.addEventListener('click', (event) => {
    const sponsorItem = event.target.closest('.sponsor-builder-item');
    if (!sponsorItem) return;
    if (event.target.closest('.remove-sponsor-entry-btn')) {
      sponsorItem.remove();
      if (sponsorBuilder && !sponsorBuilder.querySelector('.sponsor-builder-item')) {
        populateSponsorBuilder([]);
      }
    }
  });

  collaborationBuilder?.addEventListener('click', (event) => {
    const chip = event.target.closest('.collaboration-chip');
    if (!chip) return;
    if (event.target.closest('.remove-collaboration-btn')) {
      chip.remove();
      if (collaborationBuilder && !collaborationBuilder.querySelector('.collaboration-chip')) {
        populateCollaborationBuilder([]);
      }
    }
  });

  if (speakerBuilder && !speakerBuilder.querySelector('.speaker-builder-item')) {
    populateSpeakerBuilder([]);
  }
  if (sponsorBuilder && !sponsorBuilder.querySelector('.sponsor-builder-item')) {
    populateSponsorBuilder([]);
  }
  if (collaborationBuilder && !collaborationBuilder.querySelector('.collaboration-chip')) {
    populateCollaborationBuilder([]);
  }

  const sessionBuilder = document.getElementById('session-builder');
  const addSessionBtn = document.getElementById('add-session-btn');
  addSessionBtn?.addEventListener('click', () => {
    sessionBuilder?.insertAdjacentHTML('beforeend', buildSessionBuilderItem({}));
    refreshSessionSpeakerSelectors();
  });

  sessionBuilder?.addEventListener('click', (event) => {
    const sessionItem = event.target.closest('.session-builder-item');
    if (!sessionItem) return;

    if (event.target.closest('.remove-session-btn')) {
      sessionItem.remove();
      if (sessionBuilder && !sessionBuilder.querySelector('.session-builder-item')) {
        populateSessionBuilder([]);
      }
      refreshSessionSpeakerSelectors();
      return;
    }

    if (event.target.closest('.add-speaker-btn')) {
      const speakerList = sessionItem.querySelector('.session-speakers');
      speakerList?.insertAdjacentHTML('beforeend', buildSpeakerRow('', true));
      refreshSessionSpeakerSelectors();
      return;
    }

    if (event.target.closest('.remove-speaker-btn')) {
      const speakerRow = event.target.closest('.speaker-row');
      speakerRow?.remove();
      const speakerList = sessionItem.querySelector('.session-speakers');
      if (speakerList && !speakerList.querySelector('.speaker-row')) {
        speakerList.innerHTML = buildSpeakerRow('', false);
      }
      refreshSessionSpeakerSelectors();
    }
  });

  if (sessionBuilder && !sessionBuilder.querySelector('.session-builder-item')) {
    populateSessionBuilder([]);
  }

  if (editEvent) {
    const titleEl = document.querySelector('h1');
    const descEl = document.querySelector('.text-secondary.text-sm.mb-6');
    const submitBtn = form.querySelector('[type=submit]');
    if (titleEl) titleEl.textContent = 'Edit Event ✏️';
    if (descEl) descEl.textContent = 'Update the event details below and save your changes.';
    if (submitBtn) submitBtn.querySelector('.btn-text').textContent = '💾 Save Changes';
    populateEventForm(editEvent);
  }

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

    const currentUser = getCurrentUser();
    const title = form.querySelector('#e-title').value.trim();
    const category = form.querySelector('#e-category').value.trim();
    const description = form.querySelector('#e-description').value.trim();
    const date = form.querySelector('#e-date').value;
    const time = form.querySelector('#e-time').value;
    const endTime = form.querySelector('#e-end-time').value;
    const registrationDeadline = form.querySelector('#e-reg-deadline').value;
    const isOnline = document.getElementById('e-is-online')?.checked;
    const communitySelect = document.getElementById('e-community');
    const selectedCommunityId = communitySelect?.value || '';
    const selectedCommunity = selectedCommunityId ? DataStore.getCommunity(selectedCommunityId) : null;
    const venue = isOnline ? (form.querySelector('#e-link').value.trim() || 'Online Event') : form.querySelector('#e-venue').value.trim();
    const isFree = document.getElementById('e-is-free')?.checked !== false;
    const capacity = Number(form.querySelector('#e-capacity').value || 0);
    const price = isFree ? 0 : Number(form.querySelector('#e-price').value || 0);
    const tags = (form.querySelector('#e-tags').value || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const sessions = collectSessionBuilder();
    const speakers = collectSpeakerBuilder();
    const sponsors = collectSponsorBuilder();
    const collaborators = collectCollaborationBuilder();
    const organizingTeam = splitListField(form.querySelector('#e-organizing-team')?.value);
    const { emoji, banner } = getEventDraftDefaults(category);
    const payload = {
      title,
      desc: description,
      description,
      category,
      date,
      time,
      endTime: endTime || '',
      registrationDeadline: registrationDeadline || '',
      venue,
      isOnline: !!isOnline,
      isFree,
      price,
      organizer: selectedCommunity?.name || currentUser?.name || currentUser?.email || 'NEXOVERSE',
      organizerName: selectedCommunity?.name || currentUser?.name || currentUser?.email || 'NEXOVERSE',
      organizerId: currentUser?.uid || '',
      communityId: selectedCommunityId || '',
      attendees: editId && editEvent ? Number(editEvent.attendees || 0) : 0,
      maxAttendees: capacity,
      tags,
      agenda: sessions.map(item => [item.time, item.title].filter(Boolean).join(' ')).filter(Boolean),
      speakers,
      sponsors,
      collaborators,
      organizingTeam,
      emoji,
      banner,
      schedule: sessions,
      isApproved: true,
      status: 'upcoming',
      removedByAdmin: false,
    };

    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.classList.add('loading');

    try {
      if (db && editId) {
        await db.collection('events').doc(editId).update({
          ...payload,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (DataStore?.saveCreatedEventLocal) {
          DataStore.saveCreatedEventLocal({ id: editId, ...payload, updatedAt: new Date().toISOString() });
        }
        if (DataStore?.loadEventsFromFirestore) {
          await DataStore.loadEventsFromFirestore(true);
        }
        toast.success('Event Updated! ✨', 'Your changes were saved to Firestore.');
      } else if (db) {
        const docRef = await db.collection('events').add({
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (DataStore?.saveCreatedEventLocal) {
          DataStore.saveCreatedEventLocal({ id: docRef.id, ...payload, createdAt: new Date().toISOString() });
        }
        if (DataStore?.loadEventsFromFirestore) {
          await DataStore.loadEventsFromFirestore(true);
        }
        toast.success('Event Created! 🎉', 'Your event was saved to Firestore and is now available in Events.');
      } else {
        const localId = `local-${Date.now()}`;
        DUMMY_DATA.events.unshift({
          id: localId,
          ...payload,
          createdAt: new Date().toISOString(),
        });
        toast.success('Event Created locally', 'Firestore is unavailable, so the event was saved in local data.');
      }
      setTimeout(() => window.location.href = 'events.html', 900);
    } catch (error) {
      toast.error('Submission Failed', error?.message || 'Unable to create event.');
    } finally {
      submitBtn.classList.remove('loading');
    }
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
