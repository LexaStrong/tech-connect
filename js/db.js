/* ====== SUPABASE DATA LAYER ====== */
// Note: Requires supabase-config.js to be loaded before this script
const DB = {
  // Sync methods (localStorage for quick session/UI state)
  get: (k, d = null) => {
    try { const v = localStorage.getItem('tc_' + k); return v !== null ? JSON.parse(v) : d; }
    catch { return d; }
  },
  set: (k, v) => localStorage.setItem('tc_' + k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem('tc_' + k),

  currentUser: () => DB.get('current_user', null),
  setCurrentUser: (u) => DB.set('current_user', u),

  // New async auth check
  async checkAuth() {
    let u = DB.currentUser();
    if (!u) {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        u = { ...session.user, ...profile };
        DB.setCurrentUser(u);
      }
    }
    return u;
  },

  requireAuth: async () => {
    const u = await DB.checkAuth();
    if (!u) { 
      const isSubPage = window.location.pathname.includes('/pages/');
      window.location.href = isSubPage ? 'auth.html' : 'pages/auth.html'; 
      return null; 
    }
    return u;
  },

  /* --- SUPABASE ASYNC METHODS --- */

  // POSTS
  async getPosts(community = 'All', sort = 'new') {
    let query = supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(username, display_name)')
      .gt('expires_at', new Date().toISOString());

    if (community !== 'All') query = query.eq('community', community);

    if (sort === 'new') query = query.order('created_at', { ascending: false });
    else if (sort === 'top') query = query.order('upvotes', { ascending: false });
    else query = query.order('upvotes', { ascending: false }); // 'hot' fallback

    const { data, error } = await query;
    if (error) console.error('Supabase getPosts error:', error);
    
    // Map to expected format for frontend compatibility
    return (data || []).map(p => ({
      ...p,
      authorUsername: p.profiles?.username,
      authorName: p.profiles?.display_name,
      comments: [] // Comments will be fetched separately or via join
    }));
  },

  async createPost(postData) {
    const { data, error } = await supabase
      .from('posts')
      .insert([postData])
      .select();
    return { data, error };
  },

  async votePost(postId, userId, dir) {
    // In a real app, this would use a 'votes' table and a database function
    // For now, we increment the count directly (simplified)
    const field = dir === 'up' ? 'upvotes' : 'downvotes';
    const { data, error } = await supabase.rpc('increment_vote', { post_id: postId, field_name: field });
    return { data, error };
  },

  // PROFILES
  async getProfileByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    return { data, error };
  },

  async updateProfile(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
    return { data, error };
  },

  // MESSAGES (Ephemeral)
  async getMessages(threadId) {
    // Ephemeral messages would ideally use Supabase Realtime or a dedicated table with TTL
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .gt('created_at', new Date(Date.now() - 86400000).toISOString())
      .order('created_at', { ascending: true });
    return { data, error };
  },

  async sendMessage(msgData) {
    const { data, error } = await supabase.from('messages').insert([msgData]);
    return { data, error };
  }
};

/* --- UTILS --- */

function avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(username) {
  const colors = [
    'linear-gradient(135deg,#6366f1,#06b6d4)',
    'linear-gradient(135deg,#a855f7,#6366f1)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#ec4899,#a855f7)',
    'linear-gradient(135deg,#06b6d4,#10b981)'
  ];
  if (!username) return colors[0];
  let h = 0; for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) % colors.length;
  return colors[h];
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function timeLeft(iso) {
  const s = Math.floor((new Date(iso) - Date.now()) / 1000);
  if (s < 0) return 'expired';
  if (s < 3600) return Math.floor(s / 60) + 'm left';
  return Math.floor(s / 3600) + 'h left';
}

// Global cleanup (Supabase handles TTL via expires_at filtering in queries, 
// but we keep the helper for consistency)
function cleanExpiredPosts() {
  console.log('Cleanup handled by Supabase queries.');
}
