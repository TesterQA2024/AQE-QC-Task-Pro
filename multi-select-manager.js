// ═══════════════════════━━━━━━━━━━━━━━━━━━
// AQE QC SYSTEM - MULTI-SELECT MANAGER
// ═══════════════════════━━━━━━━━━━━━━━━━━━

// Multi-select state
let selectedTasks = new Set();
let isMultiSelectMode = false;

// Initialize multi-select manager
function initMultiSelectManager() {
  console.log('🎯 Initializing multi-select manager...');
  
  // Setup event listeners
  setupMultiSelectListeners();
  
  // Add select all checkbox to table header
  addSelectAllCheckbox();
  
  console.log('🎯 Multi-select manager initialized');
}

// Setup multi-select event listeners
function setupMultiSelectListeners() {
  // Listen for checkbox changes
  document.addEventListener('change', function(e) {
    if (e.target.classList.contains('task-checkbox')) {
      const taskId = e.target.value;
      const isChecked = e.target.checked;
      
      if (isChecked) {
        selectedTasks.add(taskId);
      } else {
        selectedTasks.delete(taskId);
      }
      
      updateMultiSelectUI();
    }
  });
  
  // Listen for Ctrl+A to select all
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      selectAllTasks();
    }
  });
  
  // Listen for Escape to clear selection
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      clearSelection();
    }
  });
}

// Add select all checkbox to table header
function addSelectAllCheckbox() {
  const tableHeader = document.querySelector('#tab-tasks .data-table thead tr');
  if (tableHeader) {
    const firstHeader = tableHeader.querySelector('th');
    if (firstHeader && !firstHeader.querySelector('.select-all-checkbox')) {
      firstHeader.innerHTML = `
        <div class="select-all-checkbox">
          <input type="checkbox" id="select-all-tasks" onchange="toggleSelectAll()" title="Select All (Ctrl+A)">
        </div>
        Task
      `;
    }
  }
}

// Handle individual task selection
function handleTaskSelection(taskId, isChecked) {
  if (isChecked) {
    selectedTasks.add(taskId);
  } else {
    selectedTasks.delete(taskId);
  }
  
  updateMultiSelectUI();
}

// Toggle select all tasks
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('select-all-tasks');
  const taskCheckboxes = document.querySelectorAll('.task-checkbox');
  
  if (selectAllCheckbox.checked) {
    selectAllTasks();
  } else {
    clearSelection();
  }
}

// Select all visible tasks
function selectAllTasks() {
  const taskCheckboxes = document.querySelectorAll('.task-checkbox');
  const selectAllCheckbox = document.getElementById('select-all-tasks');
  
  taskCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
    selectedTasks.add(checkbox.value);
  });
  
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  }
  
  updateMultiSelectUI();
}

// Clear selection
function clearSelection() {
  console.log('🔄 clearSelection() called - current selectedTasks.size:', selectedTasks.size);
  const taskCheckboxes = document.querySelectorAll('.task-checkbox');
  const selectAllCheckbox = document.getElementById('select-all-tasks');
  
  taskCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }
  
  console.log('🔄 selectedTasks cleared - new size:', selectedTasks.size);
  selectedTasks.clear();
  console.log('🔄 selectedTasks cleared - new size:', selectedTasks.size);
  updateMultiSelectUI();
  console.log('🔄 clearSelection() completed');
}

