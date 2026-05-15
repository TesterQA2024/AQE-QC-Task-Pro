// ═══════════════════════━━━━━━━━━━━━━━━━━━
// AQE QC SYSTEM - FIREBASE CONFIGURATION & AUTH
// ═════════════════════━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 FIREBASE CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const aqeFirebaseConfig = {
  apiKey:            "AIzaSyCQdbnCr_wyUSHQburKktXxpFGEAsGc6Vg",
  authDomain:        "aqe-qc-system.firebaseapp.com",
  projectId:         "aqe-qc-system",
  storageBucket:     "aqe-qc-system.firebasestorage.app",
  messagingSenderId: "964314109674",
  appId:             "1:964314109674:web:23435f0d2ae793b4e0e993"
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ FIREBASE ADMIN FUNCTIONS (Cloud Function URLs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ADMIN_FUNCTIONS = {
  // Cloud Function endpoints (to be deployed)
  listUsers: 'https://us-central1-aqe-qc-system.cloudfunctions.net/listAuthUsers',
  deleteUser: 'https://us-central1-aqe-qc-system.cloudfunctions.net/deleteAuthUser',
  bulkDelete: 'https://us-central1-aqe-qc-system.cloudfunctions.net/bulkDeleteAuthUsers'
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 FIREBASE SDK (Compat version - no imports needed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Use direct Firebase Firestore methods - no custom wrappers

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// �� FIREBASE INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const isConfigured = aqeFirebaseConfig.apiKey !== 'YOUR_API_KEY';

let app, auth, db, secondaryApp, secondaryAuth;

if (isConfigured) {
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }
    
    app  = firebase.initializeApp(aqeFirebaseConfig);
    auth = firebase.auth();
    db   = firebase.firestore();
    
    // Secondary app for creating users without logging out
    secondaryApp  = firebase.initializeApp(aqeFirebaseConfig, 'secondary');
    secondaryAuth = firebase.auth(secondaryApp);
    
    console.log('🔥 Firebase initialized successfully!');
    console.log('📊 Firebase version:', firebase.SDK_VERSION);
    
  } catch(e) {
    console.error('❌ Firebase initialization error:', e);
    // Show error message on page
    const noticeEl = document.getElementById('config-notice');
    if (noticeEl) {
      noticeEl.style.display = 'block';
      noticeEl.innerHTML = `⚠️ Firebase Error: ${e.message}<br>Please check your internet connection and refresh.`;
    }
  }
} else {
  console.log('⚠️ Firebase not configured');
  const noticeEl = document.getElementById('config-notice');
  if (noticeEl) {
    noticeEl.style.display = 'block';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 APP STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let currentUser     = null;   // Firebase auth user
let currentProfile  = null;   // Firestore user doc
let isAdmin         = false;
let isSuperAdmin    = false;
let allTasks        = [];
let allProjects     = [];
let allExcel        = [];
let allSheetTracker = [];
let allUsers        = [];
let taskFilter      = 'all';
let priorityFilter  = '';
let projectFilter   = 'all';
let searchQuery     = '';
let editingTaskId   = null;
let editingProjectId= null;
let editingUserId   = null;
let confirmCallback = null;
let unsubs          = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 AUTHENTICATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// AUTH LISTENER
if (isConfigured && auth) {
  try {
    firebase.auth().onAuthStateChanged(async user => {
      if (user) {
        currentUser = user;
        console.log('👤 User logged in:', user.email);
        
        // Get user profile from Firestore
        try {
          const profileSnap = await firebase.firestore().collection('users').doc(user.uid).get();
          if (profileSnap && profileSnap.exists) {
            currentProfile = { id: user.uid, ...profileSnap.data() };
            
            // Check user status (only if not already checked in handleLogin)
            if (currentProfile.status === 'inactive') {
              if (!window.loginStatusChecked) {
                console.log('🚫 Inactive user detected - logging out');
                await firebase.auth().signOut();
                showToast('Your account is inactive. Please contact administrator.', 'error');
                return;
              } else {
                console.log('🚫 Inactive user already handled in handleLogin - skipping popup');
                window.loginStatusChecked = false;
                return;
              }
            }
            
            // Reset the flag after successful login
            window.loginStatusChecked = false;
            
            isAdmin = currentProfile.role === 'superadmin';
            isSuperAdmin = currentProfile.role === 'superadmin';
            console.log('📋 User profile loaded:', currentProfile.name, 'Status:', currentProfile.status);
            initApp();
          } else {
            // Profile missing - show login
            console.log('⚠️ User profile not found');
            showLoginScreen();
          }
        } catch(profileError) {
          console.error('Error loading profile:', profileError);
          showLoginScreen();
        }
      } else {
        currentUser = null; 
        currentProfile = null; 
        isAdmin = false; 
        isSuperAdmin = false;
        cleanupListeners();
        showLoginScreen();
        console.log('👤 User logged out');
      }
    });
  } catch(e) {
    console.error('❌ Auth listener error:', e);
    showLoginScreen();
  }
} else {
  console.log('⚠️ Firebase not configured or auth not available');
  showLoginScreen();
}

// LOGIN FUNCTION
async function handleLogin() {
  if (!isConfigured) { 
    showToast('Configure Firebase first!', 'error'); 
    return; 
  }
  
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Email and password are required.';
    errEl.style.display = 'block';
    return;
  }

  try {
    console.log('🔑 Attempting login...');
    const userCred = await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log('✅ Firebase Auth login successful! UID:', userCred.user.uid);
    
    // Check user status in Firestore
    const userDoc = await firebase.firestore().collection('users').doc(userCred.user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('👤 User data found:', { status: userData.status, role: userData.role, name: userData.name });
      
      if (userData.status === 'inactive') {
        console.log('🚫 User is inactive - logging out');
        await firebase.auth().signOut();
        showToast('Your account is inactive. Please contact administrator.', 'error');
        return;
      }
      
      console.log('✅ User is active - login complete');
      // Set a flag to prevent double popup in onAuthStateChanged
      window.loginStatusChecked = true;
    } else {
      console.log('⚠️ User profile not found, but allowing login');
      window.loginStatusChecked = true;
    }
  } catch(e) {
    console.error('❌ Login error:', e);
    
    // Handle different Firebase Auth errors with user-friendly messages
    let errorMessage = 'Login failed. Please try again.';
    
    if (e.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address.';
    } else if (e.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (e.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address format.';
    } else if (e.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled.';
    } else if (e.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    } else if (e.message && e.message.includes('INVALID_LOGIN_CREDENTIALS')) {
      errorMessage = 'Invalid email or password. Please check your credentials.';
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    showToast(errorMessage, 'error');
  }
}

// LOGOUT FUNCTION
async function handleLogout() {
  try {
    console.log('🔑 Logging out...');
    await firebase.auth().signOut();
    console.log('✅ Logout successful!');
  } catch(e) {
    console.error('❌ Logout error:', e);
  }
}

// SETUP FUNCTION (First admin creation)
async function handleSetup() {
  if (!isConfigured) { 
    showToast('Configure Firebase first!', 'error'); 
    return; 
  }
  
  const name     = document.getElementById('setup-name').value.trim();
  const email    = document.getElementById('setup-email').value.trim();
  const password = document.getElementById('setup-password').value;
  const errEl    = document.getElementById('setup-error');
  errEl.style.display = 'none';

  if (!name || !email || !password) {
    errEl.textContent = 'All fields are required.';
    errEl.style.display = 'block';
    return;
  }

  try {
    console.log('🔑 Creating admin user...');
    
    // Create user in Firebase Auth
    const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const uid = userCred.user.uid;
    console.log('✅ Firebase Auth user created:', uid);

    // Store user profile in Firestore
    await firebase.firestore().collection('users').doc(uid).set({
      uid: uid,
      email: email,
      name: name,
      role: 'superadmin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ User profile stored in Firestore');

    showToast('Admin user created! You can now login.', 'success');
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  } catch(e) {
    console.error('❌ Setup error:', e);
    if (e.code === 'auth/email-already-exists') {
      errEl.textContent = `Email already exists in Firebase Auth. Please delete the user from Firebase Console first, then try again.`;
    } else {
      errEl.textContent = getFriendlyError(e.code) || e.message;
    }
    errEl.style.display = 'block';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 REAL-TIME LISTENERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function startListeners() {
  cleanupListeners();
  
  console.log('🔑 User role check:', isSuperAdmin ? 'Super Admin' : 'Regular User');
  console.log('👤 Current user:', currentUser?.email);
  console.log('👑 isSuperAdmin value:', isSuperAdmin);

  // TASKS - Super Admin sees all, Users see only their assigned tasks
  let taskQuery = isSuperAdmin
    ? firebase.firestore().collection('tasks').orderBy('createdAt', 'desc')
    : firebase.firestore().collection('tasks').where('assignedToUid', '==', currentUser.uid);
    
  console.log('📋 Task query type:', isSuperAdmin ? 'All tasks' : 'My assigned tasks');
  console.log('📋 Current user UID:', currentUser?.uid);
  console.log('📋 Is Super Admin:', isSuperAdmin);

  const taskUnsub = taskQuery.onSnapshot(snap => {
    allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('📋 Tasks updated:', allTasks.length, 'tasks loaded');
    console.log('📋 Task details:', allTasks.map(t => ({ id: t.id, title: t.title, assignedToUid: t.assignedToUid, status: t.status })));
    if (typeof renderTasks === 'function') {
      renderTasks();
    } else {
      console.error('❌ renderTasks function not found!');
    }
    renderDashboard();
    if (window.updateNavBadge) window.updateNavBadge();
  }, err => console.error('Tasks error:', err));
  unsubs.push(taskUnsub);

  // PROJECTS - Super Admin sees all, Users see only their imported projects
  let projQuery = isSuperAdmin
    ? firebase.firestore().collection('projects').orderBy('importedAt', 'desc')
    : firebase.firestore().collection('projects').where('importedByUid', '==', currentUser.uid);

  const projUnsub = projQuery.onSnapshot(snap => {
    allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (typeof renderProjects === 'function') renderProjects();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (window.updateNavBadge) window.updateNavBadge();
  }, err => console.error('Projects error:', err));
  unsubs.push(projUnsub);

  // MANAGE EXCEL
  let excelQuery = isSuperAdmin
    ? firebase.firestore().collection('manageExcel').orderBy('completedAt', 'desc')
    : firebase.firestore().collection('manageExcel').where('completedByUid', '==', currentUser.uid);

  const excelUnsub = excelQuery.onSnapshot(snap => {
    allExcel = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (typeof renderExcel === 'function') renderExcel();
    if (window.renderRecentCompletions) window.renderRecentCompletions();
    if (typeof renderProjects === 'function') renderProjects();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (window.updateNavBadge) window.updateNavBadge();
  }, err => console.error('Excel error:', err));
  unsubs.push(excelUnsub);

  // SHEET TRACKER - Super Admin sees all, Users see only their entries
  let sheetTrackerQuery = isSuperAdmin
    ? firebase.firestore().collection('sheetTracker').orderBy('createdAt', 'desc')
    : firebase.firestore().collection('sheetTracker').where('createdByUid', '==', currentUser.uid).orderBy('createdAt', 'desc');

  const sheetTrackerUnsub = sheetTrackerQuery.onSnapshot(snap => {
    allSheetTracker = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('📋 Sheet Tracker updated:', allSheetTracker.length, 'entries');
    if (typeof renderSheetTracker === 'function') {
      renderSheetTracker();
    } else {
      console.error('❌ renderSheetTracker function not found!');
    }
    if (window.updateNavBadge) window.updateNavBadge();
  }, err => console.error('Sheet Tracker error:', err));
  unsubs.push(sheetTrackerUnsub);

  // USERS (Super Admin only)
  if (isSuperAdmin) {
    const userUnsub = firebase.firestore().collection('users').onSnapshot(snap => {
      allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof renderUsers === 'function') renderUsers();
      if (typeof populateAssigneeDropdown === 'function') populateAssigneeDropdown();
      if (typeof renderDashboard === 'function') renderDashboard();
    }, err => console.error('❌ Users error:', err));
    unsubs.push(userUnsub);
  }
}

function cleanupListeners() {
  unsubs.forEach(u => u());
  unsubs = [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getFriendlyError(code) {
  const errors = {
    'auth/user-not-found': 'User not found. Check your email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/user-disabled': 'Account disabled.',
    'auth/network-request-failed': 'Network error. Check connection.',
    'auth/requires-recent-login': 'Please login again and retry.',
    'auth/invalid-credential': 'Invalid credentials.',
    'auth/email-already-exists': 'Email already exists in Firebase Auth.'
  };
  return errors[code] || 'An error occurred. Please try again.';
}

function showLoginScreen() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  
  // Check if any users exist in the system
  checkUsersExist().then(usersExist => {
    const setupBtn = document.querySelector('button[onclick="showSetup()"]');
    if (setupBtn) {
      // Hide setup button if users exist (super admin already created)
      setupBtn.style.display = usersExist ? 'none' : 'block';
    }
  });
}

async function checkUsersExist() {
  try {
    const usersSnapshot = await firebase.firestore().collection('users').limit(1).get();
    return !usersSnapshot.empty;
  } catch(e) {
    console.error('Error checking users:', e);
    return true; // Default to hiding setup button if error
  }
}

function showSetup() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('setup-screen').style.display = 'flex';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Update sidebar
  document.getElementById('sidebar-name').textContent  = currentProfile.name;
  document.getElementById('sidebar-role').textContent  = isSuperAdmin ? 'Super Admin' : 'User';
  document.getElementById('sidebar-avatar').textContent = currentProfile.name.charAt(0).toUpperCase();

  // Show admin section
  if (isSuperAdmin) {
    document.getElementById('admin-nav-section').style.display = 'block';
    const usersRow = document.getElementById('stat-users-row');
    if (usersRow) usersRow.style.display = 'block';
  }

  // Update greeting
  if (window.updateGreeting) window.updateGreeting();
  if (window.startClock) window.startClock();

  // Start real-time listeners
  startListeners();

  // Render dashboard
  if (window.renderDashboard) window.renderDashboard();
}

// Export for use in other modules
window.firebaseConfig = aqeFirebaseConfig;
window.ADMIN_FUNCTIONS = ADMIN_FUNCTIONS;
window.app = app;
window.auth = auth;
window.db = db;
window.secondaryApp = secondaryApp;
window.secondaryAuth = secondaryAuth;
window.currentUser = currentUser;
window.initApp = initApp;
window.currentProfile = currentProfile;
window.isAdmin = isAdmin;
window.isSuperAdmin = isSuperAdmin;
window.allTasks = allTasks;
window.allProjects = allProjects;
window.allExcel = allExcel;
window.allUsers = allUsers;
window.editingProjectId = editingProjectId;
window.handleLogin = handleLogin;
// Initialize Google Sheets API
function initGoogleSheetsAPI() {
  console.log('📊 Initializing Google Sheets API...');
  
  // Check if Google API is available
  if (typeof gapi !== 'undefined') {
    gapi.load('client', () => {
      console.log('📊 Google API client loaded');
      // Note: You'll need to set up API key and client ID for full functionality
      // For now, we'll use the Excel fallback which works perfectly
    });
  } else {
    console.log('📊 Google API not available, will use Excel fallback');
  }
}

window.handleLogout = handleLogout;
window.handleSetup = handleSetup;
window.startListeners = startListeners;
window.cleanupListeners = cleanupListeners;
window.getFriendlyError = getFriendlyError;
window.showLoginScreen = showLoginScreen;
window.showSetup = showSetup;
window.initGoogleSheetsAPI = initGoogleSheetsAPI;
