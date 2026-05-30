// =============================================
// NEXOVERSE — Global UI Utilities
// =============================================

// ── Page Loader ──────────────────────────────
function showPageLoader() {
  let loader = document.getElementById('page-loader');
  if (!loader) {
    const logoPath = window.location.pathname.includes('/pages/')
      ? '../assets/logos/logo-placeholder.svg'
      : 'assets/logos/logo-placeholder.svg';
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = `
      <div class="loader-logo">
        <img class="loader-logo-image" src="${logoPath}" alt="NEXOVERSE logo placeholder" />
        <div class="loader-logo-copy">
          <div class="loader-logo-name">NEXOVERSE</div>
          <div class="loader-logo-subtitle">The Student Ecosystem Platform</div>
        </div>
      </div>
      <div class="loader-spinner"></div>
      <div class="loader-bar"><div class="loader-bar-fill"></div></div>
    `;
    document.body.prepend(loader);
  }
  loader.classList.remove('hidden');
}

function hidePageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 400);
    }, 300);
  }
}

// Auto-hide on load
window.addEventListener('load', () => hidePageLoader());

// ── Global Toast System ───────────────────────
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }
}

/**
 * showToast — global reusable toast notification
 * @param {string} title
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  ms (default 4000)
 */
function showToast(title, message = '', type = 'info', duration = 4000) {
  initToastContainer();
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;

  document.getElementById('toast-container').appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return toast;
}

// Shorthand helpers
const toast = {
  success: (title, msg, dur) => showToast(title, msg, 'success', dur),
  error:   (title, msg, dur) => showToast(title, msg, 'error',   dur),
  warning: (title, msg, dur) => showToast(title, msg, 'warning', dur),
  info:    (title, msg, dur) => showToast(title, msg, 'info',    dur),
};

// ── Modal System ──────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
}
// Close on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ── Report Modal helpers (global so pages can open a report dialog) ──
let _pendingReportContext = null;
function openReportModal(type, itemId, title) {
  console.log('openReportModal called', { type, itemId, title });
  _pendingReportContext = { type, itemId, title };
  const modal = document.getElementById('report-modal');
  const titleEl = document.getElementById('report-modal-title');
  const reasonEl = document.getElementById('report-modal-reason');
  if (titleEl) titleEl.textContent = `Report ${title || type}`;
  if (reasonEl) reasonEl.value = '';
  if (modal) {
    modal.style.display = 'flex';
    if (reasonEl) setTimeout(() => reasonEl.focus(), 50);
  } else {
    toast.info('Opening report', 'Report modal not found on this page.');
    console.warn('report-modal element missing');
  }
}

function closeReportModal() {
  _pendingReportContext = null;
  const modal = document.getElementById('report-modal');
  if (modal) modal.style.display = 'none';
}

async function submitReportModal() {
  if (!_pendingReportContext) return;
  const reasonEl = document.getElementById('report-modal-reason');
  const reason = reasonEl?.value.trim() || '';
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) { toast.error('Login required', 'Please sign in to report content.'); return; }
  // If Firestore is unavailable, persist locally to localStorage so testing can continue.
  const _db = (typeof window !== 'undefined' && window.db) ? window.db : (typeof db !== 'undefined' ? db : null);
  if (!_db) {
    try {
      const pending = JSON.parse(localStorage.getItem('nexora_pending_reports') || '[]');
      const localReportId = 'local-' + Date.now();
      const item = {
        id: localReportId,
        reportId: localReportId,
        type: _pendingReportContext.type,
        itemId: _pendingReportContext.itemId,
        title: _pendingReportContext.title || null,
        reporterId: user.uid,
        reporterName: user.name || user.email || 'User',
        reason,
        status: 'local_pending',
        createdAt: new Date().toISOString(),
      };
      pending.unshift(item);
      localStorage.setItem('nexora_pending_reports', JSON.stringify(pending));
      console.log('Saved report to localStorage (pending sync)', item);
      toast.success('Saved locally', 'Report saved locally and will be synced when Firestore is available.');
      closeReportModal();
      return;
    } catch (err) {
      toast.error('Save failed', 'Unable to save report locally.');
      return;
    }
  }

  try {
    const reportRef = _db.collection('reports').doc();
    await reportRef.set({
      reportId: reportRef.id,
      type: _pendingReportContext.type,
      itemId: _pendingReportContext.itemId,
      title: _pendingReportContext.title || null,
      reporterId: user.uid,
      reporterName: user.name || user.email || 'User',
      reason,
      status: 'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    toast.success('Report submitted', 'Thanks — the moderation team will review this.');
    closeReportModal();
    if (typeof window.startReportsListener === 'function') window.startReportsListener();
  } catch (error) {
    toast.error('Submission failed', error?.message || 'Unable to submit report.');
  }
}

window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReportModal = submitReportModal;

// Sync any locally-saved reports once Firestore becomes available
async function syncPendingReports() {
  try {
    const pendingRaw = localStorage.getItem('nexora_pending_reports');
    if (!pendingRaw) return;
    const pending = JSON.parse(pendingRaw || '[]');
    if (!pending.length) return;
    const _db = (typeof window !== 'undefined' && window.db) ? window.db : (typeof db !== 'undefined' ? db : null);
    if (!_db) return;
    for (const r of pending.slice().reverse()) {
      try {
        const reportRef = _db.collection('reports').doc();
        await reportRef.set({
          reportId: r.reportId || reportRef.id,
          type: r.type,
          itemId: r.itemId,
          title: r.title || null,
          reporterId: r.reporterId,
          reporterName: r.reporterName,
          reason: r.reason,
          status: 'open',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Synced pending report to Firestore', r.id);
      } catch (err) {
        console.warn('Failed to sync pending report', r.id, err);
      }
    }
    localStorage.removeItem('nexora_pending_reports');
    toast.success('Local reports synced', 'Pending reports were uploaded to Firestore.');
    if (typeof window.startReportsListener === 'function') window.startReportsListener();
  } catch (error) {
    console.error('syncPendingReports failed', error);
  }
}

// Periodically check for Firestore and sync pending reports (tries for 30s)
{ (function trySync() {
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (window.db) {
        clearInterval(iv);
        syncPendingReports();
      } else if (attempts > 10) {
        clearInterval(iv);
      }
    }, 3000);
  })(); }

// Expose sync helper for manual triggering from console
window.syncPendingReports = syncPendingReports;

// If Firestore is already available now, attempt an immediate sync
if (window.db) setTimeout(() => syncPendingReports(), 800);

// ── Skeleton Cards ────────────────────────────
function createSkeletonCards(container, count = 6, height = 280) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'skeleton';
    div.style.height = height + 'px';
    div.style.borderRadius = '16px';
    container.appendChild(div);
  }
}

