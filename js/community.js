/* ====== COMMUNITY JS ====== */
let currentUser = DB.requireAuth();
if (!currentUser) throw new Error('Not authenticated');

let activeCommunity = 'All';
let activeSort = 'new';
let currentPostId = null;
let uploadedFiles = [];

// Setup nav UI
function setupNav() {
  const av = document.getElementById('nav-avatar');
  const cr = document.getElementById('create-avatar');
  const ca = document.getElementById('comment-avatar');
  const initials = avatarInitials(currentUser.display_name || currentUser.displayName);
  [av, cr, ca].forEach(el => { if(el){ el.textContent = initials; el.style.background = avatarColor(currentUser.username); } });
  const info = document.getElementById('dropdown-user-info');
  if(info) info.innerHTML = `<div class="uname">@${currentUser.username}</div><div class="email">${currentUser.display_name || currentUser.displayName}</div>`;
  document.getElementById('logout-btn').addEventListener('click', async () => { await supabase.auth.signOut(); DB.del('current_user'); window.location.href = '../index.html'; });
  
  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');
  if(themeToggle){
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    const currentTheme = localStorage.getItem('theme') || 'light';
    if(currentTheme === 'dark'){ document.body.classList.add('dark-theme'); sun.style.display='block'; moon.style.display='none'; }
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      sun.style.display = isDark ? 'block' : 'none';
      moon.style.display = isDark ? 'none' : 'block';
    });
  }
}

// Render posts
async function renderFeed() {
  const feed = document.getElementById('feed');
  const loading = document.getElementById('feed-loading');
  if(loading) loading.style.display = 'flex';
  
  const posts = await DB.getPosts(activeCommunity, activeSort);
  if(loading) loading.style.display = 'none';
  
  const existing = feed.querySelectorAll('.post-card');
  existing.forEach(e => e.remove());
  
  if(posts.length === 0){
    const emptyMsg = feed.querySelector('.empty-msg');
    if(!emptyMsg) feed.insertAdjacentHTML('beforeend','<div class="empty-msg" style="text-align:center;padding:60px 20px;color:var(--muted)"><div style="font-size:3rem;margin-bottom:16px">📭</div><p>No posts yet. Be the first to share something!</p></div>');
    return;
  }
  
  posts.forEach(post => {
    const net = (post.upvotes || 0) - (post.downvotes || 0);
    const exp = timeLeft(post.expires_at);
    const soon = new Date(post.expires_at) - Date.now() < 3600000;
    const userVote = (DB.get('votes_' + currentUser.id) || {})[post.id];
    
    feed.insertAdjacentHTML('beforeend', `
      <div class="post-card" id="pcard_${post.id}" onclick="openPost('${post.id}')">
        <div class="vote-col" onclick="event.stopPropagation()">
          <button class="vote-btn up ${userVote==='up'?'active':''}" onclick="vote('${post.id}','up',this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <span class="vote-count" id="vc_${post.id}">${net}</span>
          <button class="vote-btn down ${userVote==='down'?'active':''}" onclick="vote('${post.id}','down',this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <span class="post-community-tag">${post.community}</span>
            <span class="post-meta-info">Posted by <a href="profile.html?u=${post.authorUsername}" onclick="event.stopPropagation()">@${post.authorUsername}</a> · ${timeAgo(post.created_at)}</span>
          </div>
          <h3 class="post-title">${escHtml(post.title)}</h3>
          ${post.body ? `<p class="post-excerpt">${escHtml(post.body)}</p>` : ''}
          ${post.tags?.length ? `<div class="post-tags">${post.tags.map(t=>`<span class="post-tag">#${t}</span>`).join('')}</div>` : ''}
          <div class="post-actions">
            <button class="post-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              View Discussion
            </button>
            <button class="post-action-btn" onclick="event.stopPropagation();sharePost('${post.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            <span class="expiry-badge ${soon?'soon':''}">⏱ ${exp}</span>
          </div>
        </div>
      </div>`);
  });
}

