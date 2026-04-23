/* ====== INBOX JS ====== */
const currentUser = DB.requireAuth();
if (!currentUser) throw new Error('Not authenticated');

const navAv = document.getElementById('nav-avatar');
if(navAv){ navAv.textContent = avatarInitials(currentUser.displayName); navAv.style.background = avatarColor(currentUser.username); }

function escHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderNotifications() {
  const notifs = DB.notifications().filter(n=>n.toUserId===currentUser.id);
  const list = document.getElementById('notif-list');
  const count = document.getElementById('notif-tab-count');
  const unread = notifs.filter(n=>!n.read).length;
  if(count){ if(unread>0){ count.textContent=unread; count.style.display='flex'; } else count.style.display='none'; }
  if(!notifs.length){
    list.innerHTML = `<div class="inbox-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><p>No notifications yet</p></div>`;
    return;
  }
  list.innerHTML = notifs.slice(0,30).map(n=>`
    <div class="inbox-item ${n.read?'':'unread'}" onclick="markRead('${n.id}')">
      <div class="inbox-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
      <div class="inbox-content">
        <div class="inbox-preview">${escHtml(n.msg)}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:2px">${timeAgo(n.createdAt)}</div>
      </div>
      ${!n.read?'<div class="unread-dot"></div>':''}
    </div>`).join('');
}

function markRead(id) {
  const notifs = DB.notifications().map(n=>n.id===id?{...n,read:true}:n);
  DB.saveNotifs(notifs);
  renderNotifications();
}

document.getElementById('mark-all-btn').addEventListener('click',()=>{
  const notifs = DB.notifications().map(n=>n.toUserId===currentUser.id?{...n,read:true}:n);
  DB.saveNotifs(notifs); renderNotifications();
});

// Tab switching
document.querySelectorAll('.inbox-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.inbox-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.inbox-panel').forEach(p=>p.style.display='none');
    document.getElementById('panel-'+tab.dataset.tab).style.display='flex';
  });
});

renderNotifications();