function createSkeletonRows(container, count = 4) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05)';
    row.innerHTML = `
      <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px">
        <div class="skeleton" style="height:14px;width:60%"></div>
        <div class="skeleton" style="height:12px;width:40%"></div>
      </div>
    `;
    container.appendChild(row);
  }
}

// ── Tabs ──────────────────────────────────────
function initTabs(containerSelector) {
  const containers = document.querySelectorAll(containerSelector || '[data-tabs]');
  containers.forEach(container => {
    const buttons  = container.querySelectorAll('.tab-btn');
    const contents = container.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const content = container.querySelector(`.tab-content[data-tab="${target}"]`);
        if (content) content.classList.add('active');
      });
    });
  });
}

// ── Toggle Switch ─────────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('on'));
  });
}

// ── Profile Dropdown ──────────────────────────
function initProfileDropdown() {
  const wrap = document.querySelector('.profile-dropdown-wrap');
  if (!wrap) return;
  const trigger = wrap.querySelector('.profile-trigger');
  if (trigger) {
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
  }
  document.addEventListener('click', () => wrap.classList.remove('open'));
}

// ── Mobile Sidebar ────────────────────────────
function initMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const hamburger= document.getElementById('hamburger-btn');
  const overlay  = document.getElementById('sidebar-overlay');
  if (!sidebar || !hamburger) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay?.classList.toggle('active');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// ── Search Filter ─────────────────────────────
function initSearch(inputId, itemsSelector, matchFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll(itemsSelector).forEach(el => {
      const match = matchFn ? matchFn(el, q) : el.textContent.toLowerCase().includes(q);
      el.style.display = match || !q ? '' : 'none';
    });
  });
}

// ── Filter Chips ─────────────────────────────
function initFilterChips(containerSelector, itemsSelector, dataAttr = 'category') {
  const chips = document.querySelectorAll(containerSelector + ' .filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      document.querySelectorAll(itemsSelector).forEach(el => {
        el.style.display = (!filter || filter === 'all' || el.dataset[dataAttr] === filter) ? '' : 'none';
      });
    });
  });
}

// ── Copy to clipboard ─────────────────────────
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copied!', 'Text copied to clipboard');
  }).catch(() => {
    toast.error('Copy failed', 'Please copy manually');
  });
}

// ── Format date ───────────────────────────────
function toSafeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const d = toSafeDate(value);
  if (!d) return 'Recently';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(value) {
  const d = toSafeDate(value);
  if (!d) return 'Recently';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(value) {
  const d = toSafeDate(value);
  if (!d) return 'just now';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440)return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}

// ── Animate counter ───────────────────────────
function animateCounter(el, target, duration = 1200) {
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    el.textContent = Math.floor(progress * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  showPageLoader();
  initToastContainer();
  initProfileDropdown();
  initMobileSidebar();
  initToggles();
  initTabs();

  // ── Mobile Navigation ──
  const hamburger = document.getElementById('mobile-nav-hamburger');
  const overlay = document.getElementById('mobile-nav-overlay');
  const drawer = document.getElementById('mobile-nav-drawer');
  const closeBtn = document.getElementById('mobile-nav-close');
  const navLinks = drawer ? drawer.querySelectorAll('.mobile-nav-link') : [];
  let lastScrollY = 0;

  function openMobileNav() {
    drawer.classList.add('active');
    overlay.classList.add('active');
    lastScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${lastScrollY}px`;
  }
  function closeMobileNav() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, lastScrollY);
  }
  if (hamburger && overlay && drawer && closeBtn) {
    hamburger.addEventListener('click', openMobileNav);
    closeBtn.addEventListener('click', closeMobileNav);
    overlay.addEventListener('click', closeMobileNav);
    navLinks.forEach(link => link.addEventListener('click', closeMobileNav));
    document.addEventListener('keydown', e => {
      if (drawer.classList.contains('active') && e.key === 'Escape') closeMobileNav();
    });
  }

  // Accessible click/keyboard navigation for homepage community cards
  document.querySelectorAll('[data-href]').forEach(card => {
    const href = card.getAttribute('data-href');
    if (!href) return;
    card.addEventListener('click', () => {
      window.location = href;
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location = href;
      }
    });
  });
});
