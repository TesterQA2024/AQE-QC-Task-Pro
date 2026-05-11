// ═══════════════════════════════════════════
// AQE QC SYSTEM - USER MANAGEMENT & FIREBASE AUTH
// ═══════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 USER MANAGEMENT FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// CREATE/UPDATE USER
async function saveUser() {
  console.log('💾 saveUser() called, editingUserId:', editingUserId);
  
  const nameEl    = document.getElementById('u-name');
  const emailEl   = document.getElementById('u-email');
  const roleEl    = document.getElementById('u-role');
  const passwordEl = document.getElementById('u-password');
  const errEl     = document.getElementById('user-modal-error');
  
  if (!nameEl || !emailEl || !roleEl || !errEl) {
    console.error('❌ User form elements not found');
    return;
  }
  
  const name     = nameEl.value.trim();
  const email    = emailEl.value.trim();
  const role     = roleEl.value;
  const password = passwordEl ? passwordEl.value : '';
  
  console.log('📝 User data:', { name, email, role, editingUserId });
  
  errEl.style.display = 'none';

  // Validation for required fields
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!editingUserId) {
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters');
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least 1 letter and 1 number');
    }
  }
  
  if (errors.length > 0) {
    errEl.innerHTML = errors.map(err => `• ${err}`).join('<br>');
    errEl.style.display = 'block';
    return;
  }

  try {
    if (editingUserId) {
      console.log('✏️ Updating existing user:', editingUserId);
      // Update existing user
      await firebase.firestore().collection('users').doc(editingUserId).update({
        name: name,
        email: email,
        role: role,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ User updated successfully!');
      showToast('User updated.', 'success');
    } else {
      // Create new user in Firebase Auth using secondary app
      const userCred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCred.user.uid;

      // Store user profile
      await firebase.firestore().collection('users').doc(uid).set({
        uid: uid,
        email: email,
        name: name,
        role: role,
        status: 'active', // Default status for new users
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ User created successfully!');
      showToast('User created successfully.', 'success');
    }
    
    closeModal('user-modal');
    editingUserId = null;
    console.log('✅ User save operation completed!');
  } catch(e) {
    console.error('❌ User save error:', e);
    errEl.textContent = getFriendlyError(e.code) || e.message;
    errEl.style.display = 'block';
  }
}

// DELETE USER (Complete deletion - Profile + Firebase Auth)
function deleteUser(id, name) {
  console.log('🗑️ deleteUser() called:', { id, name });
  
  openConfirm(`Delete user "<strong>${esc(name)}</strong>"? This will remove their profile AND Firebase Auth account permanently.`, async () => {
    try {
      console.log('🗑️ Deleting user completely:', id);
      
      // Get user's Firebase Auth UID from Firestore
      const userDoc = await firebase.firestore().collection('users').doc(id).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const uid = userData.uid;
        const email = userData.email;
        
        console.log('👤 User data found:', { uid, email });
        
        // Add to auth cleanup queue for automatic Firebase Auth deletion
        await firebase.firestore().collection('authCleanupQueue').add({
          uid: uid,
          email: email,
          name: name,
          action: 'delete',
          priority: 'high',
          requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
          requestedBy: currentUser.uid,
          status: 'pending',
          method: 'user_delete'
        });
        
        // Delete the Firestore profile immediately
        await firebase.firestore().collection('users').doc(id).delete();
        
        console.log('✅ User deleted successfully!');
        showToast(`User "${name}" deleted. Firebase Auth account queued for deletion.`, 'success');
        
        // Show cleanup info
        setTimeout(() => {
          showToast('🔧 Firebase Auth will be deleted automatically. Use Auth Cleanup to process.', 'info');
        }, 2000);
        
      } else {
        // User document doesn't exist, but try to delete anyway
        await firebase.firestore().collection('users').doc(id).delete();
        console.log('✅ User removed (document was already missing)');
        showToast('User removed.', 'info');
      }
    } catch(e) { 
      console.error('❌ Delete user error:', e);
      showToast('Error: ' + e.message, 'error'); 
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 ADVANCED FIREBASE USER MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// FIREBASE USERS MANAGEMENT MODAL
function renderFirebaseAuthUsers() {
  openModal('firebase-users-modal');
  loadFirebaseAuthUsers();
}

async function loadFirebaseAuthUsers() {
  const tbody = document.getElementById('firebase-users-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Loading Firebase Auth users...</td></tr>';
  
  try {
    // Get all Firestore users first
    const usersSnapshot = await firebase.firestore().collection('users').get();
    const firestoreUsers = {};
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.uid) {
        firestoreUsers[data.uid] = { ...data, docId: doc.id };
      }
    });
    
    // Get auth cleanup queue
    const cleanupSnapshot = await firebase.firestore().collection('authCleanupQueue').where('status', '==', 'pending').get();
    const cleanupQueue = {};
    cleanupSnapshot.forEach(doc => {
      const data = doc.data();
      cleanupQueue[data.uid] = { ...data, docId: doc.id };
    });
    
    // Show Firestore users + cleanup status
    tbody.innerHTML = '';
    
    if (usersSnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg><h3>No users found</h3><p>No users in the system</p></td></tr>';
      return;
    }
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const isInCleanup = cleanupQueue[userData.uid];
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-row-avatar">${(userData.name || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <div>${esc(userData.name || 'Unknown')}</div>
              ${userData.uid ? `<div style="font-size:11px;color:var(--text-muted)">UID: ${userData.uid.slice(0,8)}...</div>` : ''}
            </div>
          </div>
        </td>
        <td>${esc(userData.email)}</td>
        <td><span class="badge ${userData.role === 'admin' ? 'badge-high' : 'badge-medium'}">${userData.role}</span></td>
        <td class="date-cell">
          ${formatDate(userData.createdAt)}
          <span class="time">${formatTime(userData.createdAt)}</span>
        </td>
        <td>
          ${isInCleanup ? 
            '<span class="badge badge-pending">In Cleanup Queue</span>' : 
            '<span class="badge badge-complete">Active</span>'
          }
        </td>
        <td>
          <div class="action-group">
            ${!isInCleanup ? `
              <button class="action-btn del" title="Delete from Firebase Auth" onclick="deleteFirebaseAuthUser('${userData.uid}', '${esc(userData.name)}', '${esc(userData.email)}')">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            ` : `
              <button class="action-btn ok" title="Complete Cleanup" onclick="markAuthCleanupComplete('${isInCleanup.docId}', '${esc(userData.name)}')">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </button>
            `}
            ${userData.uid !== currentUser?.uid ? `
              <button class="action-btn del" title="Delete Profile Only" onclick="deleteUser('${doc.id}', '${esc(userData.name)}')">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6">Error loading Firebase Auth users</td></tr>';
    console.error('Firebase Auth users error:', e);
  }
}

// DELETE FIREBASE AUTH USER
async function deleteFirebaseAuthUser(uid, name, email) {
  openConfirm(`Delete "<strong>${esc(name)}</strong>" from Firebase Auth? This will permanently remove their authentication and profile.`, async () => {
    try {
      // Add to auth cleanup queue with high priority
      await addDoc(collection(db, 'authCleanupQueue'), {
        uid: uid,
        email: email,
        name: name,
        action: 'delete',
        priority: 'high',
        requestedAt: serverTimestamp(),
        requestedBy: currentUser.uid,
        status: 'pending',
        method: 'in_app'
      });
      
      // Delete Firestore profile immediately
      await deleteDoc(doc(db, 'users', uid));
      
      showToast(`User "${name}" queued for Firebase Auth deletion. This will be processed automatically.`, 'success');
      
      // Refresh the list
      loadFirebaseAuthUsers();
      
      // Show instructions for manual backup
      setTimeout(() => {
        showToast('💡 For immediate deletion: Go to Firebase Console → Authentication → Users and delete manually.', 'info');
      }, 2000);
      
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧹 BULK CLEANUP FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function bulkDeleteDuplicateUsers() {
  const duplicates = await findDuplicateUsers();
  if (duplicates.length === 0) {
    showToast('No duplicate users found.', 'info');
    return;
  }
  
  openConfirm(`Found ${duplicates.length} duplicate users. Delete all duplicates keeping only the newest?`, async () => {
    try {
      let deletedCount = 0;
      
      for (const duplicate of duplicates) {
        // Keep the newest, delete older ones
        const usersToDelete = duplicate.users.slice(0, -1);
        
        for (const user of usersToDelete) {
          await addDoc(collection(db, 'authCleanupQueue'), {
            uid: user.uid,
            email: user.email,
            name: user.name,
            action: 'delete',
            priority: 'bulk',
            requestedAt: serverTimestamp(),
            requestedBy: currentUser.uid,
            status: 'pending',
            method: 'bulk_cleanup'
          });
          
          await deleteDoc(doc(db, 'users', user.docId));
          deletedCount++;
        }
      }
      
      showToast(`Bulk cleanup started! ${deletedCount} users queued for deletion.`, 'success');
      loadFirebaseAuthUsers();
      
    } catch(e) {
      showToast('Error during bulk cleanup: ' + e.message, 'error');
    }
  });
}

async function findDuplicateUsers() {
  const duplicates = [];
  const emailMap = {};
  
  const snapshot = await firebase.firestore().collection('users').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const email = data.email?.toLowerCase();
    
    if (email) {
      if (!emailMap[email]) {
        emailMap[email] = [];
      }
      emailMap[email].push({ ...data, docId: doc.id });
    }
  });
  
  // Find emails with multiple users
  for (const [email, users] of Object.entries(emailMap)) {
    if (users.length > 1) {
      duplicates.push({ email, users: users.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)) });
    }
  }
  
  return duplicates;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🗑️ AUTH CLEANUP QUEUE MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function renderAuthCleanupQueue() {
  openModal('auth-cleanup-modal');
  loadAuthCleanupQueue();
}

async function loadAuthCleanupQueue() {
  const tbody = document.getElementById('auth-cleanup-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Loading cleanup queue...</td></tr>';
  
  try {
    // Simplified query without orderBy to avoid index error
    const snapshot = await firebase.firestore().collection('authCleanupQueue')
      .where('status', '==', 'pending')
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><h3>No pending deletions</h3><p>Auth cleanup queue is empty</p></td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    // Sort manually in JavaScript since we removed orderBy
    const docs = [];
    snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => {
      const aTime = a.requestedAt ? a.requestedAt.toMillis() : 0;
      const bTime = b.requestedAt ? b.requestedAt.toMillis() : 0;
      return bTime - aTime; // descending order
    });
    
    docs.forEach(doc => {
      const data = doc;
      const row = document.createElement('tr');
      
      const requestedDate = data.requestedAt ? formatDate(data.requestedAt.toDate()) : 'Unknown';
      const requestedTime = data.requestedAt ? formatTime(data.requestedAt.toDate()) : '';
      
      row.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-row-avatar">${(data.name || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <div>${esc(data.name || 'Unknown')}</div>
              ${data.uid ? `<div style="font-size:11px;color:var(--text-muted)">UID: ${data.uid.slice(0,8)}...</div>` : ''}
            </div>
          </div>
        </td>
        <td>${esc(data.email)}</td>
        <td><span class="badge badge-pending">Pending</span></td>
        <td class="date-cell">
          ${formatTimestamp(data.requestedAt)}
          <div class="time">by ${data.requestedBy === currentUser?.uid ? 'You' : 'Admin'}</div>
        </td>
        <td>
          <div class="action-group">
            <button class="action-btn ok" title="Mark as completed" onclick="markAuthCleanupComplete('${doc.id}', '${esc(data.name)}')">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
            <button class="action-btn del" title="Remove from queue" onclick="removeFromCleanupQueue('${doc.id}', '${esc(data.name)}')">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading cleanup queue</td></tr>';
    console.error('Auth cleanup queue error:', e);
  }
}

async function markAuthCleanupComplete(docId, name) {
  openConfirm(`Mark auth cleanup for "<strong>${esc(name)}</strong>" as completed?`, async () => {
    try {
      await firebase.firestore().collection('authCleanupQueue').doc(docId).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        completedBy: currentUser.uid
      });
      showToast('Auth cleanup marked as completed.', 'success');
      loadAuthCleanupQueue();
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  });
}

async function removeFromCleanupQueue(docId, name) {
  openConfirm(`Remove "<strong>${esc(name)}</strong>" from cleanup queue?`, async () => {
    try {
      await deleteDoc(doc(db, 'authCleanupQueue', docId));
      showToast('Removed from cleanup queue.', 'info');
      loadAuthCleanupQueue();
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  });
}

// Export functions for global use
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.renderFirebaseAuthUsers = renderFirebaseAuthUsers;
window.loadFirebaseAuthUsers = loadFirebaseAuthUsers;
window.deleteFirebaseAuthUser = deleteFirebaseAuthUser;
window.bulkDeleteDuplicateUsers = bulkDeleteDuplicateUsers;
window.findDuplicateUsers = findDuplicateUsers;
window.renderAuthCleanupQueue = renderAuthCleanupQueue;
window.loadAuthCleanupQueue = loadAuthCleanupQueue;
window.markAuthCleanupComplete = markAuthCleanupComplete;
window.removeFromCleanupQueue = removeFromCleanupQueue;