// Update multi-select UI
function updateMultiSelectUI() {
  const multiSelectActions = document.getElementById('multi-select-actions');
  const selectedCount = document.getElementById('selected-count');
  const selectAllCheckbox = document.getElementById('select-all-tasks');
  
  console.log('🔄 updateMultiSelectUI() called - selectedTasks.size:', selectedTasks.size);
  console.log('🔄 selectedCount element:', selectedCount ? 'found' : 'not found');
  console.log('🔄 multiSelectActions element:', multiSelectActions ? 'found' : 'not found');
  
  // Update selected count
  selectedCount.textContent = selectedTasks.size;
  console.log('🔄 Updated selected count to:', selectedTasks.size);
  
  // Show/hide multi-select actions
  if (selectedTasks.size > 0) {
    multiSelectActions.classList.add('show');
    isMultiSelectMode = true;
    console.log('🔄 Multi-select mode enabled');
  } else {
    multiSelectActions.classList.remove('show');
    isMultiSelectMode = false;
    console.log('🔄 Multi-select mode disabled');
  }
  
  // Update select all checkbox state
  if (selectAllCheckbox) {
    const totalTasks = document.querySelectorAll('.task-checkbox').length;
    if (selectedTasks.size === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedTasks.size === totalTasks) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
}

// Bulk complete selected tasks
function bulkCompleteTasks() {
  if (selectedTasks.size === 0) {
    showToast('No tasks selected', 'error');
    return;
  }
  
  // Get selected task objects
  const selectedTaskObjects = allTasks.filter(task => selectedTasks.has(task.id));
  
  // Filter out already completed tasks
  const incompleteTasks = selectedTaskObjects.filter(task => task.status !== 'complete');
  
  if (incompleteTasks.length === 0) {
    showToast('All selected tasks are already completed', 'info');
    return;
  }
  
  // Show bulk completion modal
  const taskList = document.getElementById('bulk-completion-task-list');
  const modal = document.getElementById('bulk-completion-modal');
  const modalTitle = document.getElementById('bulk-completion-title');
  const completionNotes = document.getElementById('bulk-completion-notes');
  const completionDateTime = document.getElementById('bulk-completion-datetime');
  
  showBulkCompletionModal(incompleteTasks);
  
  // Update modal title for bulk completion
  if (modalTitle) {
    modalTitle.textContent = `Complete ${incompleteTasks.length} Task(s)`;
  }
  
  // Display tasks to be completed
  let tasksHtml = '';
  incompleteTasks.forEach(task => {
    tasksHtml += `<div class="bulk-task-item">
      <strong>${esc(task.title)}</strong>
      ${task.projectSiteName ? `<br><small>${esc(task.projectSiteName)}</small>` : ''}
    </div>`;
  });
  if (taskList) taskList.innerHTML = tasksHtml;
  
  // Show the modal
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    console.log('🔄 Bulk completion modal opened');
  }
  
  // Clear previous values
  if (completionNotes) completionNotes.value = '';
  
  // Set current datetime
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  if (completionDateTime) completionDateTime.value = localDateTime;
  
  // Focus on notes field
  setTimeout(() => {
    if (completionNotes) completionNotes.focus();
  }, 100);
}

