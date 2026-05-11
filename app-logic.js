// ═══════════════════════════════════════════
// AQE QC SYSTEM - APP LOGIC & BUSINESS FUNCTIONS
// ═══════════════════════════════════════════

// Import Firebase functions
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 TASK MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function saveTask() {
  console.log('🔧 saveTask() called in index.html');
  
  const title       = document.getElementById('t-title').value.trim();
  const desc        = document.getElementById('t-desc').value.trim();
  const priority    = document.getElementById('t-priority').value;
  const status      = document.getElementById('t-status').value;
  const assignedTo  = document.getElementById('t-assignee').value;
  const due         = document.getElementById('t-due').value;
  const time        = document.getElementById('t-time').value;
  const projectSite = document.getElementById('t-project-site').value.trim();
  const projectZoho = document.getElementById('t-project-zoho').value.trim();
  const notes       = document.getElementById('t-notes').value.trim();
  const taskType    = document.getElementById('t-type')?.value || '';
  const userName    = document.getElementById('t-user-name')?.value || '';
  const errEl       = document.getElementById('task-modal-error');
  errEl.style.display = 'none';

  console.log('📝 Task data:', { title, status, priority });

  if (!title) {
    errEl.textContent = 'Task title is required.';
    errEl.style.display = 'block'; return;
  }

  if (!priority) {
    errEl.textContent = 'Priority is required.';
    errEl.style.display = 'block'; return;
  }

  if (!status) {
    errEl.textContent = 'Status is required.';
    errEl.style.display = 'block'; return;
  }

  if (!taskType) {
    errEl.textContent = 'Task Type is required.';
    errEl.style.display = 'block'; return;
  }

  if (!userName) {
    errEl.textContent = 'Task Allocated By is required.';
    errEl.style.display = 'block'; return;
  }

  const projectEl = document.getElementById('t-project');
  const project = projectEl ? projectEl.value : '';
  const taskTime = time ? new Date(time) : null;
  const dueDate = due ? firebase.firestore.Timestamp.fromDate(new Date(due)) : null;

  let assignedToUid = assignedTo;
  let assignedToName = assignedTo;

  // For editing, preserve the original assignment unless explicitly changed
  if (editingTaskId) {
    const originalTask = allTasks.find(t => t.id === editingTaskId);
    if (originalTask && !assignedTo) {
      // Keep original assignment if not changed
      assignedToUid = originalTask.assignedToUid;
      assignedToName = originalTask.assignedToName;
    } else if (assignedTo && allUsers.length) {
      // Only update if explicitly changed
      const user = allUsers.find(u => u.id === assignedTo);
      if (user) {
        assignedToUid = user.id;
        assignedToName = user.name;
      } else {
        // Try to find by name if UID not found
        const userByName = allUsers.find(u => u.name === assignedTo);
        if (userByName) {
          assignedToUid = userByName.id;
          assignedToName = userByName.name;
        }
      }
    }
  } else {
    // For new tasks, assign to current user if not super admin
    if (!isSuperAdmin) {
      assignedToUid = currentUser.uid;
      assignedToName = currentProfile.name;
    } else if (assignedTo && allUsers.length) {
      // Super admin can assign to anyone
      const user = allUsers.find(u => u.id === assignedTo);
      if (user) {
        assignedToUid = user.id;
        assignedToName = user.name;
      } else {
        // Try to find by name if UID not found
        const userByName = allUsers.find(u => u.name === assignedTo);
        if (userByName) {
          assignedToUid = userByName.id;
          assignedToName = userByName.name;
        }
      }
    }
  }

  const wasComplete = editingTaskId
    ? allTasks.find(t => t.id === editingTaskId)?.status === 'complete'
    : false;

  const data = {
    title: title,
    description: desc,
    priority: priority,
    projectSiteName: projectSite,
    projectZohoUrl: projectZoho,
    taskTime: taskTime,
    assignedToUid: assignedToUid,
    assignedToName: assignedToName,
    dueDate: dueDate,
    taskType: taskType,
    userName: userName,
    notes: notes
  };

  try {
    if (editingTaskId) {
      // Check if status is being changed to complete
      const isBecomingComplete = !wasComplete && status === 'complete';
      
      if (isBecomingComplete) {
        // Open completion modal instead of direct save
        closeModal('task-modal'); // Close edit modal first
        openTaskCompletionModal(editingTaskId);
        return;
      }
      
      // Get original task for comparison
      const originalTask = allTasks.find(t => t.id === editingTaskId);
      
      // Track all modifications
      const modifications = [];
      const currentTime = new Date();
      
      // Check for status change
      if (originalTask && originalTask.status !== status) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'status_change',
          oldValue: originalTask.status,
          newValue: status,
          description: `Status changed from ${originalTask.status} to ${status}`
        });

        // If status is changing from complete to something else, remove Project Details entry
        if (originalTask.status === 'complete' && status !== 'complete') {
          await db.collection('manageExcel')
            .where('taskId', '==', editingTaskId)
            .get()
            .then((querySnapshot) => {
              querySnapshot.forEach((doc) => {
                doc.ref.delete();
                console.log('🗑️ Project Details entry removed for task:', editingTaskId);
              });
            });
        }
      }
      
      // Check for priority change
      if (originalTask && originalTask.priority !== priority) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'priority_change',
          oldValue: originalTask.priority,
          newValue: priority,
          description: `Priority changed from ${originalTask.priority} to ${priority}`
        });
      }
      
      // Check for title change
      if (originalTask && originalTask.title !== title) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'title_change',
          oldValue: originalTask.title,
          newValue: title,
          description: `Title changed from "${originalTask.title}" to "${title}"`
        });
      }
      
      // Check for description change
      const originalDesc = originalTask ? originalTask.description || '' : '';
      if (originalDesc !== desc) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'description_change',
          oldValue: originalDesc,
          newValue: desc,
          description: 'Description was updated'
        });
      }
      
      // Check for assignment change
      if (originalTask && originalTask.assignedToUid !== assignedToUid) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'assignment_change',
          oldValue: originalTask.assignedToName || 'Unassigned',
          newValue: assignedToName || 'Unassigned',
          description: `Assignment changed from ${originalTask.assignedToName || 'Unassigned'} to ${assignedToName || 'Unassigned'}`
        });
      }
      
      // Check for due date change
      let originalDue = null;
      if (originalTask && originalTask.dueDate) {
        originalDue = originalTask.dueDate.toDate ? originalTask.dueDate.toDate() : new Date(originalTask.dueDate);
      }
      const newDue = dueDate ? dueDate.toDate ? dueDate.toDate() : new Date(dueDate) : null;
      
      if ((originalDue && !newDue) || (!originalDue && newDue) || (originalDue && newDue && originalDue.getTime() !== newDue.getTime())) {
        modifications.push({
          timestamp: currentTime,
          modifiedBy: currentUser.uid,
          modifiedByName: currentProfile.name,
          type: 'due_date_change',
          oldValue: originalDue ? formatDate(originalDue) : 'No due date',
          newValue: newDue ? formatDate(newDue) : 'No due date',
          description: `Due date changed from ${originalDue ? formatDate(originalDue) : 'No due date'} to ${newDue ? formatDate(newDue) : 'No due date'}`
        });
      }
      
      data.status = status;
      
      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Add modification history if there are changes
      if (modifications.length > 0) {
        // Get existing history and add new modifications
        const existingHistory = originalTask.modificationHistory || [];
        updateData.modificationHistory = [...existingHistory, ...modifications];
      }
      
      await firebase.firestore().collection('tasks').doc(editingTaskId).update(updateData);
      showToast('Task updated.', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdByUid = currentUser.uid;
      data.createdByName = currentProfile.name;
      data.status = status;
      await firebase.firestore().collection('tasks').add(data);
      showToast('Task created.', 'success');
    }
    
    closeModal('task-modal');
    editingTaskId = null;
    console.log('✅ Task saved successfully!');
  } catch(e) {
    console.error('❌ Task save error:', e);
    errEl.textContent = 'Error saving task: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function deleteTask(id, title) {
  console.log('🗑️ deleteTask() called with id:', id, 'title:', title);

  openConfirm(`Delete task "<strong>${esc(title)}</strong>"?`, async () => {
    console.log('🗑️ Delete confirmed for task:', id);
    try {
      console.log('🗑️ Deleting task:', id);
      await firebase.firestore().collection('tasks').doc(id).delete();
      console.log('✅ Task deleted successfully!');
      showToast('Task deleted.', 'success');
      
      // Re-render tasks to ensure buttons work properly
      setTimeout(() => {
        console.log('🔄 Re-rendering tasks after deletion');
        renderTasks();
      }, 500);
    } catch(e) {
      console.error('❌ Task delete error:', e);
      showToast('Error: ' + e.message, 'error');
    }
  });
}

