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
    // For new tasks, allow Team Lead to assign to self or their employees; employees default to self.
    if (currentProfile?.role === 'tl' && assignedTo && allUsers.length) {
      const assignee = allUsers.find(u => u.id === assignedTo || u.name === assignedTo);
      const teamUserIds = allUsers.filter(u => u.managerUid === currentProfile.id).map(u => u.id);
      const permittedIds = new Set([currentUser.uid, ...teamUserIds]);
      if (assignee && permittedIds.has(assignee.id)) {
        assignedToUid = assignee.id;
        assignedToName = assignee.name;
      } else {
        assignedToUid = currentUser.uid;
        assignedToName = currentProfile.name;
      }
    } else if (!isSuperAdmin) {
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
    notes: notes,
    checklistUrl: document.getElementById('t-checklist-url')?.value.trim() || '',
    preQaDone: document.getElementById('t-pre-qa-done')?.checked || false
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
      const newTaskRef = await firebase.firestore().collection('tasks').add(data);
      showToast('Task created.', 'success');

      // Sheet Tracker entry on new task creation
      try {
        await firebase.firestore().collection('sheetTracker').add({
          taskName: data.title,
          projectName: data.projectSiteName || '',
          checklistUrl: data.checklistUrl || null,
          zohoUrl: data.projectZohoUrl || null,
          taskId: newTaskRef.id,
          createdByUid: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch(sheetErr) {
        console.error('Sheet Tracker entry error:', sheetErr);
      }
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
  openConfirm(`Delete task "<strong>${esc(title)}</strong>"?`, async () => {
    try {
      // Delete task
      await firebase.firestore().collection('tasks').doc(id).delete();

      // Delete linked manageExcel entries
      const excelSnap = await firebase.firestore().collection('manageExcel').where('taskId', '==', id).get();
      excelSnap.forEach(doc => doc.ref.delete());

      // Delete linked Sheet Tracker entries
      const stSnap = await firebase.firestore().collection('sheetTracker').where('taskId', '==', id).get();
      stSnap.forEach(doc => doc.ref.delete());

      showToast('Task deleted.', 'success');
      setTimeout(() => renderTasks(), 500);
    } catch(e) {
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

  const isNewProject = !editingProjectId;
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

    // Sheet Tracker entry on new project creation
    if (isNewProject) {
      try {
        await firebase.firestore().collection('sheetTracker').add({
          taskName: name,
          projectName: name,
          checklistUrl: checklistUrl || null,
          zohoUrl: zoho || null,
          taskId: null,
          createdByUid: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch(sheetErr) {
        console.error('Sheet Tracker entry error:', sheetErr);
      }
    }

    // Update navigation badge after project is saved
    if (typeof updateNavBadge === 'function') {
      updateNavBadge();
      console.log('🔄 updateNavBadge called after project save');
    }
  } catch(e) {
    errEl.textContent = 'Error saving project: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function deleteProject(id, name) {
  openConfirm(`Delete project "<strong>${esc(name)}</strong>"?`, async () => {
    try {
      await db.collection('projects').doc(id).delete();

      // Delete linked Sheet Tracker entries by projectName where taskId is null or missing
      const stSnap = await firebase.firestore().collection('sheetTracker')
        .where('projectName', '==', name).get();
      stSnap.forEach(doc => {
        const data = doc.data();
        if (!data.taskId) doc.ref.delete();
      });

      showToast('Project deleted.', 'success');
      setTimeout(() => renderProjects(), 500);
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
      await db.collection('manageExcel').add(data);
      showToast('Completion entry added.', 'success');
      
      // Also create sheet tracker entry
      try {
        await firebase.firestore().collection('sheetTracker').add({
          taskName,
          projectName,
          checklistUrl: null,
          zohoUrl: null,
          taskId: null,
          createdByUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('📊 Sheet tracker entry created for manual completion');
      } catch(sheetError) {
        console.error('Error creating sheet tracker entry:', sheetError);
        // Don't show error to user as the main operation succeeded
      }
    }
    closeModal('excel-modal');
  } catch(e) {
    errEl.textContent = 'Error saving entry: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function deleteExcelEntry(id) {
  // Get the entry first to find its taskId
  const entry = allExcel.find(e => e.id === id);

  openConfirm('Delete this completion entry?', async () => {
    try {
      await db.collection('manageExcel').doc(id).delete();

      // Delete linked Sheet Tracker entries using the entry's taskId field
      if (entry && entry.taskId) {
        const stSnap = await firebase.firestore().collection('sheetTracker').where('taskId', '==', entry.taskId).get();
        stSnap.forEach(doc => doc.ref.delete());
      } else if (entry && entry.taskName) {
        // Fallback: match by taskName + projectName for manual entries
        const stSnap = await firebase.firestore().collection('sheetTracker')
          .where('taskName', '==', entry.taskName)
          .where('projectName', '==', entry.projectName || '')
          .get();
        stSnap.forEach(doc => doc.ref.delete());
      }

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
          console.log('🔍 Import Excel - processing row:', row);
console.log('🔍 Import Excel - checklistUrl field:', row['Checklist URL']);
console.log('🔍 Import Excel - preQaDone field:', row['Pre QC Done']);

const entry = {
            taskName: row['Task Name'] || '',
            projectName: row['Project Name'] || '',
            version: row['Version'] || '',
            bugsFound: row['Bugs Found'] ? parseInt(row['Bugs Found']) : null,
            bugsDone: row['Bugs Done'] ? parseInt(row['Bugs Done']) : null,
            ignored: row['Ignored'] ? parseInt(row['Ignored']) : null,
            asPerLive: row['As Per Live'] ? parseInt(row['As Per Live']) : null,
            notes: row['Notes'] || '',
            checklistUrl: row['Checklist URL'] || '',
            preQaDone: row['Pre QC Done'] === 'Yes' ? true : (row['Pre QC Done'] === true ? true : false),
            completedAt: row['Completed At'] ? Timestamp.fromDate(new Date(row['Completed At'])) : serverTimestamp(),
            completedByUid: currentUser.uid,
            completedByName: currentProfile.name,
            addedMethod: 'auto',
            addedAt: serverTimestamp()
          };

console.log('🔍 Import Excel - created entry:', entry);
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

  // Show verification bar
  showToast(`Exporting ${allExcel.length} entries with field verification...`, 'info');
  
  // Debug: Check allExcel array contents for duplicates
  if (Array.isArray(allExcel)) {
    console.log('🔍 allExcel array contents:');
    console.log('🔍 allExcel type:', typeof allExcel, 'length:', allExcel.length);
    console.log('🔍 allExcel value:', JSON.stringify(allExcel, null, 2));
    
    if (allExcel.length === 0) {
      console.log('🔍 allExcel is empty array - should show count 0');
    }
    
    // Check first entry for field verification
    if (allExcel.length > 0) {
      const firstEntry = allExcel[0];
      console.log('🔍 First entry analysis:');
      console.log('  - Has checklistUrl:', !!firstEntry.checklistUrl);
      console.log('  - Has preQaDone:', !!firstEntry.preQaDone);
      console.log('  - First entry keys:', Object.keys(firstEntry));
      console.log('  - Checklist URL value:', firstEntry.checklistUrl);
      console.log('  - Pre QC Done value:', firstEntry.preQaDone);
    }
    
    allExcel.forEach((entry, index) => {
      console.log(`  [${index}] ID: ${entry.id}, Task: ${entry.taskName || 'N/A'}, Project: ${entry.projectName || 'N/A'}, CompletedBy: ${entry.completedByName || 'N/A'}`);
    });
    console.log(`🔍 Total unique IDs: ${[...new Set(allExcel.map(e => e.id))].size}`);
  } else {
    console.log('🔍 allExcel is not an array:', allExcel, 'type:', typeof allExcel);
  }

  // Debug: Check allExcel array contents for duplicates
  if (Array.isArray(allExcel)) {
    console.log('🔍 allExcel array contents:');
    console.log('🔍 allExcel type:', typeof allExcel, 'length:', allExcel.length);
    console.log('🔍 allExcel value:', JSON.stringify(allExcel, null, 2));
    
    if (allExcel.length === 0) {
      console.log('🔍 allExcel is empty array - should show count 0');
    }
    
    allExcel.forEach((entry, index) => {
      console.log(`  [${index}] ID: ${entry.id}, Task: ${entry.taskName || 'N/A'}, Project: ${entry.projectName || 'N/A'}, CompletedBy: ${entry.completedByName || 'N/A'}`);
    });
    console.log(`🔍 Total unique IDs: ${[...new Set(allExcel.map(e => e.id))].size}`);
  } else {
    console.log('🔍 allExcel is not an array:', allExcel, 'type:', typeof allExcel);
  }

  console.log('🔍 Export Excel - allExcel array:', allExcel);
console.log('🔍 Export Excel - first entry:', allExcel[0]);
console.log('🔍 Export Excel - checklistUrl field:', allExcel[0]?.checklistUrl);
console.log('🔍 Export Excel - preQaDone field:', allExcel[0]?.preQaDone);

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
    'Notes':           e.notes || '',
    'Checklist URL':    e.checklistUrl || '',
    'Pre QC Done':     e.preQaDone ? 'Yes' : 'No'
  }));

console.log('🔍 Export Excel - column order:', Object.keys(exportData[0] || {}));

console.log('🔍 Export Excel - exportData sample:', exportData[0]);

  console.log('🔍 Export Excel - final exportData length:', exportData.length);
console.log('🔍 Export Excel - exportData keys for first entry:', Object.keys(exportData[0] || {}));

const ws = XLSX.utils.json_to_sheet(exportData);
console.log('🔍 Export Excel - worksheet created, cell count:', ws['!ref'].split(':').length);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Completions');
console.log('🔍 Export Excel - workbook created with sheets:', Object.keys(wb.Sheets));

XLSX.writeFile(wb, `AQE_Completions_${formatDateFull(serverTimestamp()).replace(/[:\s/]/g, '_')}.xlsx`);
console.log('🔍 Export Excel - file write completed');
showToast('Excel exported successfully.', 'success');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 GOOGLE SHEETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createGoogleSheet() {
  console.log('📊 Creating Google Sheet...');
  
  // Get current date and time for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // Get project name from first entry or use default
  let projectName = 'AQE_Project';
  if (allExcel.length > 0 && allExcel[0].projectName) {
    projectName = allExcel[0].projectName.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  // Create filename with project name and date/time
  const fileName = `${projectName}_${dateStr}_${timeStr}`;
  
  console.log('📊 Creating Google Sheet with filename:', fileName);
  showToast(`Creating Google Sheet: ${fileName}`, 'info');
  
  // Check if Google API is available
  if (typeof gapi === 'undefined' || !gapi.client) {
    console.log('📊 Google API not available, using Excel fallback...');
    fallbackToExcelDownload(fileName);
    return;
  }
  
  try {
    // Create Google Sheet using API
    createGoogleSheetAPI(fileName);
    
  } catch (error) {
    console.error('📊 Error creating Google Sheet:', error);
    console.log('📊 Falling back to Excel download...');
    fallbackToExcelDownload(fileName);
  }
}

async function createGoogleSheetAPI(sheetName) {
  console.log('📊 Creating Google Sheet via API...');
  
  // Template sheet ID (your existing sheet)
  const templateSheetId = '1_wUzA_pKfUH7IVJGerRDto2tVmcP5JPOj8wlLF6Xq54';
  
  try {
    // Step 1: Copy the template sheet
    const copyResponse = await gapi.client.sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: templateSheetId,
      sheetId: 0, // Copy first sheet
      destinationSpreadsheetId: null // Create new spreadsheet
    });
    
    console.log('📊 Template copied:', copyResponse);
    
    // Step 2: Create new spreadsheet with copied data
    const newSpreadsheet = await gapi.client.sheets.spreadsheets.create({
      properties: {
        title: sheetName
      }
    });
    
    const newSpreadsheetId = newSpreadsheet.result.spreadsheetId;
    console.log('📊 New spreadsheet created:', newSpreadsheetId);
    
    // Step 3: Create 4 sheets with checkbox functionality
    const sheetNames = ['Sheet1', 'Sheet2', 'Sheet3', 'Sheet4'];
    
    for (let i = 0; i < sheetNames.length; i++) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSpreadsheetId,
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetNames[i],
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26
                }
              }
            }
          }
        ]
      });
      
      // Add checkbox functionality to the sheet
      await addCheckboxFunctionality(newSpreadsheetId, sheetNames[i]);
    }
    
    // Step 4: Add project data and checkbox list
    await addProjectDataWithCheckboxes(newSpreadsheetId);
    
    // Step 5: Open the created Google Sheet
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
    window.open(sheetUrl, '_blank');
    
    console.log('📊 Google Sheet created and opened:', sheetUrl);
    showToast(`Google Sheet created: ${sheetName}`, 'success');
    
    // Store the new sheet ID for future reference
    localStorage.setItem('lastGoogleSheetId', newSpreadsheetId);
    
  } catch (error) {
    console.error('📊 Google Sheets API Error:', error);
    
    // Fallback to Excel download if API fails
    console.log('📊 Fallback to Excel download...');
    fallbackToExcelDownload(sheetName);
  }
}

async function addCheckboxFunctionality(spreadsheetId, sheetName) {
  console.log('📊 Adding checkbox functionality to:', sheetName);
  
  try {
    // Add checkbox column and formatting
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                dataValidation: {
                  condition: {
                    type: 'BOOLEAN'
                  }
                }
              }
            },
            fields: 'dataValidation'
          }
        }
      ]
    });
    
    console.log('📊 Checkbox functionality added to:', sheetName);
    
  } catch (error) {
    console.error('📊 Error adding checkbox functionality:', error);
  }
}