// Escape HTML special characters
function esc(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// Process bulk task completion
function processBulkTaskCompletion() {
  const completionNotes = document.getElementById('bulk-completion-notes').value.trim();
  const completionDateTime = document.getElementById('bulk-completion-datetime').value;
  
  if (!completionDateTime) {
    showToast('Please select completion date and time', 'error');
    return;
  }
  
  if (!window.currentBulkTasks || window.currentBulkTasks.length === 0) {
    showToast('No tasks to complete', 'error');
    return;
  }
  
  const promises = [];
  
  window.currentBulkTasks.forEach(task => {
    // Calculate time spent automatically
    const timeSpent = calculateTimeSpent(task.createdAt, new Date(completionDateTime));
    
    const updateData = {
      status: 'complete',
      completedAt: new Date(completionDateTime),
      timeSpentHours: timeSpent,
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
    
    promises.push(db.collection('tasks').doc(task.id).update(updateData));
  });
  
  Promise.all(promises)
    .then(() => {
      // Create Project Details entries for completed tasks
      const projectEntryPromises = [];
      
      if (window.currentBulkTasks && Array.isArray(window.currentBulkTasks)) {
        window.currentBulkTasks.forEach(task => {
          const timeSpent = calculateTimeSpent(task.createdAt, new Date(completionDateTime));
          
          const projectEntry = {
            taskId: task.id,
            taskName: task.title,
            projectName: task.projectSiteName || task.title,
            version: task.version || 'v1.0',
            bugsFound: task.bugsFound || 0,
            bugsDone: task.bugsDone || 0,
            ignored: task.ignored || 0,
            asPerLive: task.asPerLive || 0,
            addedMethod: task.addedMethod || 'auto',
            completedAt: new Date(completionDateTime),
            completedByUid: currentUser?.uid,
            completedByName: currentUser?.displayName || 'Unknown',
            completionNotes: completionNotes || '',
            timeSpentHours: timeSpent,
            projectZohoUrl: task.projectZohoUrl || '',
            projectSiteName: task.projectSiteName || task.title
          };
          
          projectEntryPromises.push(db.collection('manageExcel').add(projectEntry));
        });
      }
      
      // Wait for all Project Details entries to be created
      console.log('🔄 Creating Project Details entries for', projectEntryPromises.length, 'tasks');
      return Promise.all(projectEntryPromises);
    })
    .then(() => {
      console.log('✅ All Project Details entries created successfully');
      // Update navigation badges immediately after entries are created
      if (typeof updateNavBadge === 'function') {
        updateNavBadge();
        console.log('🔄 updateNavBadge called immediately after Project Details entries created');
      }
      
      // Calculate total time spent for all tasks
      let totalTimeSpent = 0;
      if (window.currentBulkTasks && Array.isArray(window.currentBulkTasks)) {
        window.currentBulkTasks.forEach(task => {
          const timeSpent = calculateTimeSpent(task.createdAt, new Date(completionDateTime));
          totalTimeSpent += timeSpent;
        });
      }
      
      if (totalTimeSpent > 0) {
        showToast(`Successfully completed ${window.currentBulkTasks.length} task(s)! Total time spent: ${totalTimeSpent} hours`, 'success');
      } else {
        showToast(`Successfully completed ${window.currentBulkTasks.length} task(s)`, 'success');
      }
      
      closeBulkCompletionModal();
      clearSelection();
      
      // Update allTasks array immediately for each completed task
      if (window.currentBulkTasks && Array.isArray(window.currentBulkTasks)) {
        window.currentBulkTasks.forEach(task => {
          const taskIndex = allTasks.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            const timeData = calculateTimeSpentDetailed(task.createdAt, new Date(completionDateTime));
            const validTimeSpent = timeData.hours + (timeData.minutes / 60);
            allTasks[taskIndex].timeSpentHours = validTimeSpent;
            allTasks[taskIndex].timeSpentDisplay = timeData.display;
            allTasks[taskIndex].status = 'complete';
            allTasks[taskIndex].completedAt = new Date(completionDateTime);
          }
        });
      }
      
      // Force refresh of task list to show updated timeSpentHours
      setTimeout(() => {
        console.log('🔄 Bulk completion timeout - calling clearSelection, renderTasks, updateMultiSelectUI and updateNavBadge');
        // Clear selection first to reset count
        clearSelection();
        if (typeof renderTasks === 'function') {
          renderTasks();
        }
        // Update multi-select UI to reset selected count
        updateMultiSelectUI();
        // Update navigation badges
        if (typeof updateNavBadge === 'function') {
          updateNavBadge();
        }
        console.log('🔄 Bulk completion timeout - all four functions called');
      }, 100);
    })
    .catch(error => {
      console.error('❌ Bulk complete error:', error);
      showToast('Failed to complete some tasks', 'error');
    });
}

// Close bulk completion modal
function closeBulkCompletionModal() {
  console.log('🔄 closeBulkCompletionModal() called');
  const modal = document.getElementById('bulk-completion-modal');
  console.log('🔄 Bulk completion modal element:', modal ? 'found' : 'not found');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
    console.log('🔄 Bulk completion modal closed');
  }
  
  // Clear bulk tasks
  window.currentBulkTasks = null;
}