function editTask(id) {
  console.log('✏️ editTask() called with id:', id);
  openTaskModal(id);
}

async function changeTaskStatus(id, newStatus) {
  console.log('🔄 changeTaskStatus() called in index.html:', { id, newStatus });

  try {
    // Get the task to check if it's being changed from complete
    const task = allTasks.find(t => t.id === id);
    if (!task) {
      console.error('❌ Task not found for status change');
      return;
    }

    // If task is being changed from complete to something else, remove Project Details entry
    if (task.status === 'complete' && newStatus !== 'complete') {
      // Find and delete Project Details entry linked to this task
      await db.collection('manageExcel')
        .where('taskId', '==', id)
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            doc.ref.delete();
            console.log('🗑️ Project Details entry removed for task:', id);
          });
        });
    }

    await firebase.firestore().collection('tasks').doc(id).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Task status updated successfully!');
    showToast(`Task marked as ${newStatus}.`, 'success');
  } catch(e) {
    console.error('❌ Task status update error:', e);
    showToast('Error: ' + e.message, 'error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📁 PROJECT MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function saveProject() {
  const name        = document.getElementById('p-name').value.trim();
  const zoho        = document.getElementById('p-zoho').value.trim();
  const notes       = document.getElementById('p-notes').value.trim();
  const status      = document.getElementById('p-status').value;
  const bugsFound   = document.getElementById('p-bugs-found').value;
  const bugsDone    = document.getElementById('p-bugs-done').value;
  const ignored     = document.getElementById('p-ignored').value;
  const live        = document.getElementById('p-live').value;
  const checklistUrl = document.getElementById('p-checklist-url').value.trim();
  const preQaDone   = document.getElementById('p-pre-qa-done').checked;
  const errEl       = document.getElementById('project-modal-error');
  errEl.style.display = 'none';

  if (!name) {
    errEl.textContent = 'Project name is required.';
    errEl.style.display = 'block'; return;
  }

  if (bugsFound === '' || bugsDone === '') {
    errEl.textContent = '🐛 Bugs Found and ✅ Bugs Done are required fields.';
    errEl.style.display = 'block'; return;
  }

  if (parseInt(bugsFound) < 0 || parseInt(bugsDone) < 0) {
    errEl.textContent = 'Bug counts cannot be negative.';
    errEl.style.display = 'block'; return;
  }

  const data = {
    projectName: name,
    zohoLink: zoho,
    notes,
    status,
    bugsFound: parseInt(bugsFound) || 0,
    bugsDone: parseInt(bugsDone) || 0,
    ignored: parseInt(ignored) || 0,
    asPerLive: parseInt(live) || 0,
    checklistUrl,
    preQaDone,
    updatedAt: serverTimestamp(),
    importedByUid: currentUser.uid,
    importedByName: currentProfile.name
  };

  try {
    if (editingProjectId) {
      await db.collection('projects').doc(editingProjectId).update(data);
      showToast('Project updated.', 'success');
    } else {
      data.importedAt = serverTimestamp();
      await db.collection('projects').add(data);
      showToast('Project added.', 'success');
    }
    closeModal('project-modal');
    editingProjectId = null;
  } catch(e) {
    errEl.textContent = 'Error saving project: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function deleteProject(id, name) {
  console.log('🗑️ deleteProject() called with id:', id, 'name:', name);
  openConfirm(`Delete project "<strong>${esc(name)}</strong>"?`, async () => {
    console.log('🗑️ Delete confirmed for project:', id);
    try {
      await db.collection('projects').doc(id).delete();
      showToast('Project deleted.', 'success');
      
      // Re-render projects to ensure buttons work properly
      setTimeout(() => {
        console.log('🔄 Re-rendering projects after deletion');
        renderProjects();
      }, 500);
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  });
}

function editProject(id) { openProjectModal(id); }

async function markProjectComplete(id) {
  try {
    await db.collection('projects').doc(id).update({
      status: 'complete',
      completedAt: serverTimestamp()
    });
    showToast('Project marked as complete.', 'success');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 EXCEL/COMPLETION MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function saveManualEntry() {
  const taskName    = document.getElementById('e-task').value.trim();
  const projectName = document.getElementById('e-project').value.trim();
  const version     = document.getElementById('e-version').value.trim();
  const bugsFound   = document.getElementById('e-found').value;
  const bugsDone    = document.getElementById('e-done').value;
  const ignored     = document.getElementById('e-ignored').value;
  const asPerLive   = document.getElementById('e-live').value;
  const notes       = document.getElementById('e-notes').value.trim();
  const errEl       = document.getElementById('excel-modal-error');
  errEl.style.display = 'none';

  if (!taskName) {
    errEl.textContent = 'Task name is required.';
    errEl.style.display = 'block'; return;
  }

  // Check if we're editing an existing entry
  const modal = document.getElementById('excel-modal');
  const editingId = modal ? modal.dataset.editingId : null;

  const data = {
    taskName,
    projectName,
    version,
    bugsFound: bugsFound ? parseInt(bugsFound) : null,
    bugsDone: bugsDone ? parseInt(bugsDone) : null,
    ignored: ignored ? parseInt(ignored) : null,
    asPerLive: asPerLive ? parseInt(asPerLive) : null,
    notes,
    completedAt: serverTimestamp(),
    completedByUid: currentUser.uid,
    completedByName: currentProfile.name,
    addedMethod: 'manual',
    addedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      // Update existing entry
      await db.collection('manageExcel').doc(editingId).update(data);
      showToast('Completion entry updated.', 'success');
      delete modal.dataset.editingId; // Clear editing ID
    } else {
      // Create new entry
      await addDoc(collection(db, 'manageExcel'), data);
      showToast('Completion entry added.', 'success');
    }
    closeModal('excel-modal');
  } catch(e) {
    errEl.textContent = 'Error saving entry: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function deleteExcelEntry(id) {
  openConfirm('Delete this completion entry?', async () => {
    try {
      await db.collection('manageExcel').doc(id).delete();
      showToast('Entry deleted.', 'success');
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  });
}

async function viewExcelEntry(id) {
  const entry = allExcel.find(e => e.id === id);
  if (!entry) {
    showToast('Entry not found', 'error');
    return;
  }

  const modal = document.getElementById('excel-modal');
  if (!modal) {
    showToast('Modal not found', 'error');
    return;
  }

  // Clear editing ID
  delete modal.dataset.editingId;

  // Populate modal with entry details
  document.getElementById('e-task').value = entry.taskName || '';
  document.getElementById('e-project').value = entry.projectName || '';
  document.getElementById('e-version').value = entry.version || '';
  document.getElementById('e-found').value = entry.bugsFound || 0;
  document.getElementById('e-done').value = entry.bugsDone || 0;
  document.getElementById('e-ignored').value = entry.ignored || 0;
  document.getElementById('e-live').value = entry.asPerLive || 0;
  document.getElementById('e-notes').value = entry.notes || '';

  // Make fields readonly for view mode
  document.getElementById('e-task').readOnly = true;
  document.getElementById('e-project').readOnly = true;
  document.getElementById('e-version').readOnly = true;
  document.getElementById('e-found').readOnly = true;
  document.getElementById('e-done').readOnly = true;
  document.getElementById('e-ignored').readOnly = true;
  document.getElementById('e-live').readOnly = true;
  document.getElementById('e-notes').readOnly = true;

  // Hide save button
  const saveBtn = document.querySelector('#excel-modal .btn-primary');
  if (saveBtn) saveBtn.style.display = 'none';

  // Update modal title
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = 'View Completion Entry';

  // Show modal using proper class
  modal.classList.add('open');
  modal.style.display = 'flex';
}

async function editExcelEntry(id) {
  const entry = allExcel.find(e => e.id === id);
  if (!entry) {
    showToast('Entry not found', 'error');
    return;
  }

  const modal = document.getElementById('excel-modal');
  if (!modal) {
    showToast('Modal not found', 'error');
    return;
  }

  // Store the editing entry ID
  modal.dataset.editingId = id;

  // Populate modal with entry details
  document.getElementById('e-task').value = entry.taskName || '';
  document.getElementById('e-project').value = entry.projectName || '';
  document.getElementById('e-version').value = entry.version || '';
  document.getElementById('e-found').value = entry.bugsFound || 0;
  document.getElementById('e-done').value = entry.bugsDone || 0;
  document.getElementById('e-ignored').value = entry.ignored || 0;
  document.getElementById('e-live').value = entry.asPerLive || 0;
  document.getElementById('e-notes').value = entry.notes || '';

  // Make fields editable
  document.getElementById('e-task').readOnly = false;
  document.getElementById('e-project').readOnly = false;
  document.getElementById('e-version').readOnly = false;
  document.getElementById('e-found').readOnly = false;
  document.getElementById('e-done').readOnly = false;
  document.getElementById('e-ignored').readOnly = false;
  document.getElementById('e-live').readOnly = false;
  document.getElementById('e-notes').readOnly = false;

  // Show save button
  const saveBtn = document.querySelector('#excel-modal .btn-primary');
  if (saveBtn) saveBtn.style.display = 'inline-flex';

  // Update modal title
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = 'Edit Completion Entry';

  // Show modal using proper class
  modal.classList.add('open');
  modal.style.display = 'flex';
}

async function viewProjectDetails(id) {
  const project = allProjects.find(p => p.id === id);
  if (!project) {
    showToast('Project not found', 'error');
    return;
  }

  // Open project modal in view mode
  openProjectModal(id, true); // true for view mode
}

window.viewExcelEntry = viewExcelEntry;
window.editExcelEntry = editExcelEntry;
window.viewProjectDetails = viewProjectDetails;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 EXCEL IMPORT/EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function importExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (!jsonData.length) {
        showToast('Excel file is empty.', 'error');
        return;
      }

      let added = 0;
      for (const row of jsonData) {
        if (row['Task Name']) {
          const entry = {
            taskName: row['Task Name'] || '',
            projectName: row['Project Name'] || '',
            version: row['Version'] || '',
            bugsFound: row['Bugs Found'] ? parseInt(row['Bugs Found']) : null,
            bugsDone: row['Bugs Done'] ? parseInt(row['Bugs Done']) : null,
            ignored: row['Ignored'] ? parseInt(row['Ignored']) : null,
            asPerLive: row['As Per Live'] ? parseInt(row['As Per Live']) : null,
            notes: row['Notes'] || '',
            completedAt: row['Completed At'] ? Timestamp.fromDate(new Date(row['Completed At'])) : serverTimestamp(),
            completedByUid: currentUser.uid,
            completedByName: currentProfile.name,
            addedMethod: 'auto',
            addedAt: serverTimestamp()
          };
          await addDoc(collection(db, 'manageExcel'), entry);
          added++;
        }
      }

      showToast(`Successfully imported ${added} entries.`, 'success');
      renderExcel();
    } catch(err) {
      console.error('Import error:', err);
      showToast('Error importing Excel: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function exportManageExcel() {
  if (!allExcel.length) {
    showToast('No data to export.', 'error');
    return;
  }

  const exportData = allExcel.map(e => ({
    'Task / Project':  e.taskName || '',
    'Project Name':    e.projectName || '',
    'Completed By':    e.completedByName || '',
    'Completed At':    formatDateFull(e.completedAt),
    'Added At':        formatDateFull(e.addedAt),
    'Method':          e.addedMethod || 'auto',
    'Version':         e.version || '',
    'Bugs Found':      e.bugsFound || '',
    'Bugs Done':       e.bugsDone || '',
    'Ignored':         e.ignored || '',
    'As Per Live':     e.asPerLive || '',
    'Notes':           e.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Completions');
  XLSX.writeFile(wb, `AQE_Completions_${formatDateFull(serverTimestamp()).replace(/[:\s/]/g, '_')}.xlsx`);
  showToast('Excel exported successfully.', 'success');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 DASHBOARD & UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function renderRecentCompletions() {
  const tbody = document.getElementById('recent-completions-body');
  if (!tbody) return;

  const recent = allExcel.slice(0, 5);
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state" style="padding:24px">No recent completions</div></td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(e => `
    <tr>
      <td><div class="task-title-cell">${esc(e.taskName || '—')}</div></td>
      <td><span style="font-weight:500;">${esc(e.completedByName || '—')}</span></td>
      <td class="date-cell">${formatDate(e.completedAt)}<span class="time">${formatTime(e.completedAt)}</span></td>
    </tr>
  `).join('');
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  const el = document.getElementById('greeting');
  if (el) el.textContent = `${greeting}, ${currentProfile?.name || 'User'}!`;
}

function startClock() {
  const updateTime = () => {
    const now = new Date();
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');

    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  updateTime();
  setInterval(updateTime, 1000);
}

function updateNavBadge() {
  const badge = document.querySelector('.nav-item[onclick*="tasks"] .nav-badge');
  if (badge) {
    const total = allTasks.length;
    badge.textContent = total;
    badge.style.display = total > 0 ? 'block' : 'none';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎛️ FILTER & SEARCH FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setTaskFilter(filter) {
  taskFilter = filter;
  tasksCurrentPage = 1; // Reset to first page
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[onclick="setTaskFilter('${filter}')"]`)?.classList.add('active');
  renderTasks();
}

// Task completion with time tracking
let completingTaskId = null;

function openTaskCompletionModal(taskId) {
  completingTaskId = taskId;
  const modal = document.getElementById('task-completion-modal');
  const datetimeInput = document.getElementById('task-completion-datetime');
  const notesInput = document.getElementById('task-completion-notes');
  const errorEl = document.getElementById('task-completion-error');
  
  // Reset form
  notesInput.value = '';
  errorEl.style.display = 'none';
  
  // Set default to current datetime (always fresh)
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  datetimeInput.value = localDateTime;
  
  modal.style.display = 'flex';
  modal.classList.add('open');
}

function closeTaskCompletionModal() {
  const modal = document.getElementById('task-completion-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
    completingTaskId = null;
  }
}

async function completeTaskWithTime() {
  const datetimeInput = document.getElementById('task-completion-datetime');
  const notesInput = document.getElementById('task-completion-notes');
  const errorEl = document.getElementById('task-completion-error');
  
  if (!completingTaskId) {
    showToast('No task selected for completion.', 'error');
    return;
  }
  
  const completionDateTime = datetimeInput.value;
  const notes = notesInput.value.trim();
  
  if (!completionDateTime) {
    errorEl.textContent = 'Please select completion date and time.';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    const task = allTasks.find(t => t.id === completingTaskId);
    if (!task) {
      showToast('Task not found.', 'error');
      return;
    }
    
    // Calculate time spent
    const createdAt = task.createdAt?.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
    const completedAt = new Date(completionDateTime);
    const timeSpentMs = completedAt - createdAt;
    const timeSpentHours = Math.round(timeSpentMs / (1000 * 60 * 60) * 100) / 100;
    
    // Update task with completion data
    await firebase.firestore().collection('tasks').doc(completingTaskId).update({
      status: 'complete',
      completedAt: firebase.firestore.Timestamp.fromDate(completedAt),
      completedBy: currentUser.uid,
      completedByName: currentProfile.name,
      completionNotes: notes,
      timeSpentHours: timeSpentHours,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast(`Task completed! Time spent: ${timeSpentHours} hours`, 'success');
    
    // Close modal properly
    const modal = document.getElementById('task-completion-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
    
    completingTaskId = null;
    
  } catch(e) {
    console.error('❌ Task completion error:', e);
    errorEl.textContent = 'Error completing task. Please try again.';
    errorEl.style.display = 'block';
  }
}

function setPriorityFilter(priority) {
  priorityFilter = priority;
  tasksCurrentPage = 1; // Reset to first page
  renderTasks();
}

function setProjectFilter(filter) {
  projectFilter = filter;
  projectsCurrentPage = 1; // Reset to first page
  renderProjects();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 DRAG & DROP FOR EXCEL IMPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setupDragAndDrop() {
  const importZone = document.getElementById('import-zone');
  if (!importZone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    importZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    importZone.addEventListener(eventName, () => importZone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    importZone.addEventListener(eventName, () => importZone.classList.remove('dragover'), false);
  });

  importZone.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) {
    const event = { target: { files: [files[0]] } };
    importExcel(event);
  }
}

// Export functions for global use
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.changeTaskStatus = changeTaskStatus;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.editProject = editProject;
window.markProjectComplete = markProjectComplete;
window.saveManualEntry = saveManualEntry;
window.deleteExcelEntry = deleteExcelEntry;
window.importExcel = importExcel;
window.exportManageExcel = exportManageExcel;
window.renderRecentCompletions = renderRecentCompletions;
window.updateGreeting = updateGreeting;
window.startClock = startClock;
window.updateNavBadge = updateNavBadge;
window.setTaskFilter = setTaskFilter;
window.setPriorityFilter = setPriorityFilter;
window.setProjectFilter = setProjectFilter;
window.setupDragAndDrop = setupDragAndDrop;
window.openTaskCompletionModal = openTaskCompletionModal;
window.completeTaskWithTime = completeTaskWithTime;
window.closeTaskCompletionModal = closeTaskCompletionModal;
window.handleDrop = handleDrop;
