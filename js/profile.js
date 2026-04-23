/* ====== PROFILE JS ====== */
let currentUser = null;
let profileUser = null;
let isOwnProfile = false;

const DEFAULT_AVATARS = [
  { id: 'js', name: 'JS', icon: 'https://img.icons8.com/color/144/javascript.png' },
  { id: 'py', name: 'Python', icon: 'https://img.icons8.com/color/144/python.png' },
  { id: 'rs', name: 'Rust', icon: 'https://img.icons8.com/color/144/rust.png' },
  { id: 'go', name: 'Go', icon: 'https://img.icons8.com/color/144/google-go.png' },
  { id: 'cpp', name: 'C++', icon: 'https://img.icons8.com/color/144/c-plus-plus.png' },
  { id: 'swift', name: 'Swift', icon: 'https://img.icons8.com/color/144/swift.png' },
  { id: 'ts', name: 'TS', icon: 'https://img.icons8.com/color/144/typescript.png' },
  { id: 'react', name: 'React', icon: 'https://img.icons8.com/color/144/react-native.png' },
  { id: 'a1', name: 'Dev 1', icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { id: 'a2', name: 'Dev 2', icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { id: 'a3', name: 'Dev 3', icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jace' },
  { id: 'a4', name: 'Dev 4', icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' }
];

let selectedAvatarUrl = null;

async function initProfile() {
  currentUser = await DB.requireAuth();
  if (!currentUser) return;

  // Determine whose profile to show
  const qp = new URLSearchParams(window.location.search);
  const viewUsername = qp.get('u');
  
  if(viewUsername) {
    const { data } = await DB.getProfileByUsername(viewUsername);
    profileUser = data || currentUser;
  } else {
    profileUser = currentUser;
  }
  
  isOwnProfile = profileUser.id === currentUser.id;

  renderProfile();
  setupTabs();
}

function escHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderProfile() {
  const av = document.getElementById('profile-avatar');
  const navAv = document.getElementById('nav-avatar');
  
  const isFollowingUser = (currentUser.following||[]).includes(profileUser.id);
  const userFollowingMe = (profileUser.following||[]).includes(currentUser.id);
  const isMutualFollow = isFollowingUser && userFollowingMe;
  const isPublic = profileUser.is_public === true || profileUser.isPublic === true;
  const canView = isOwnProfile || isPublic || isMutualFollow;

  // Render Nav Avatar
  const currentNavAv = currentUser.avatar_url || currentUser.avatar;
  if(navAv) {
    navAv.style.background = currentNavAv ? 'none' : avatarColor(currentUser.username);
    navAv.innerHTML = currentNavAv ? `<img src="${currentNavAv}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : avatarInitials(currentUser.display_name || currentUser.displayName);
  }

  // Render Profile Avatar
  const currentProfileAv = profileUser.avatar_url || profileUser.avatar;
  av.style.background = currentProfileAv ? 'none' : avatarColor(profileUser.username);
  av.innerHTML = currentProfileAv ? `<img src="${currentProfileAv}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : avatarInitials(profileUser.display_name || profileUser.displayName);
  
  document.getElementById('profile-username').textContent = '@' + profileUser.username;

  if (canView) {
    document.getElementById('profile-name').textContent = profileUser.display_name || profileUser.displayName;
    document.getElementById('profile-bio').textContent = profileUser.bio || (isOwnProfile ? 'Add a bio to tell the community about yourself.' : '');
    document.getElementById('pstat-karma').textContent = profileUser.tkpoints || 0;
    
    // Posts stats - simplified for now
    document.getElementById('pstat-posts').textContent = '...';
    document.getElementById('pstat-followers').textContent = (profileUser.followers||[]).length;
    document.getElementById('pstat-following').textContent = (profileUser.following||[]).length;
    
    const joined = new Date(profileUser.join_date || profileUser.joinDate).toLocaleDateString('en-US',{month:'long',year:'numeric'});
    document.getElementById('about-joined').textContent = 'Joined ' + joined;
    document.getElementById('about-karma').textContent = (profileUser.tkpoints||0) + ' tkpoints';
    
    const badges = [...(profileUser.badges || [])];
    document.getElementById('profile-badges').innerHTML = badges.map(b=>`<span class="profile-badge">${b}</span>`).join('');
    
    renderUserPosts();
  } else {
    av.textContent = '?';
    document.getElementById('profile-name').textContent = 'Private Profile';
    document.getElementById('profile-bio').textContent = 'Follow each other to view this user\'s full profile.';
    document.getElementById('profile-badges').innerHTML = '<span class="profile-badge">🔒 Private</span>';
  }

  // Actions
  const actions = document.getElementById('profile-actions');
  if(isOwnProfile){
    actions.innerHTML = `<button class="edit-profile-btn" onclick="openEdit()">✏️ Edit Profile</button>`;
  } else {
    const isFollowing = (currentUser.following||[]).includes(profileUser.id);
    actions.innerHTML = `
      <button class="follow-profile-btn ${isFollowing?'following':''}" id="follow-profile-btn" onclick="toggleFollowProfile()">${isFollowing?'Following':'Follow'}</button>
      <button class="msg-profile-btn" onclick="window.location.href='chat.html?u=${profileUser.username}'">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Message
      </button>`;
  }
}

async function renderUserPosts() {
  const list = document.getElementById('profile-posts-list');
  // In a real app, fetch posts by author_id from Supabase
  list.innerHTML = '<div class="empty-profile">Loading posts...</div>';
  const { data: posts } = await supabase.from('posts').select('*').eq('author_id', profileUser.id).order('created_at', {ascending:false});
  
  if(!posts || !posts.length){ list.innerHTML='<div class="empty-profile">No posts yet</div>'; return; }
  
  list.innerHTML = posts.map(p=>`
    <div class="profile-post-card" onclick="window.location.href='community.html'">
      <div class="profile-post-title">${escHtml(p.title)}</div>
      <div class="profile-post-meta">
        <span>⬆ ${p.upvotes - p.downvotes}</span>
        <span>${timeAgo(p.created_at)}</span>
        <span>in ${p.community}</span>
      </div>
    </div>`).join('');
  
  const postStat = document.getElementById('pstat-posts');
  if(postStat) postStat.textContent = posts.length;
}

function openEdit() { 
  document.getElementById('edit-name').value = profileUser.display_name || profileUser.displayName;
  document.getElementById('edit-bio').value = profileUser.bio || '';
  document.getElementById('edit-public').checked = profileUser.is_public === true || profileUser.isPublic === true;
  
  const selector = document.getElementById('avatar-selector');
  selectedAvatarUrl = profileUser.avatar_url || profileUser.avatar;
  
  if(selector) {
    selector.innerHTML = DEFAULT_AVATARS.map(av => `
      <div class="avatar-option ${selectedAvatarUrl === av.icon ? 'selected' : ''}" onclick="selectAvatar('${av.icon}', this)">
        <img src="${av.icon}" alt="${av.name}">
        <div class="avatar-label">${av.name}</div>
      </div>
    `).join('');
  }
  
  document.getElementById('edit-modal').style.display='flex'; 
}

function selectAvatar(url, el) {
  selectedAvatarUrl = url;
  document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
  el.classList.add('selected');
}

function closeEdit() { document.getElementById('edit-modal').style.display='none'; }

async function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const isPublic = document.getElementById('edit-public').checked;
  if(!name) return;
  
  const updates = {
    display_name: name,
    bio: bio,
    is_public: isPublic,
    avatar_url: selectedAvatarUrl
  };

  const { error } = await DB.updateProfile(currentUser.id, updates);
  if(error) { alert('Error updating profile: ' + error.message); return; }

  // Update local state
  Object.assign(currentUser, updates);
  DB.setCurrentUser(currentUser);
  profileUser = currentUser;

  closeEdit();
  renderProfile();
}

function setupTabs() {
  document.querySelectorAll('.profile-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('profile-posts-panel').style.display = tab.dataset.tab==='posts'?'flex':'none';
      document.getElementById('profile-comments-panel').style.display = tab.dataset.tab==='comments'?'flex':'none';
    });
  });
}

// Overlay close
const modal = document.getElementById('edit-modal');
if(modal) modal.addEventListener('click', e=>{ if(e.target===modal) closeEdit(); });

// Start
initProfile();