function escHtml(str){ return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

async function vote(postId, dir, btn) {
  // Logic remains similar but updates Supabase
  const votesKey = 'votes_' + currentUser.id;
  const votes = DB.get(votesKey) || {};
  const prev = votes[postId];
  
  if(prev === dir) delete votes[postId];
  else votes[postId] = dir;
  
  DB.set(votesKey, votes);
  
  // Real update in Supabase (simplified increment for demo)
  const field = dir === 'up' ? 'upvotes' : 'downvotes';
  await supabase.rpc('increment_vote', { post_id: postId, field_name: field });
  
  renderFeed();
}

// Create post modal
function openCreatePost(type) {
  document.getElementById('create-modal').style.display = 'flex';
  if(type === 'image') document.getElementById('file-input').click();
}
function closeCreatePost() { document.getElementById('create-modal').style.display = 'none'; uploadedFiles = []; document.getElementById('file-previews').innerHTML = ''; document.getElementById('post-title').value = ''; document.getElementById('post-body').value = ''; document.getElementById('post-tags').value = ''; }

document.getElementById('create-trigger').addEventListener('click', () => openCreatePost('text'));
document.getElementById('post-title').addEventListener('input', function(){ document.getElementById('title-count').textContent = this.value.length + '/300'; });

async function handleFileUpload(evt) {
  const previews = document.getElementById('file-previews');
  const files = [...evt.target.files];
  for(const file of files) {
    if(file.size > 50*1024*1024){ showToast('Files must be under 50MB'); continue; }
    
    showToast('Uploading ' + file.name + '...');
    const path = `posts/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('posts').upload(path, file);
    
    if(error) { showToast('Upload failed: ' + error.message); continue; }
    
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);
    uploadedFiles.push({ name: file.name, url: publicUrl, type: file.type });
    previews.insertAdjacentHTML('beforeend',`<div class="file-preview-item">📎 ${escHtml(file.name)}</div>`);
  }
}

async function submitPost() {
  const title = document.getElementById('post-title').value.trim();
  const body = document.getElementById('post-body').value.trim();
  const community = document.getElementById('post-community').value;
  const tags = document.getElementById('post-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  
  if(!title){ showToast('Title is required'); return; }
  
  const btn = document.getElementById('submit-post-btn');
  btn.disabled = true;
  btn.textContent = 'Posting...';

  const post = {
    author_id: currentUser.id,
    title,
    body,
    community,
    tags,
    files: uploadedFiles,
    expires_at: new Date(Date.now() + 86400000).toISOString()
  };

  const { data, error } = await DB.createPost(post);
  
  if(error) { showToast('Error: ' + error.message); btn.disabled = false; btn.textContent = 'Post to Community'; return; }

  closeCreatePost();
  renderFeed();
  showToast('Post shared! 🚀');
  btn.disabled = false;
  btn.textContent = 'Post to Community';
}

function sharePost(postId) {
  const url = window.location.origin + '/pages/post.html?id=' + postId;
  if(navigator.clipboard) navigator.clipboard.writeText(url).then(()=>showToast('Link copied!'));
  else showToast('URL: ' + url);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a2336;border:1px solid rgba(99,102,241,0.3);color:#f1f5f9;padding:10px 20px;border-radius:10px;font-size:0.875rem;z-index:9999;animation:fadeInUp 0.3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// Community nav
document.querySelectorAll('.comm-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.comm-item').forEach(i=>i.classList.remove('active'));
    item.classList.add('active');
    activeCommunity = item.dataset.comm;
    renderFeed();
  });
});

// Sort tabs
document.querySelectorAll('.sort-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sort-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    activeSort = tab.dataset.sort;
    renderFeed();
  });
});

// Close modals on overlay click
document.getElementById('create-modal').addEventListener('click', e => { if(e.target === document.getElementById('create-modal')) closeCreatePost(); });

// Init
setupNav();
renderFeed();