// Bulk delete selected tasks
function bulkDeleteTasks() {
  if (selectedTasks.size === 0) {
    showToast('No tasks selected', 'error');
    return;
  }
  
  const confirmMessage = `Are you sure you want to delete ${selectedTasks.size} task(s)? This action cannot be undone.`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  const promises = [];
  selectedTasks.forEach(taskId => {
    promises.push(deleteTaskFromFirestore(taskId));
  });
  
  Promise.all(promises)
    .then(() => {
      showToast(`Successfully deleted ${selectedTasks.size} task(s)`, 'success');
      clearSelection();
    })
    .catch(error => {
      console.error('❌ Bulk delete error:', error);
      showToast('Failed to delete some tasks', 'error');
    });
}

// Bulk export selected tasks
function bulkExportTasks() {
  if (selectedTasks.size === 0) {
    showToast('No tasks selected', 'error');
    return;
  }
  
  // Get selected task objects
  const selectedTaskObjects = allTasks.filter(task => selectedTasks.has(task.id));
  
  if (selectedTaskObjects.length === 0) {
    showToast('No valid tasks found for export', 'error');
    return;
  }
  
  try {
    // Export selected tasks to Excel
    exportSelectedTasksToExcel(selectedTaskObjects);
    showToast(`Successfully exported ${selectedTasks.size} task(s) to Excel`, 'success');
  } catch (error) {
    console.error('❌ Bulk export error:', error);
    showToast('Failed to export tasks', 'error');
  }
}

