/* ====== CHAT JS ====== */
const currentUser = DB.requireAuth();
if (!currentUser) throw new Error('Not authenticated');

let activeThread = null;
let pendingAttachment = null;

// Setup nav avatar
const navAv = document.getElementById('nav-avatar');
if(navAv){ navAv.textContent = avatarInitials(currentUser.displayName); navAv.style.background = avatarColor(currentUser.username); }

function getThreadId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function getMessages(threadId) {
  const all = DB.messages();
  const cutoff = Date.now() - 86400000;
  return (all[threadId] || []).filter(m => new Date(m.createdAt).getTime() > cutoff);
}

function saveMessage(threadId, msg) {
  const all = DB.messages();
  if(!all[threadId]) all[threadId] = [];
  all[threadId].push(msg);
  DB.saveMessages(all);
}

function renderThreads(filter='') {
  const all = DB.messages();
  const users = DB.users();
  const el = document.getElementById('chat-threads');
  // Collect all threads involving current user
  const threads = Object.keys(all).filter(tid => tid.includes(currentUser.id));
  if(!threads.length) {
    el.innerHTML = '<div class="no-threads"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No messages yet</p></div>';
    return;
  }
  el.innerHTML = '';
  // Also add demo threads
  const demoThreads = [
    { uid: 'demo2', preview: 'Did you try TensorRT as well?', unread: true },
    { uid: 'demo1', preview: 'Congrats on the launch! 🎉', unread: false },
  ];
  demoThreads.forEach(dt => {
    const u = users[dt.uid];
    if(!u) return;
    if(filter && !u.displayName.toLowerCase().includes(filter) && !u.username.toLowerCase().includes(filter)) return;
    const tid = getThreadId(currentUser.id, dt.uid);
    el.insertAdjacentHTML('beforeend', `
      <div class="chat-thread ${activeThread===tid?'active':''}" onclick="openThread('${tid}','${dt.uid}')">
        <div class="thread-avatar" style="background:${avatarColor(u.username)}">${avatarInitials(u.displayName)}</div>
        <div class="thread-info">
          <div class="thread-name"><span>${escHtml(u.displayName)}</span><span class="thread-time">2m ago</span></div>
          <div class="thread-preview ${dt.unread?'unread':''}">${dt.preview}</div>
        </div>
        ${dt.unread?'<div class="unread-dot"></div>':''}
      </div>`);
  });
  threads.forEach(tid => {
    const msgs = all[tid].filter(m=>new Date(m.createdAt).getTime()>Date.now()-86400000);
    if(!msgs.length) return;
    const otherId = tid.replace(currentUser.id,'').replace('_','');
    const u = users[otherId];
    if(!u) return;
    if(filter && !u.displayName.toLowerCase().includes(filter) && !u.username.toLowerCase().includes(filter)) return;
    const last = msgs[msgs.length-1];
    el.insertAdjacentHTML('beforeend', `
      <div class="chat-thread ${activeThread===tid?'active':''}" onclick="openThread('${tid}','${otherId}')">
        <div class="thread-avatar" style="background:${avatarColor(u.username)}">${avatarInitials(u.displayName)}</div>
        <div class="thread-info">
          <div class="thread-name"><span>${escHtml(u.displayName)}</span><span class="thread-time">${timeAgo(last.createdAt)}</span></div>
          <div class="thread-preview">${escHtml(last.text||'📎 file')}</div>
        </div>
      </div>`);
  });
}

function openThread(tid, otherUserId) {
  activeThread = tid;
  const users = DB.users();
  const other = users[otherUserId];
  if(!other) return;
  document.getElementById('chat-empty').style.display = 'none';
  document.getElementById('chat-view').style.display = 'flex';
  // Header
  document.getElementById('chat-view-header').innerHTML = `
    <div class="thread-avatar" style="background:${avatarColor(other.username)}">${avatarInitials(other.displayName)}</div>
    <div class="chat-header-info">
      <strong>${escHtml(other.displayName)}</strong>
      <span>@${other.username} · Messages vanish after 24h</span>
    </div>`;
  renderMessages(tid);
  renderThreads();
  document.getElementById('chat-msg-input').focus();
  document.getElementById('chat-send-btn').onclick = () => sendMessage(tid, otherUserId);
  const input = document.getElementById('chat-msg-input');
  input.onkeydown = e => { if(e.key==='Enter') sendMessage(tid, otherUserId); };
  input.oninput = () => {
    if(input.value.trim().length > 0) {
      localStorage.setItem('tc_typing_' + tid + '_' + currentUser.id, Date.now().toString());
    } else {
      localStorage.removeItem('tc_typing_' + tid + '_' + currentUser.id);
    }
  };
}

