// ═══════════════════════━━━━━━━━━━━━━━━━━━
// AQE QC SYSTEM - TASK COMPLETION HANDLER
// ═══════════════════════━━━━━━━━━━━━━━━━━━

// Current task being completed (single task)
let currentTaskId = null;

// Handle task completion modal close
function handleCompletionModalClose() {
  const modal = document.getElementById('task-completion-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Clear current task
  currentTaskId = null;
  
  // Reset modal title
  const modalTitle = document.getElementById('completion-modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'Complete Task';
  }
}

// Handle task completion (works for both single and bulk)
function handleTaskCompletion() {
  // Check if it's bulk completion
  if (window.currentBulkTasks && window.currentBulkTasks.length > 0) {
    // Bulk completion
    if (window.processBulkTaskCompletion) {
      window.processBulkTaskCompletion();
    }
  } else if (currentTaskId) {
    // Single task completion
    completeSingleTask();
  } else {
    showToast('No task to complete', 'error');
  }
}

// Calculate time spent between two dates
function calculateTimeSpent(createdAt, completedAt) {
  if (!createdAt || !completedAt) {
    return 0;
  }
  
  const created = new Date(createdAt);
  const completed = new Date(completedAt);
  
  // Validate dates
  if (isNaN(created.getTime()) || isNaN(completed.getTime())) {
    return 0;
  }
  
  // Calculate difference in milliseconds
  const diffMs = completed - created;
  
  // If completion is before creation, return 0
  if (diffMs < 0) {
    return 0;
  }
  
  // Convert to hours
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Round to 2 decimal places
  return Math.round(diffHours * 100) / 100;
}

// Calculate time spent in hours and minutes
function calculateTimeSpentDetailed(createdAt, completedAt) {
  if (!createdAt || !completedAt) {
    return { hours: 0, minutes: 0, display: '0h 0m' };
  }
  
  const created = new Date(createdAt);
  const completed = new Date(completedAt);
  
  // Validate dates
  if (isNaN(created.getTime()) || isNaN(completed.getTime())) {
    return { hours: 0, minutes: 0, display: '0h 0m' };
  }
  
  // Calculate difference in milliseconds
  const diffMs = completed - created;
  
  // If completion is before creation, return 0
  if (diffMs < 0) {
    return { hours: 0, minutes: 0, display: '0h 0m' };
  }
  
  // Convert to total minutes
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Calculate hours and remaining minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  // Create display string
  let display = '';
  if (hours > 0) {
    display = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    display = `${minutes}m`;
  } else {
    display = '0h 0m';
  }
  
  return { hours, minutes, display };
}

// Complete single task
function completeSingleTask() {
  const completionNotes = document.getElementById('completion-notes').value.trim();
  const completionDateTime = document.getElementById('completion-datetime').value;
  
  if (!completionDateTime) {
    showToast('Please select completion date and time', 'error');
    return;
  }
  
  if (!currentTaskId) {
    showToast('No task selected', 'error');
    return;
  }
  
  // Get the task to calculate time spent
  const task = allTasks.find(t => t.id === currentTaskId);
  if (!task) {
    showToast('Task not found', 'error');
    return;
  }
  
  // Calculate time spent automatically with detailed breakdown
  const timeData = calculateTimeSpentDetailed(task.createdAt, new Date(completionDateTime));
  const validTimeSpent = timeData.hours + (timeData.minutes / 60);
  
  const updateData = {
    status: 'complete',
    completedAt: new Date(completionDateTime),
    timeSpentHours: validTimeSpent,
    modificationHistory: firebase.firestore.FieldValue.arrayUnion({
      field: 'status',
      oldValue: task.status || 'pending',
      newValue: 'complete',
      timestamp: new Date(),
      modifiedBy: currentUser?.displayName || 'Unknown'
    })
  };
  
  // Add completion notes if provided
  if (completionNotes) {
    updateData.completionNotes = completionNotes;
  }
  
  // Create Project Details entry
  const bugsFound = parseInt(document.getElementById('completion-bugs-found')?.value) || 0;
  const bugsDone = parseInt(document.getElementById('completion-bugs-done')?.value) || 0;
  const ignored = parseInt(document.getElementById('completion-ignored')?.value) || 0;
  const asPerLive = parseInt(document.getElementById('completion-live')?.value) || 0;
  const version = document.getElementById('completion-version')?.value?.trim() || '';
  
  // Get task details for Project entry
  const originalTask = allTasks.find(t => t.id === currentTaskId);
  if (!originalTask) {
    console.error('❌ Task not found for Project Details entry');
    return;
  }
  
  const projectEntry = {
    taskName: originalTask.title || '',
    projectName: originalTask.projectSiteName || '',
    zohoLink: originalTask.projectZohoUrl || '',
    version: version,
    bugsFound: bugsFound,
    bugsDone: bugsDone,
    ignored: ignored,
    asPerLive: asPerLive,
    notes: completionNotes || '',
    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
    completedByUid: currentUser.uid,
    completedByName: currentProfile.name,
    addedMethod: 'auto',
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
    taskId: currentTaskId // Link to the original task
  };
  
  // Validate required fields before proceeding
  // 0 values are allowed - proceed with task completion regardless of bug counts
  
  // Update task in Firestore
  db.collection('tasks').doc(currentTaskId).update(updateData)
    .then(() => {
      if (validTimeSpent > 0) {
        showToast(`Task completed! Time spent: ${timeData.display}`, 'success');
      } else {
        showToast('Task completed!', 'success');
      }
      handleCompletionModalClose();
      
      // Also update the specific Task in allTasks array to show time spent immediately
      const TaskIndex = allTasks.findIndex(t => t.id === currentTaskId);
      if (TaskIndex !== -1) {
        allTasks[TaskIndex].timeSpentHours = validTimeSpent;
        allTasks[TaskIndex].timeSpentDisplay = timeData.display;
        allTasks[TaskIndex].status = 'complete';
        allTasks[TaskIndex].completedAt = new Date(completionDateTime);
      }
      
      // Force refresh of task list to show updated timeSpentHours
      setTimeout(() => {
        if (typeof renderTasks === 'function') {
          renderTasks();
        }
      }, 500);
    })
    .then(() => {
      // Create Project Details entry after task completion
      return db.collection('manageExcel').add(projectEntry);
    })
    .then(() => {
      console.log('✅ Project Details entry created successfully');
      showToast('Task completed successfully! Project Details entry created.', 'success');
    })
    .catch(error => {
      console.error('❌ Project Details entry error:', error);
      showToast('Failed to create Project Details entry', 'error');
    });
}

// Open task completion modal for single task
function openTaskCompletionModal(taskId) {
  const modal = document.getElementById('task-completion-modal');
  const modalTitle = document.getElementById('completion-modal-title');
  const completionNotes = document.getElementById('completion-notes');
  const completionDateTime = document.getElementById('completion-datetime');
  
  if (!modal) {
    console.error('❌ Task completion modal not found');
    return;
  }
  
  // Clear previous values and set default values
  document.getElementById('completion-bugs-found').value = '';
  document.getElementById('completion-bugs-done').value = '';
  document.getElementById('completion-ignored').value = '';
  document.getElementById('completion-live').value = '';
  document.getElementById('completion-version').value = '';
  completionNotes.value = '';
  
  // Set default values for better UX
  document.getElementById('completion-bugs-found').placeholder = 'Enter number of bugs found';
  document.getElementById('completion-bugs-done').placeholder = 'Enter number of bugs completed';
  document.getElementById('completion-ignored').placeholder = 'Enter number of bugs ignored (optional)';
  document.getElementById('completion-live').placeholder = 'Enter bugs as per live (optional)';
  document.getElementById('completion-version').placeholder = 'Enter project version (optional)';
  completionNotes.placeholder = 'Add any completion notes...';
  
  // Set current task
  currentTaskId = taskId;
  
  // Reset modal title for single task
  modalTitle.textContent = 'Complete Task';
  
  // Clear previous values
  completionNotes.value = '';
  
  // Set current datetime
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  completionDateTime.value = localDateTime;
  
  // Clear bulk tasks
  window.currentBulkTasks = null;
  
  // Show modal
  modal.style.display = 'flex';
  
  // Focus on notes field
  setTimeout(() => {
    const completionNotes = document.getElementById('completion-notes');
    if (completionNotes) {
      completionNotes.focus();
    }
  }, 100);
}

// Export functions
window.handleCompletionModalClose = handleCompletionModalClose;
window.handleTaskCompletion = handleTaskCompletion;
window.openTaskCompletionModal = openTaskCompletionModal;
window.completeSingleTask = completeSingleTask;