async function addProjectDataWithCheckboxes(spreadsheetId) {
  console.log('📊 Adding project data with checkboxes...');
  
  try {
    // Get unique projects from allExcel
    const uniqueProjects = [...new Set(allExcel.map(e => e.projectName).filter(p => p))];
    
    // Create project list with checkboxes
    const projectData = uniqueProjects.map((project, index) => [
      `=FALSE()`, // Checkbox formula
      project,    // Project name
      '',         // Status
      new Date().toISOString().split('T')[0], // Date
      ''          // Notes
    ]);
    
    // Add data to first sheet
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A2:E' + (projectData.length + 1),
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: projectData
      }
    });
    
    // Add headers
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A1:E1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['Checkbox', 'Project Name', 'Status', 'Date', 'Notes']]
      }
    });
    
    console.log('📊 Project data added with checkboxes');
    
  } catch (error) {
    console.error('📊 Error adding project data:', error);
  }
}

function fallbackToExcelDownload(sheetName) {
  console.log('📊 Fallback: Creating Excel file...');
  
  try {
    // Export data for Excel
    const exportData = allExcel.map(e => ({
      'Checkbox': 'FALSE',
      'Project Name': e.projectName || '',
      'Task / Project': e.taskName || '',
      'Completed By': e.completedByName || '',
      'Completed At': formatDateFull(e.completedAt),
      'Added At': formatDateFull(e.addedAt),
      'Method': e.addedMethod || 'auto',
      'Version': e.version || '',
      'Bugs Found': e.bugsFound || '',
      'Bugs Done': e.bugsDone || '',
      'Ignored': e.ignored || '',
      'As Per Live': e.asPerLive || '',
      'Notes': e.notes || '',
      'Checklist URL': e.checklistUrl || '',
      'Pre QC Done': e.preQaDone ? 'Yes' : 'No'
    }));

    // Create Excel file with 4 sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Project List with Checkboxes
    const uniqueProjects = [...new Set(allExcel.map(e => e.projectName).filter(p => p))];
    const projectData = uniqueProjects.map(project => ({
      'Checkbox': 'FALSE',
      'Project Name': project,
      'Status': '',
      'Date': new Date().toISOString().split('T')[0],
      'Notes': ''
    }));
    const ws1 = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Project List');
    
    // Sheet 2: Task Details
    const ws2 = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Task Details');
    
    // Sheet 3: Summary
    const summaryData = [{
      'Total Projects': uniqueProjects.length,
      'Total Tasks': allExcel.length,
      'Created Date': new Date().toISOString().split('T')[0],
      'Created By': currentProfile?.name || 'User'
    }];
    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    
    // Sheet 4: Settings
    const settingsData = [{
      'Setting': 'Auto-refresh',
      'Value': 'TRUE'
    }, {
      'Setting': 'Notifications',
      'Value': 'TRUE'
    }];
    const ws4 = XLSX.utils.json_to_sheet(settingsData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Settings');
    
    // Write file
    const fileName = `${sheetName}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('📊 Excel file created as fallback:', fileName);
    showToast(`Excel file created (Google Sheets API unavailable): ${fileName}`, 'warning');
    
  } catch (error) {
    console.error('📊 Error in fallback:', error);
    showToast('Error creating file: ' + error.message, 'error');
  }
}

// Initialize Google Sheets API
function initGoogleSheetsAPI() {
  console.log('📊 Initializing Google Sheets API...');
  
  // Check if Google API is available
  if (typeof gapi !== 'undefined') {
    gapi.load('client:auth2', () => {
      gapi.client.init({
        apiKey: 'YOUR_API_KEY', // You'll need to set this
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        clientId: 'YOUR_CLIENT_ID', // You'll need to set this
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      }).then(() => {
        console.log('📊 Google Sheets API initialized');
      }).catch(error => {
        console.error('📊 Error initializing Google Sheets API:', error);
      });
    });
  } else {
    console.log('📊 Google API not available, will use Excel fallback');
  }
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
  console.log('🔄 updateNavBadge() called');
  console.log('🔄 allTasks.length:', allTasks.length);
  console.log('🔄 allExcel.length:', Array.isArray(allExcel) ? allExcel.length : 'not array');
  
  // Update tasks badge
  const tasksBadge = document.querySelector('.nav-item[onclick*="tasks"] .nav-badge');
  console.log('🔄 tasksBadge element:', tasksBadge ? 'found' : 'not found');
  if (tasksBadge) {
    const tasksTotal = allTasks.length;
    tasksBadge.textContent = tasksTotal;
    tasksBadge.style.display = tasksTotal > 0 ? 'block' : 'none';
    console.log('🔄 Tasks badge updated to:', tasksTotal);
  }
  
  // Update projects badge - create badge if it doesn't exist
  let projectsBadge = document.querySelector('.nav-item[onclick*="projects"] .nav-badge');
  
  // Alternative selector if first one doesn't work
  if (!projectsBadge) {
    projectsBadge = document.querySelector('div[onclick*="switchTab(\'projects\')"] .nav-badge');
  }
  
  // Final fallback - get by ID if we created it dynamically
  if (!projectsBadge) {
    projectsBadge = document.getElementById('projects-badge');
  }
  if (!projectsBadge) {
    console.log('🔄 Projects badge not found, creating new one');
    const projectsNavItem = document.querySelector('.nav-item[onclick*="projects"]');
    if (projectsNavItem) {
      projectsBadge = document.createElement('span');
      projectsBadge.id = 'projects-badge'; // Assign ID to dynamically created badge
      projectsBadge.className = 'nav-badge';
      projectsBadge.style.display = 'none';
      projectsNavItem.appendChild(projectsBadge);
      console.log('🔄 Projects badge created and appended');
    }
  } else {
    console.log('🔄 Projects badge found, updating directly');
  }
  
  console.log('🔄 projectsBadge element:', projectsBadge ? 'found' : 'not found');
  if (projectsBadge) {
    // Count both manageExcel entries (from task completion) and manual projects
    const validExcelEntries = Array.isArray(allExcel) ? allExcel.filter(entry => entry.taskId && entry.taskName) : [];
    const manualProjects = Array.isArray(allProjects) ? allProjects : [];
    const projectsTotal = validExcelEntries.length + manualProjects.length;
    console.log('🔍 Counting entries - excel:', validExcelEntries.length, 'manual projects:', manualProjects.length, 'total:', projectsTotal);
    console.log('🔄 updateNavBadge() called - allExcel.length:', allExcel.length, 'projectsTotal calculated:', projectsTotal);
    console.log('🔍 allExcel array contents:');
    console.log('🔍 allExcel type:', typeof allExcel, 'is array:', Array.isArray(allExcel));
    console.log('🔍 allExcel value:', JSON.stringify(allExcel, null, 2));
    
    if (allExcel.length === 0) {
      console.log('🔍 allExcel is empty - badge should show 0 and be hidden');
    }
    
    projectsBadge.textContent = projectsTotal;
    projectsBadge.style.display = projectsTotal > 0 ? 'block' : 'none';
    console.log('🔄 Projects badge updated to:', projectsTotal, 'badge text content:', projectsBadge.textContent, 'display style:', projectsBadge.style.display);
  }
  
  // Update sheet tracker badge
  const sheetTrackerBadge = document.querySelector('.nav-item[onclick*="sheettracker"] .nav-badge');
  if (sheetTrackerBadge) {
    const sheetTrackerTotal = Array.isArray(allSheetTracker) ? allSheetTracker.length : 0;
    sheetTrackerBadge.textContent = sheetTrackerTotal;
    sheetTrackerBadge.style.display = sheetTrackerTotal > 0 ? 'block' : 'none';
    console.log('🔄 Sheet Tracker badge updated to:', sheetTrackerTotal);
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
window.renderSheetTracker = renderSheetTracker;
window.openSheetTrackerModal = openSheetTrackerModal;
window.saveSheetTrackerEntry = saveSheetTrackerEntry;
window.deleteSheetTrackerEntry = deleteSheetTrackerEntry;
window.viewSheetTrackerEntry = viewSheetTrackerEntry;
window.editSheetTrackerEntry = editSheetTrackerEntry;
window.exportSheetTrackerToExcel = exportSheetTrackerToExcel;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 SHEET TRACKER MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function renderSheetTracker() {
  const tbody = document.getElementById('sheettracker-body');
  if (!tbody) return;

  const visibleSheetTracker = allSheetTracker.filter(entry => canCurrentUserViewItem(entry.createdByUid));
  if (!visibleSheetTracker.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:24px">No sheet tracker entries yet</div></td></tr>`;
    updateSheetTrackerPagination(0);
    return;
  }

  // Sorting
  const sorted = [...visibleSheetTracker].sort((a, b) => {
    let valA, valB;
    if (sheetTrackerSortField === 'createdAt') {
      valA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
      valB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
      return sheetTrackerSortDir === 'asc' ? valA - valB : valB - valA;
    } else {
      valA = (a[sheetTrackerSortField] || '').toString().toLowerCase();
      valB = (b[sheetTrackerSortField] || '').toString().toLowerCase();
      if (valA < valB) return sheetTrackerSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sheetTrackerSortDir === 'asc' ? 1 : -1;
      return 0;
    }
  });

  // Pagination
  const total = sorted.length;
  const totalPages = Math.ceil(total / sheetTrackerItemsPerPage);
  if (sheetTrackerCurrentPage > totalPages) sheetTrackerCurrentPage = 1;
  const start = (sheetTrackerCurrentPage - 1) * sheetTrackerItemsPerPage;
  const paginated = sorted.slice(start, start + sheetTrackerItemsPerPage);

  updateSheetTrackerPagination(total);

  // Sort arrow helper
  const arrow = (field) => {
    if (sheetTrackerSortField !== field) return '<span style="opacity:0.3;">↕</span>';
    return sheetTrackerSortDir === 'asc' ? '↑' : '↓';
  };

  // Update sortable headers
  ['taskName','projectName','createdAt'].forEach(f => {
    const el = document.getElementById(`st-sort-${f}`);
    if (el) el.innerHTML = arrow(f);
  });

  tbody.innerHTML = paginated.map(entry => `
    <tr>
      <td style="text-align:center;"><input type="checkbox" class="st-checkbox" value="${entry.id}" onchange="updateSTSelection()"></td>
      <td>${esc(entry.taskName || '')}</td>
      <td>${esc(entry.projectName || '')}</td>
      <td>
        ${entry.checklistUrl
          ? `<a href="${entry.checklistUrl}" target="_blank" style="color:var(--blue);text-decoration:underline;word-break:break-all;">${esc(entry.projectName || entry.taskName || 'Open')}</a>`
          : '<span style="color:var(--text-muted);">—</span>'}
      </td>
      <td>
        ${entry.zohoUrl
          ? `<a href="${entry.zohoUrl}" target="_blank" style="color:var(--blue);text-decoration:underline;word-break:break-all;">${esc(entry.projectName || entry.taskName || 'Open')}</a>`
          : '<span style="color:var(--text-muted);">—</span>'}
      </td>
      <td>${entry.createdAt ? new Date(entry.createdAt.toDate()).toLocaleDateString() : ''}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewSheetTrackerEntry('${entry.id}')" title="View" style="background:var(--cyan);">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          ${entry.taskId ? `
          <button class="action-btn" onclick="showTaskHistory('${entry.taskId}')" title="View History" style="background:var(--purple);">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>` : ''}
          <button class="action-btn" onclick="editSheetTrackerEntry('${entry.id}')" title="Edit">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="action-btn danger" onclick="deleteSheetTrackerEntry('${entry.id}')" title="Delete">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateSheetTrackerPagination(total) {
  const totalPages = Math.ceil(total / sheetTrackerItemsPerPage) || 1;
  const infoEl = document.getElementById('st-pagination-info');
  const curEl  = document.getElementById('st-current-page');
  const totEl  = document.getElementById('st-total-pages');
  const prevBtn = document.getElementById('prev-st-btn');
  const nextBtn = document.getElementById('next-st-btn');

  const from = total > 0 ? (sheetTrackerCurrentPage - 1) * sheetTrackerItemsPerPage + 1 : 0;
  const to   = Math.min(sheetTrackerCurrentPage * sheetTrackerItemsPerPage, total);

  if (infoEl) infoEl.textContent = `Showing ${from}-${to} of ${total}`;
  if (curEl)  curEl.textContent  = sheetTrackerCurrentPage;
  if (totEl)  totEl.textContent  = totalPages;
  if (prevBtn) prevBtn.disabled  = sheetTrackerCurrentPage === 1;
  if (nextBtn) nextBtn.disabled  = sheetTrackerCurrentPage >= totalPages;
}

function openSheetTrackerModal(entryId = null) {
  const modal = document.getElementById('sheettracker-modal');
  const title = document.getElementById('sheettracker-modal-title');
  const taskInput = document.getElementById('st-task-name');
  const projectInput = document.getElementById('st-project-name');
  const checklistInput = document.getElementById('st-checklist-url');
  const zohoInput = document.getElementById('st-zoho-url');
  const errorEl = document.getElementById('sheettracker-modal-error');

  // Reset form
  taskInput.value = '';
  projectInput.value = '';
  checklistInput.value = '';
  zohoInput.value = '';
  errorEl.style.display = 'none';

  // Reset readonly & show save button
  ['st-task-name','st-project-name','st-checklist-url','st-zoho-url'].forEach(id => {
    document.getElementById(id).readOnly = false;
  });
  const saveBtn = modal.querySelector('.modal-footer .btn-primary');
  if (saveBtn) saveBtn.style.display = 'inline-flex';

  if (entryId) {
    // Edit mode
    const entry = allSheetTracker.find(e => e.id === entryId);
    if (entry) {
      title.textContent = 'Edit Sheet Tracker Entry';
      taskInput.value = entry.taskName || '';
      projectInput.value = entry.projectName || '';
      checklistInput.value = entry.checklistUrl || '';
      zohoInput.value = entry.zohoUrl || '';
      modal.dataset.editId = entryId;
    }
  } else {
    // Add mode
    title.textContent = 'Add Sheet Tracker Entry';
    modal.dataset.editId = '';
  }

  modal.style.display = 'flex';
  modal.classList.add('open');
}

async function saveSheetTrackerEntry() {
  const taskName = document.getElementById('st-task-name').value.trim();
  const projectName = document.getElementById('st-project-name').value.trim();
  const checklistUrl = document.getElementById('st-checklist-url').value.trim();
  const zohoUrl = document.getElementById('st-zoho-url').value.trim();
  const errorEl = document.getElementById('sheettracker-modal-error');
  const modal = document.getElementById('sheettracker-modal');
  const isEdit = modal.dataset.editId;

  errorEl.style.display = 'none';

  if (!taskName || !projectName) {
    errorEl.textContent = 'Task Name and Project Name are required.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const entryData = {
      taskName,
      projectName,
      checklistUrl: checklistUrl || null,
      zohoUrl: zohoUrl || null,
      createdByUid: currentUser?.uid || null,
      updatedAt: serverTimestamp()
    };

    if (isEdit) {
      // Update existing
      await firebase.firestore().collection('sheetTracker').doc(isEdit).update(entryData);
      showToast('Sheet tracker entry updated successfully!', 'success');
    } else {
      // Create new
      entryData.createdAt = serverTimestamp();
      await firebase.firestore().collection('sheetTracker').add(entryData);
      showToast('Sheet tracker entry added successfully!', 'success');
    }

    closeModal('sheettracker-modal');
  } catch (error) {
    console.error('Error saving sheet tracker entry:', error);
    errorEl.textContent = 'Failed to save entry. Please try again.';
    errorEl.style.display = 'block';
  }
}

async function deleteSheetTrackerEntry(entryId) {
  if (!confirm('Are you sure you want to delete this sheet tracker entry?')) return;

  try {
    await firebase.firestore().collection('sheetTracker').doc(entryId).delete();
    showToast('Sheet tracker entry deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting sheet tracker entry:', error);
    showToast('Failed to delete entry.', 'error');
  }
}

function viewSheetTrackerEntry(entryId) {
  const entry = allSheetTracker.find(e => e.id === entryId);
  if (!entry) return;

  const modal = document.getElementById('sheettracker-modal');
  const title = document.getElementById('sheettracker-modal-title');

  title.textContent = 'View Sheet Tracker Entry';
  document.getElementById('st-task-name').value = entry.taskName || '';
  document.getElementById('st-project-name').value = entry.projectName || '';
  document.getElementById('st-checklist-url').value = entry.checklistUrl || '';
  document.getElementById('st-zoho-url').value = entry.zohoUrl || '';

  // Make readonly
  ['st-task-name','st-project-name','st-checklist-url','st-zoho-url'].forEach(id => {
    document.getElementById(id).readOnly = true;
  });

  // Hide save button
  const saveBtn = modal.querySelector('.modal-footer .btn-primary');
  if (saveBtn) saveBtn.style.display = 'none';

  modal.dataset.editId = '';
  modal.style.display = 'flex';
  modal.classList.add('open');
}

function editSheetTrackerEntry(entryId) {
  openSheetTrackerModal(entryId);
  // Ensure fields are editable
  ['st-task-name','st-project-name','st-checklist-url','st-zoho-url'].forEach(id => {
    document.getElementById(id).readOnly = false;
  });
  const saveBtn2 = document.querySelector('#sheettracker-modal .modal-footer .btn-primary');
  if (saveBtn2) saveBtn2.style.display = 'inline-flex';
}

function exportSheetTrackerToExcel() {
  if (!allSheetTracker.length) {
    showToast('No data to export.', 'warning');
    return;
  }

  const data = allSheetTracker.map(entry => ({
    'Task Name': entry.taskName || '',
    'Project Name': entry.projectName || '',
    'Checklist URL': entry.checklistUrl || '',
    'Zoho URL': entry.zohoUrl || '',
    'Created At': entry.createdAt ? entry.createdAt.toDate().toLocaleString() : '',
    'Created By': entry.createdByUid || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet Tracker');
  XLSX.writeFile(wb, `sheet-tracker-${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Sheet tracker exported to Excel!', 'success');
}

function triggerSheetTrackerImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.style.display = 'none';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) importSheetTrackerFromExcel(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

function importSheetTrackerFromExcel(file) {
  // Validations same as task/project import
  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('File size exceeds 15MB limit.', 'error');
    return;
  }

  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  if (!validTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload an Excel file (.xlsx or .xls).', 'error');
    return;
  }

  if (file.size === 0) {
    showToast('The selected file is empty.', 'error');
    return;
  }

  showToast('Processing file...', 'info');

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        showToast('Invalid Excel file format.', 'error');
        return;
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet || !firstSheet['!ref']) {
        showToast('The Excel file is empty or has no valid data.', 'error');
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      if (!jsonData || jsonData.length === 0) {
        showToast('No data found in Excel file.', 'error');
        return;
      }

      // Validate required column
      if (!('Task Name' in jsonData[0])) {
        showToast('Invalid format. Required column: "Task Name".', 'error');
        return;
      }

      let imported = 0, skipped = 0;
      for (const row of jsonData) {
        const taskName = row['Task Name']?.toString().trim();
        const projectName = row['Project Name']?.toString().trim() || '';

        if (!taskName) { skipped++; continue; }

        try {
          await firebase.firestore().collection('sheetTracker').add({
            taskName,
            projectName,
            checklistUrl: row['Checklist URL']?.toString().trim() || null,
            zohoUrl: row['Zoho URL']?.toString().trim() || null,
            taskId: null,
            createdByUid: currentUser?.uid || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          imported++;
        } catch(rowErr) {
          console.error('Row import error:', rowErr);
          skipped++;
        }
      }

      showToast(`Import done! ${imported} imported, ${skipped} skipped.`, 'success');
    } catch(err) {
      console.error('Import error:', err);
      showToast('Error importing file: ' + err.message, 'error');
    }
  };
  reader.onerror = () => showToast('Failed to read file.', 'error');
  reader.readAsArrayBuffer(file);
}

function toggleSelectAllST() {
  const all = document.getElementById('select-all-st');
  document.querySelectorAll('.st-checkbox').forEach(cb => cb.checked = all.checked);
  updateSTSelection();
}

function updateSTSelection() {
  const checked = document.querySelectorAll('.st-checkbox:checked');
  const bar = document.getElementById('st-multi-select-bar');
  const countEl = document.getElementById('st-selected-count');
  if (countEl) countEl.textContent = checked.length;
  if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
  // Update select-all state
  const all = document.getElementById('select-all-st');
  const total = document.querySelectorAll('.st-checkbox').length;
  if (all) {
    all.checked = checked.length === total && total > 0;
    all.indeterminate = checked.length > 0 && checked.length < total;
  }
}

async function bulkDeleteSTEntries() {
  const checked = document.querySelectorAll('.st-checkbox:checked');
  if (!checked.length) { showToast('No entries selected.', 'error'); return; }
  openConfirm(`Delete <strong>${checked.length}</strong> Sheet Tracker entries?`, async () => {
    try {
      const ids = [...checked].map(cb => cb.value);
      await Promise.all(ids.map(id => firebase.firestore().collection('sheetTracker').doc(id).delete()));
      showToast(`${ids.length} entries deleted.`, 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
}

window.toggleSelectAllST = toggleSelectAllST;
window.updateSTSelection  = updateSTSelection;
window.bulkDeleteSTEntries = bulkDeleteSTEntries;
