// Community admin requests page script
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  populateUserInfo();
  const user = getCurrentUser();
  const container = document.getElementById('requests-list');
  if (!container) return;

  // find communities where user is organizer
  const myCommunities = typeof DataStore?.getCommunitiesForUser === 'function' ? DataStore.getCommunitiesForUser(user.uid || '') : [];
  // Only show requests for communities where the current user is the actual organizer/owner
  const ownerCommunities = myCommunities.filter(c => (c.organizerId === user.uid) || (c.organizer_uid === user.uid) || (c.ownerId === user.uid) || (c.createdBy === user.uid));
  if (!myCommunities.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-title">No communities found</div><div class="empty-desc">You don\'t appear to be an organizer of any community.</div></div>';
    return;
  }

  container.innerHTML = '<div class="text-secondary">Loading requests…</div>';
  let html = '';
  for (const c of ownerCommunities) {
    const requests = await (typeof DataStore?.getCommunityCollabRequests === 'function' ? DataStore.getCommunityCollabRequests(c.id) : []);
    const pendingRequests = (requests || []).filter(r => (r.status || 'pending') === 'pending');
    if (!pendingRequests.length) continue;
    html += `<div class="card mb-4"><div class="section-title">Requests for ${escapeHtml(c.name)}</div>`;
    html += '<div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">';
    pendingRequests.forEach(r => {
      const title = (r.payload && r.payload.eventDraft && r.payload.eventDraft.title) ? r.payload.eventDraft.title : (r.payload && r.payload.eventId) ? `Event: ${r.payload.eventId}` : 'Event draft';
      const from = r.payload && r.payload.fromUserId ? r.payload.fromUserId : 'Unknown';
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card)">`;
      html += `<div style="min-width:0"><div style="font-weight:600">${escapeHtml(title)}</div><div class="text-muted">From: ${escapeHtml(from)} • ${new Date((r.createdAt && r.createdAt.seconds) ? r.createdAt.seconds*1000 : (r.createdAt || Date.now())).toLocaleString()}</div></div>`;
      html += `<div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm accept-req" data-id="${r.id}" data-community="${c.id}">Accept</button><button class="btn btn-ghost btn-sm reject-req" data-id="${r.id}" data-community="${c.id}">Reject</button></div>`;
      html += `</div>`;
    });
    html += '</div></div>';
  }
  container.innerHTML = html || '<div class="empty-state"><div class="empty-title">No requests</div><div class="empty-desc">No collaboration requests at the moment.</div></div>';

  container.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button.accept-req, button.reject-req');
    if (!btn) return;
    const id = btn.dataset.id;
    const communityId = btn.dataset.community;
    const action = btn.classList.contains('accept-req') ? 'accept' : 'reject';
    btn.disabled = true; btn.textContent = action === 'accept' ? 'Accepting…' : 'Rejecting…';
    try {
      await DataStore.handleCollabRequest(id, action, user.uid || '');
      if (action === 'accept') {
        toast.success('Accepted', 'Collaboration request accepted.');
      } else {
        toast.info('Rejected', 'Collaboration request rejected.');
      }
      // refresh page
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      btn.disabled = false;
      if (typeof toast === 'object' && typeof toast.error === 'function') toast.error('Failed', err?.message || 'Unable to process request');
    }
  });
  
  // Load "My Sent Requests"
  const myListEl = document.getElementById('my-requests-list');
  myListEl.innerHTML = '<div class="text-secondary">Loading your sent requests…</div>';
  try {
    let sent = [];
    if (typeof DataStore?.getCommunityCollabRequests === 'function' && db && typeof db.collection === 'function') {
      // query Firestore directly for requests where payload.fromUserId == user.uid
      const snapshot = await db.collection('collabRequests').where('payload.fromUserId', '==', user.uid).get();
      sent = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
      } else if (typeof DataStore?.getSentCollabRequests === 'function') {
        sent = await DataStore.getSentCollabRequests(user.uid);
    }

    if (!sent || !sent.length) {
      myListEl.innerHTML = '<div class="empty-state"><div class="empty-title">No sent requests</div><div class="empty-desc">You have not sent any collaboration requests.</div></div>';
    } else {
      myListEl.innerHTML = sent.map(r => {
        const title = (r.payload && r.payload.eventDraft && r.payload.eventDraft.title) ? r.payload.eventDraft.title : (r.payload && r.payload.eventId) ? `Event: ${r.payload.eventId}` : 'Event draft';
        const to = r.toCommunityId || (r.payload && r.payload.toCommunityId) || '';
        return `<div style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg-card)">` +
          `<div style="font-weight:600">${escapeHtml(title)}</div>` +
          `<div class="text-muted text-xs">To: ${escapeHtml(to)} • Status: ${escapeHtml(r.status || 'pending')}</div>` +
          `</div>`;
      }).join('');
    }
  } catch (err) {
    myListEl.innerHTML = '<div class="empty-state"><div class="empty-title">Failed to load</div><div class="empty-desc">Unable to fetch your sent requests.</div></div>';
    console.warn('Failed to load my sent requests', err);
  }
});
