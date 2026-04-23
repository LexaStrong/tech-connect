/* ====== INBOX JS ====== */
let currentUser = null;

async function initInbox() {
  currentUser = await DB.requireAuth();
  if (!currentUser) return;

  setupNav();
  renderNotifications();
}

function setupNav() {
  const navAv = document.getElementById('nav-avatar');
  if(navAv){ 
    const currentAv = currentUser.avatar_url || currentUser.avatar;
    if (currentAv) {
      navAv.innerHTML = `<img src="${currentAv}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      navAv.style.background = 'none';
    } else {
      navAv.textContent = avatarInitials(currentUser.display_name || currentUser.displayName);
      navAv.style.background = avatarColor(currentUser.username); 
    }
  }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if(list) list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">No notifications yet.</div>';
}

// Start
initInbox();
