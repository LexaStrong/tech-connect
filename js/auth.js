/* ====== SUPABASE AUTH & DB ====== */
// DB object is provided by db.js

// Adjectives & nouns for username generation
const ADJ = ['swift','cosmic','neon','quantum','lunar','cyber','pixel','binary','neural','atomic','stellar','digital','hyper','sonic','echo'];
const NOUN = ['coder','hacker','builder','dev','forge','byte','node','stack','core','sys','grid','loop','pulse','chip','flux'];

function generateUsername() {
  const adj = ADJ[Math.floor(Math.random() * ADJ.length)];
  const noun = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  const username = `${adj}_${noun}${num}`;
  const el = document.getElementById('generated-username');
  if (el) el.textContent = username;
  return username;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.style.color = '#a5b4fc';
  } else {
    input.type = 'password';
    btn.style.color = '';
  }
}

function switchTab(tab) {
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const slider = document.getElementById('tab-slider');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    slider.classList.remove('right');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    slider.classList.add('right');
    generateUsername();
  }
}

// Check URL param
const params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'signup') switchTab('signup');
else switchTab('login');

// Tab click handlers
document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

// Password strength
document.getElementById('signup-password').addEventListener('input', function() {
  const pw = this.value;
  const bar = document.getElementById('pw-strength');
  if (!pw) { bar.className = 'password-strength'; return; }
  if (pw.length < 6) bar.className = 'password-strength weak';
  else if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) bar.className = 'password-strength medium';
  else bar.className = 'password-strength strong';
});

function showError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function setLoading(btn, loading) {
  if (loading) { btn.classList.add('loading'); btn.querySelector('span').textContent = 'Loading...'; }
  else { btn.classList.remove('loading'); btn.querySelector('span').textContent = btn.id === 'login-btn' ? 'Log In' : 'Create Account'; }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  showError('login-error', '');

  if (!email || !password) { showError('login-error', 'Please fill in all fields.'); return; }

  setLoading(btn, true);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.includes('@') ? email : `${email}@placeholder.com`,
      password: password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user data returned.');

    // Fetch profile
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (pError) throw new Error('Profile fetch failed: ' + pError.message);

    DB.setCurrentUser({ ...data.user, ...profile });
    window.location.href = 'community.html';
  } catch (err) {
    console.error('Login error:', err);
    setLoading(btn, false);
    showError('login-error', err.message || 'An unexpected error occurred.');
  }
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const display = document.getElementById('signup-display').value.trim();
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('generated-username').textContent;
  const btn = document.getElementById('signup-btn');
  showError('signup-error', '');

  if (!email || !display || !password) { showError('signup-error', 'Please fill in all fields.'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showError('signup-error', 'Please enter a valid email address.'); return; }
  if (password.length < 8) { showError('signup-error', 'Password must be at least 8 characters.'); return; }

  setLoading(btn, true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: display,
          username: username
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Signup failed: No user returned.');

    // Check if user is already confirmed (or if confirmation is disabled)
    // If confirmation is enabled, we might not have a session yet.
    
    // Create profile
    const { error: pError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          username: username,
          display_name: display,
          tkpoints: 0,
          badges: ['🐣 Newbie'],
          is_public: false
        }
      ]);

    if (pError) {
      // If it's a conflict, it might already exist
      if (pError.code !== '23505') throw pError;
    }

    setLoading(btn, false);
    
    if (data.session) {
      DB.setCurrentUser({ ...data.user, username, display_name: display });
      window.location.href = 'community.html';
    } else {
      showError('signup-error', 'Check your email for the confirmation link!');
      btn.querySelector('span').textContent = 'Waiting for confirmation...';
    }
  } catch (err) {
    console.error('Signup error:', err);
    setLoading(btn, false);
    showError('signup-error', err.message || 'An unexpected error occurred.');
  }
}


function seedDemoData() {
  const posts = DB.get('posts', []);
  if (posts.length > 0) return; // Already seeded
  const demoPosts = [
    {
      id: 'post_demo1', authorId: 'demo1', authorName: 'Priya Sharma', authorUsername: 'stellar_dev247',
      title: 'Just open-sourced my CLI tool for automated API testing 🚀',
      body: 'After 3 months of side-project grinding, my API testing CLI is now live on GitHub! It supports REST, GraphQL, and WebSocket endpoints with a beautiful terminal UI.',
      community: 'Open Source', upvotes: 142, downvotes: 3,
      comments: [], createdAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 82800000).toISOString(), files: [], tags: ['oss','cli','api']
    },
    {
      id: 'post_demo2', authorId: 'demo2', authorName: 'Marcus Johnson', authorUsername: 'quantum_coder881',
      title: 'How I reduced my ML model inference time by 60%',
      body: 'TL;DR: Quantization + ONNX export + batching. Here\'s the full breakdown with benchmarks and code snippets.',
      community: 'AI & ML', upvotes: 287, downvotes: 12,
      comments: [
        { id: 'c1', authorUsername: 'neon_stack201', body: 'This is gold! Did you try TensorRT as well?', upvotes: 23, createdAt: new Date(Date.now() - 1800000).toISOString() }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      expiresAt: new Date(Date.now() + 79200000).toISOString(), files: [], tags: ['ml','python','optimization']
    },
    {
      id: 'post_demo3', authorId: 'demo3', authorName: 'Sofia Rodriguez', authorUsername: 'cyber_pulse445',
      title: 'Looking for a co-founder for my FinTech startup idea 💡',
      body: 'I have a validated idea for embedded finance APIs targeting SMEs in emerging markets. Looking for a technical co-founder with backend/infrastructure experience.',
      community: 'Startups & Ideas', upvotes: 89, downvotes: 4,
      comments: [], createdAt: new Date(Date.now() - 10800000).toISOString(),
      expiresAt: new Date(Date.now() + 75600000).toISOString(), files: [], tags: ['fintech','cofounder','startup']
    },
    {
      id: 'post_demo4', authorId: 'demo4', authorName: 'Yuki Tanaka', authorUsername: 'binary_node553',
      title: 'My home lab K8s cluster setup (full walkthrough with code)',
      body: 'Running a 5-node Kubernetes cluster on old ThinkPads at home. Here\'s everything I learned from networking to persistent storage to monitoring.',
      community: 'Cloud & DevOps', upvotes: 203, downvotes: 7,
      comments: [], createdAt: new Date(Date.now() - 14400000).toISOString(),
      expiresAt: new Date(Date.now() + 72000000).toISOString(), files: [], tags: ['k8s','devops','homelab']
    },
  ];
  DB.set('posts', demoPosts);
}
