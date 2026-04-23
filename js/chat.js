/* ====== CHAT JS ====== */
let currentUser = null;
let activeThread = null;
let pendingAttachment = null;

async function initChat() {
  currentUser = await DB.requireAuth();
  if (!currentUser) return;

  setupNav();
  // ... Rest of chat init logic would go here
  renderThreads();
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

function renderThreads() {
  const threads = document.getElementById('chat-threads');
  if(threads) threads.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">No conversations yet.</div>';
}

// Start
initChat();