// Export selected tasks to Excel
function exportSelectedTasksToExcel(tasks) {
  if (!window.XLSX) {
    throw new Error('XLSX library not loaded');
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = tasks.map((task, index) => {
    const createdDate = task.createdAt ? formatDate(task.createdAt) : '';
    const createdTime = task.createdAt ? formatTime(task.createdAt) : '';
    const dueDate = task.dueDate ? formatDate(task.dueDate) : '';
    const completedDate = task.completedAt ? formatDate(task.completedAt) : '';
    
    return {
      'Task ID': index + 1,
      'Title': task.title || '',
      'Description': task.description || '',
      'Priority': task.priority || '',
      'Status': task.status || '',
      'Task Type': task.taskType || '',
      'Task Allocated By': task.userName || '',
      'Project (Site) Name': task.projectSiteName || '',
      'Project Zoho URL': task.projectZohoUrl || '',
      'Assigned To': task.assignedToName || 'Unassigned',
      'Created Date': createdDate,
      'Created Time': createdTime,
      'Created By': task.createdByName || 'Unknown',
      'Due Date': dueDate,
      'Completed Date': completedDate,
      'Time Spent (Hours)': task.timeSpentHours !== undefined && task.timeSpentHours !== null ? task.timeSpentHours : 0,
      'Completion Notes': task.completionNotes || '',
      'Notes': task.notes || ''
    };
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 8 },  // Task ID
    { wch: 25 }, // Title
    { wch: 30 }, // Description
    { wch: 12 }, // Priority
    { wch: 12 }, // Status
    { wch: 15 }, // Assigned To
    { wch: 12 }, // Created Date
    { wch: 10 }, // Created Time
    { wch: 15 }, // Created By
    { wch: 12 }, // Due Date
    { wch: 15 }, // Completed Date
    { wch: 18 }, // Time Spent
    { wch: 25 }  // Completion Notes
  ];
  ws['!cols'] = colWidths;
  
  // Add styling to header row
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Add conditional formatting for status and priority
  excelData.forEach((task, index) => {
    const row = index + 1;
    
    // Status formatting
    const statusColIndex = 4; // Status column
    const statusCellAddress = XLSX.utils.encode_cell({ r: row, c: statusColIndex });
    if (ws[statusCellAddress]) {
      const status = ws[statusCellAddress].v;
      let fillColor = "FFFFFF";
      
      if (status === 'complete') {
        fillColor = "70AD47"; // Green
      } else if (status === 'inprocess') {
        fillColor = "FFC000"; // Yellow
      } else if (status === 'pending') {
        fillColor = "5B9BD5"; // Blue
      }
      
      ws[statusCellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    
    // Priority formatting
    const priorityColIndex = 3; // Priority column
    const priorityCellAddress = XLSX.utils.encode_cell({ r: row, c: priorityColIndex });
    if (ws[priorityCellAddress]) {
      const priority = ws[priorityCellAddress].v;
      let fillColor = "FFFFFF";
      
      if (priority === 'high') {
        fillColor = "FF0000"; // Red
      } else if (priority === 'medium') {
        fillColor = "FFC000"; // Yellow
      } else if (priority === 'low') {
        fillColor = "70AD47"; // Green
      }
      
      ws[priorityCellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
  });
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Selected Tasks");
  
  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Selected_Tasks_${timestamp}.xlsx`;
  
  // Save file
  XLSX.writeFile(wb, filename);
}

// Helper functions
function updateTaskStatus(taskId, status) {
  return db.collection('tasks').doc(taskId).update({
    status: status,
    completedAt: status === 'complete' ? new Date() : null,
    modificationHistory: firebase.firestore.FieldValue.arrayUnion({
      field: 'status',
      oldValue: 'previous_status',
      newValue: status,
      timestamp: new Date(),
      modifiedBy: currentUser?.displayName || 'Unknown'
    })
  });
}

function deleteTaskFromFirestore(taskId) {
  return db.collection('tasks').doc(taskId).delete();
}

// Export functions
window.handleTaskSelection = handleTaskSelection;
window.toggleSelectAll = toggleSelectAll;
window.selectAllTasks = selectAllTasks;
window.clearSelection = clearSelection;
window.bulkCompleteTasks = bulkCompleteTasks;
window.bulkDeleteTasks = bulkDeleteTasks;
window.bulkExportTasks = bulkExportTasks;
// Ensure showBulkCompletionModal is properly defined before window assignment
function showBulkCompletionModal(tasks) {
  console.log('🔄 showBulkCompletionModal() called with', tasks.length, 'tasks');
  console.log('🔄 Current selectedTasks.size before modal:', selectedTasks.size);
  window.currentBulkTasks = tasks;
  
  const modal = document.getElementById('bulk-completion-modal');
  const modalTitle = document.getElementById('bulk-completion-title');
  const taskList = document.getElementById('bulk-task-list');
  
  console.log('🔄 Modal elements - modal:', modal ? 'found' : 'not found', 'modalTitle:', modalTitle ? 'found' : 'not found', 'taskList:', taskList ? 'found' : 'not found');
  
  if (!modal) {
    console.error('❌ Bulk completion modal not found');
    return;
  }
  
  // Update modal title for bulk completion
  modalTitle.textContent = `Complete ${tasks.length} Task(s)`;
  
  // Display tasks to be completed
  let tasksHtml = '';
  tasks.forEach(task => {
    tasksHtml += `<div class="bulk-task-item">
      <strong>${esc(task.title)}</strong>
      ${task.projectSiteName ? `<br><small>${esc(task.projectSiteName)}</small>` : ''}
    </div>`;
  });
  taskList.innerHTML = tasksHtml;
  
  // Show the modal
  modal.classList.add('open');
  modal.style.display = 'flex';
  console.log('🔄 Bulk completion modal opened');
  
  // Get form elements
  const completionNotes = document.getElementById('bulk-completion-notes');
  const completionDateTime = document.getElementById('bulk-completion-datetime');
  
  // Clear previous values
  if (completionNotes) completionNotes.value = '';
  
  // Set current datetime
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  if (completionDateTime) completionDateTime.value = localDateTime;
  
  // Focus on notes field
  setTimeout(() => {
    if (completionNotes) completionNotes.focus();
  }, 100);
}

window.showBulkCompletionModal = showBulkCompletionModal;
window.processBulkTaskCompletion = processBulkTaskCompletion;
window.closeBulkCompletionModal = closeBulkCompletionModal;
window.initMultiSelectManager = initMultiSelectManager;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initMultiSelectManager();
});