function renderMessages(tid) {
  const area = document.getElementById('messages-area');
  const msgs = getMessages(tid);
  area.innerHTML = '<div class="expiry-note">⏱ Messages disappear after 24 hours</div>';
  if(!msgs.length){
    area.insertAdjacentHTML('beforeend','<div style="text-align:center;color:var(--muted);padding:20px;font-size:.85rem">Start the conversation!</div>');
    return;
  }
  msgs.forEach(m => {
    const mine = m.senderId === currentUser.id;
    let contentHtml = '';
    if(m.type === 'image') contentHtml = `<img src="${m.data}" class="msg-img" alt="image" />`;
    else if(m.type === 'audio') contentHtml = `<audio controls class="msg-audio"><source src="${m.data}" /></audio>`;
    else if(m.type === 'file') contentHtml = `<div class="msg-file"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${escHtml(m.name||'File')}</div>`;
    else if(m.text) contentHtml = escHtml(m.text);
    area.insertAdjacentHTML('beforeend', `
      <div class="msg-row ${mine?'mine':'theirs'}">
        ${!mine?`<div class="msg-avatar" style="background:${avatarColor(m.senderUsername)}">${avatarInitials(m.senderName)}</div>`:''}
        <div>
          <div class="msg-bubble">${contentHtml}</div>
          <div class="msg-meta">${timeAgo(m.createdAt)}</div>
        </div>
      </div>`);
  });
  
  // Add typing indicator container
  const otherId = tid.replace(currentUser.id,'').replace('_','');
  const other = DB.users()[otherId];
  if(other) {
    area.insertAdjacentHTML('beforeend', `
      <div class="typing-row theirs" id="typing-indicator-row">
        <div class="msg-avatar" style="background:${avatarColor(other.username)}">${avatarInitials(other.displayName)}</div>
        <div class="typing-indicator">
          <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
      </div>
    `);
  }
  
  area.scrollTop = area.scrollHeight;
  checkTypingStatus();
}

function sendMessage(tid, otherUserId) {
  const input = document.getElementById('chat-msg-input');
  const text = input.value.trim();
  if(!text && !pendingAttachment) return;
  let msg = { id:'m_'+Date.now(), senderId:currentUser.id, senderName:currentUser.displayName, senderUsername:currentUser.username, createdAt:new Date().toISOString() };
  if(pendingAttachment) { Object.assign(msg, pendingAttachment); pendingAttachment=null; document.getElementById('chat-attachment-preview').innerHTML=''; }
  else { msg.type='text'; msg.text=text; }
  saveMessage(tid, msg);
  addNotification(otherUserId, `New message from @${currentUser.username}`, 'chat.html');
  input.value = '';
  localStorage.removeItem('tc_typing_' + tid + '_' + currentUser.id);
  renderMessages(tid);
  renderThreads();
}

function attachFile(evt) {
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let type = 'file';
    if(file.type.startsWith('image/')) type='image';
    else if(file.type.startsWith('audio/')) type='audio';
    else if(file.type.startsWith('video/')) type='file';
    pendingAttachment = { type, name:file.name, data:e.target.result };
    document.getElementById('chat-attachment-preview').innerHTML = `<div class="attach-chip">📎 ${escHtml(file.name)} <button onclick="clearAttach()">×</button></div>`;
  };
  reader.readAsDataURL(file);
}

function clearAttach() { pendingAttachment=null; document.getElementById('chat-attachment-preview').innerHTML=''; }

// New chat modal
document.getElementById('new-chat-btn').addEventListener('click', () => { document.getElementById('new-chat-modal').style.display='flex'; document.getElementById('new-chat-username').value=''; document.getElementById('new-chat-error').textContent=''; });
function closeNewChat() { document.getElementById('new-chat-modal').style.display='none'; }
document.getElementById('new-chat-modal').addEventListener('click', e => { if(e.target===document.getElementById('new-chat-modal')) closeNewChat(); });

function startNewChat() {
  const val = document.getElementById('new-chat-username').value.trim().replace('@','');
  if(!val){ document.getElementById('new-chat-error').textContent='Enter a username'; return; }
  const users = DB.users();
  const found = Object.values(users).find(u=>u.username===val);
  if(!found){ document.getElementById('new-chat-error').textContent='User not found'; return; }
  if(found.id===currentUser.id){ document.getElementById('new-chat-error').textContent="You can't message yourself"; return; }
  closeNewChat();
  const tid = getThreadId(currentUser.id, found.id);
  openThread(tid, found.id);
}

function escHtml(str){ if(!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Search threads
document.getElementById('chat-search').addEventListener('input', function(){ renderThreads(this.value.toLowerCase()); });

function checkTypingStatus() {
  if (!activeThread) return;
  const otherId = activeThread.replace(currentUser.id,'').replace('_','');
  const typingKey = 'tc_typing_' + activeThread + '_' + otherId;
  const typingTime = localStorage.getItem(typingKey);
  const row = document.getElementById('typing-indicator-row');
  if (row) {
    if (typingTime && Date.now() - parseInt(typingTime) < 3000) {
      if(!row.classList.contains('active')) {
        row.classList.add('active');
        const area = document.getElementById('messages-area');
        area.scrollTop = area.scrollHeight;
      }
    } else {
      row.classList.remove('active');
    }
  }
}

// Check for typing status periodically
setInterval(checkTypingStatus, 1000);

// Live update from other tabs (P2P simulation)
window.addEventListener('storage', (e) => {
  if (e.key === 'tc_messages') {
    renderThreads();
    if (activeThread) {
      // Remember scroll position to see if we should auto-scroll
      const area = document.getElementById('messages-area');
      const isAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 50;
      renderMessages(activeThread);
      if (isAtBottom) area.scrollTop = area.scrollHeight;
    }
  } else if (e.key && e.key.startsWith('tc_typing_')) {
    checkTypingStatus();
  }
});

// Check if URL has ?u= param to open thread directly
const qp = new URLSearchParams(window.location.search);
const chatWith = qp.get('u');
if(chatWith){
  const users = DB.users();
  const found = Object.values(users).find(u=>u.username===chatWith);
  if(found){ const tid=getThreadId(currentUser.id,found.id); openThread(tid,found.id); }
}

renderThreads();
