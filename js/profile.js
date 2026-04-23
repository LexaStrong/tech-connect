/* ====== PROFILE JS ====== */
const currentUser = DB.requireAuth();
if (!currentUser) throw new Error('Not authenticated');

const navAv = document.getElementById('nav-avatar');
if(navAv){ navAv.textContent = avatarInitials(currentUser.displayName); navAv.style.background = avatarColor(currentUser.username); }

function escHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Determine whose profile to show
const qp = new URLSearchParams(window.location.search);
const viewUsername = qp.get('u');
let profileUser = null;
const allUsers = DB.users();
if(viewUsername) profileUser = Object.values(allUsers).find(u=>u.username===viewUsername) || null;
if(!profileUser) profileUser = currentUser;
const isOwnProfile = profileUser.id === currentUser.id;

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

function renderProfile() {
  const av = document.getElementById('profile-avatar');
  const isFollowingUser = (currentUser.following||[]).includes(profileUser.id);
  const userFollowingMe = (profileUser.following||[]).includes(currentUser.id);
  const isMutualFollow = isFollowingUser && userFollowingMe;
  const isPublic = profileUser.isPublic === true;
  const canView = isOwnProfile || isPublic || isMutualFollow;

  const currentAv = profileUser.avatar_url || profileUser.avatar;
  av.style.background = currentAv ? 'none' : avatarColor(profileUser.username);
  av.innerHTML = currentAv ? `<img src="${currentAv}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : avatarInitials(profileUser.displayName);
  
  document.getElementById('profile-username').textContent = '@' + profileUser.username;

  const userPosts = DB.posts().filter(p=>p.authorId===profileUser.id);
  
  if (canView) {
    document.getElementById('profile-name').textContent = profileUser.displayName;
    document.getElementById('profile-bio').textContent = profileUser.bio || (isOwnProfile ? 'Add a bio to tell the community about yourself.' : '');
    document.getElementById('pstat-karma').textContent = profileUser.tkpoints || 0;
    document.getElementById('pstat-posts').textContent = userPosts.length;
    document.getElementById('pstat-followers').textContent = (profileUser.followers||[]).length;
    document.getElementById('pstat-following').textContent = (profileUser.following||[]).length;
    
    const joined = new Date(profileUser.joinDate).toLocaleDateString('en-US',{month:'long',year:'numeric'});
    document.getElementById('about-joined').textContent = 'Joined ' + joined;
    document.getElementById('about-karma').textContent = (profileUser.tkpoints||0) + ' tkpoints';
    
    const badges = [...(profileUser.badges || [])];
    if((profileUser.tkpoints||0) >= 500) badges.push('⭐ Pro');
    if((profileUser.tkpoints||0) >= 100) badges.push('🔥 Active');
    if(userPosts.length >= 5) badges.push('✍️ Contributor');
    document.getElementById('profile-badges').innerHTML = badges.map(b=>`<span class="profile-badge">${b}</span>`).join('');
  } else {
    av.textContent = '?';
    document.getElementById('profile-name').textContent = 'Private Profile';
    document.getElementById('profile-bio').textContent = 'Follow each other to view this user\'s full profile.';
    document.getElementById('pstat-karma').textContent = '-';
    document.getElementById('pstat-posts').textContent = '-';
    document.getElementById('pstat-followers').textContent = '-';
    document.getElementById('pstat-following').textContent = '-';
    document.getElementById('about-joined').textContent = 'Joined -';
    document.getElementById('about-karma').textContent = '- tkpoints';
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
  // Posts
  renderPosts(userPosts, canView);
}

function renderPosts(posts, canView) {
  const list = document.getElementById('profile-posts-list');
  if(!canView){ list.innerHTML='<div class="empty-profile">Posts are hidden (Private Profile)</div>'; return; }
  if(!posts.length){ list.innerHTML='<div class="empty-profile">No posts yet</div>'; return; }
  list.innerHTML = posts.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p=>`
    <div class="profile-post-card" onclick="window.location.href='community.html'">
      <div class="profile-post-title">${escHtml(p.title)}</div>
      <div class="profile-post-meta">
        <span>⬆ ${p.upvotes - p.downvotes}</span>
        <span>💬 ${p.comments.length} comments</span>
        <span>${timeAgo(p.createdAt)}</span>
        <span>in ${p.community}</span>
      </div>
    </div>`).join('');
}

function toggleFollowProfile() {
  const btn = document.getElementById('follow-profile-btn');
  const users = DB.users();
  let following = currentUser.following || [];
  let profileFollowers = profileUser.followers || [];
  if(following.includes(profileUser.id)){
    following = following.filter(id=>id!==profileUser.id);
    profileFollowers = profileFollowers.filter(id=>id!==currentUser.id);
    btn.textContent='Follow'; btn.classList.remove('following');
  } else {
    following.push(profileUser.id);
    profileFollowers.push(currentUser.id);
    btn.textContent='Following'; btn.classList.add('following');
    addNotification(profileUser.id,`@${currentUser.username} followed you`,'');
  }
  currentUser.following = following;
  profileUser.followers = profileFollowers;
  DB.setCurrentUser(currentUser);
  if(users[currentUser.id]){ users[currentUser.id].following=following; }
  if(users[profileUser.id]){ users[profileUser.id].followers=profileFollowers; }
  DB.saveUsers(users);
  document.getElementById('pstat-followers').textContent = profileFollowers.length;
}

function openEdit() { 
  document.getElementById('edit-name').value = currentUser.displayName;
  document.getElementById('edit-bio').value = currentUser.bio || '';
  document.getElementById('edit-public').checked = currentUser.isPublic === true;
  
  const selector = document.getElementById('avatar-selector');
  selectedAvatarUrl = currentUser.avatar_url || currentUser.avatar;
  
  selector.innerHTML = DEFAULT_AVATARS.map(av => `
    <div class="avatar-option ${selectedAvatarUrl === av.icon ? 'selected' : ''}" onclick="selectAvatar('${av.icon}', this)">
      <img src="${av.icon}" alt="${av.name}">
      <div class="avatar-label">${av.name}</div>
    </div>
  `).join('');
  
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
  
  const users = DB.users();
  currentUser.displayName = name;
  currentUser.bio = bio;
  currentUser.isPublic = isPublic;
  currentUser.avatar_url = selectedAvatarUrl;
  
  if(users[currentUser.id]){ 
    users[currentUser.id].displayName=name; 
    users[currentUser.id].bio=bio; 
    users[currentUser.id].isPublic=isPublic;
    users[currentUser.id].avatar_url = selectedAvatarUrl;
  }
  
  DB.saveUsers(users);
  DB.setCurrentUser(currentUser);
  
  // Update Supabase
  await DB.updateProfile(currentUser.id, {
    display_name: name,
    bio: bio,
    is_public: isPublic,
    avatar_url: selectedAvatarUrl
  });

  profileUser = currentUser;
  closeEdit();
  renderProfile();
  
  // Update nav avatar
  const navAv = document.getElementById('nav-avatar');
  if(navAv) {
    navAv.style.background = selectedAvatarUrl ? 'none' : avatarColor(currentUser.username);
    navAv.innerHTML = selectedAvatarUrl ? `<img src="${selectedAvatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : avatarInitials(currentUser.displayName);
  }
}

document.getElementById('edit-modal').addEventListener('click', e=>{ if(e.target===document.getElementById('edit-modal')) closeEdit(); });

// Profile tabs
document.querySelectorAll('.profile-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('profile-posts-panel').style.display = tab.dataset.tab==='posts'?'flex':'none';
    document.getElementById('profile-comments-panel').style.display = tab.dataset.tab==='comments'?'flex':'none';
    if(tab.dataset.tab==='comments') renderComments();
  });
});

function renderComments() {
  const isFollowingUser = (currentUser.following||[]).includes(profileUser.id);
  const userFollowingMe = (profileUser.following||[]).includes(currentUser.id);
  const isMutualFollow = isFollowingUser && userFollowingMe;
  const isPublic = profileUser.isPublic === true;
  const canView = isOwnProfile || isPublic || isMutualFollow;

  const list = document.getElementById('profile-comments-list');
  if(!canView){ list.innerHTML='<div class="empty-profile">Comments are hidden (Private Profile)</div>'; return; }
  
  const posts = DB.posts();
  const comments = [];
  posts.forEach(p=>{ p.comments.filter(c=>c.authorId===profileUser.id).forEach(c=>comments.push({...c,postTitle:p.title,postId:p.id})); });
  if(!comments.length){ list.innerHTML='<div class="empty-profile">No comments yet</div>'; return; }
  list.innerHTML = comments.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(c=>`
    <div class="profile-post-card">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:6px">on: ${escHtml(c.postTitle)}</div>
      <div style="font-size:.875rem;color:var(--text2)">${escHtml(c.body)}</div>
      <div class="profile-post-meta"><span>▲ ${c.upvotes||0}</span><span>${timeAgo(c.createdAt)}</span></div>
    </div>`).join('');
}

renderProfile();
