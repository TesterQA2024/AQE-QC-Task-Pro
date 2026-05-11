// Task History Modal Functions
function showTaskHistory(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('task-history-modal');
  const content = document.getElementById('task-history-content');

  // Build history HTML
  const createdDate = task.createdAt ? formatDate(task.createdAt) : '';
  const createdTime = task.createdAt ? formatTime(task.createdAt) : '';
  const completedDate = task.completedAt ? formatDate(task.completedAt) : '';
  const completedTime = task.completedAt ? formatTime(task.completedAt) : '';

  // Collect all history items
  const allHistoryItems = [];

  // Add task creation
  allHistoryItems.push({
    type: 'creation',
    timestamp: task.createdAt,
    icon: '📅',
    title: 'Task Created',
    time: `${createdDate} at ${createdTime}`,
    detail: `by ${task.createdByUid === currentUser?.uid ? 'me' : (task.createdByName || 'Unknown')}`
  });

  // Add modification history
  if (task.modificationHistory && task.modificationHistory.length > 0) {
    task.modificationHistory.forEach(mod => {
      const modDate = mod.timestamp ? formatDate(mod.timestamp) : '';
      const modTime = mod.timestamp ? formatTime(mod.timestamp) : '';
      const modifierName = mod.modifiedByUid === currentUser?.uid ? 'me' : (mod.modifiedByName || 'Unknown');

      let icon = '🔄';
      let title = 'Task Modified';

      if (mod.type === 'status_change') {
        icon = '📊';
        title = 'Status Changed';
      } else if (mod.type === 'priority_change') {
        icon = '🎯';
        title = 'Priority Changed';
      } else if (mod.type === 'assignment_change') {
        icon = '👤';
        title = 'Assignment Changed';
      } else if (mod.type === 'title_change') {
        icon = '📝';
        title = 'Title Changed';
      } else if (mod.type === 'description_change') {
        icon = '📄';
        title = 'Description Changed';
      } else if (mod.type === 'due_date_change') {
        icon = '📅';
        title = 'Due Date Changed';
      }
      
      allHistoryItems.push({
        type: 'modification',
        timestamp: mod.timestamp,
        icon: icon,
        title: title,
        time: `${modDate} at ${modTime}`,
        detail: mod.description,
        modifier: modifierName
      });
    });
  }
  
  // Add completion info
  if (task.status === 'complete' && task.completedAt) {
    allHistoryItems.push({
      type: 'completion',
      timestamp: task.completedAt,
      icon: '✅',
      title: 'Task Completed',
      time: `${completedDate} at ${completedTime}`,
      detail: `by ${task.completedByUid === currentUser?.uid ? 'me' : (task.completedByName || 'Unknown')}`
    });
    
    if (task.timeSpentHours) {
      allHistoryItems.push({
        type: 'time_spent',
        timestamp: task.completedAt,
        icon: '⏱️',
        title: 'Time Spent',
        detail: `${task.timeSpentHours} hours`
      });
    }
    
    if (task.completionNotes) {
      allHistoryItems.push({
        type: 'completion_notes',
        timestamp: task.completedAt,
        icon: '📝',
        title: 'Completion Notes',
        detail: task.completionNotes
      });
    }
  }
  
  // Sort all history items by timestamp - most recent first
  allHistoryItems.sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return timeB - timeA;
  });
  
  // Build HTML from sorted items
  let historyHTML = '';
  allHistoryItems.forEach(item => {
    historyHTML += `
      <div class="history-item">
        <div class="history-icon">${item.icon}</div>
        <div class="history-content">
          <div class="history-title">${item.title}</div>
          <div class="history-time">${item.time}</div>
          <div class="history-detail">${item.detail}</div>
          ${item.modifier ? `<div class="history-detail">by ${item.modifier}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  // Set content
  content.innerHTML = historyHTML;
  
  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('open');
}

function closeTaskHistory() {
  const modal = document.getElementById('task-history-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
}

// Project History Modal Functions
function showProjectHistory(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) {
    showToast('Project not found', 'error');
    return;
  }

  const modal = document.getElementById('task-history-modal');
  const content = document.getElementById('task-history-content');

  if (!modal || !content) {
    showToast('History modal not found', 'error');
    return;
  }

  // Build history HTML
  const createdDate = project.createdAt ? formatDate(project.createdAt) : '';
  const createdTime = project.createdAt ? formatTime(project.createdAt) : '';

  // Collect all history items
  const allHistoryItems = [];

  // Add project creation
  allHistoryItems.push({
    type: 'creation',
    timestamp: project.createdAt,
    icon: '📅',
    title: 'Project Created',
    time: `${createdDate} at ${createdTime}`,
    detail: `by ${project.importedByUid === currentUser?.uid ? 'me' : (project.importedByName || 'Unknown')}`
  });

  // Add modification history if exists
  if (project.modificationHistory && project.modificationHistory.length > 0) {
    project.modificationHistory.forEach(mod => {
      const modDate = mod.timestamp ? formatDate(mod.timestamp) : '';
      const modTime = mod.timestamp ? formatTime(mod.timestamp) : '';
      const modifierName = mod.modifiedByUid === currentUser?.uid ? 'me' : (mod.modifiedByName || 'Unknown');

      let icon = '🔄';
      let title = 'Project Modified';

      if (mod.type === 'status_change') {
        icon = '📊';
        title = 'Status Changed';
        if (mod.oldValue && mod.newValue) {
          title += `: ${mod.oldValue} → ${mod.newValue}`;
        }
      } else if (mod.type === 'bugs_change') {
        icon = '🐛';
        title = 'Bug Counts Changed';
      } else if (mod.type === 'notes_change') {
        icon = '📝';
        title = 'Notes Updated';
      }

      allHistoryItems.push({
        type: 'modification',
        timestamp: mod.timestamp,
        icon: icon,
        title: title,
        time: `${modDate} at ${modTime}`,
        detail: `by ${modifierName}`
      });
    });
  }

  // Sort by timestamp (newest first)
  allHistoryItems.sort((a, b) => {
    const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
    const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
    return timeB - timeA;
  });

  // Build HTML
  if (allHistoryItems.length === 0) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No history available</div>';
  } else {
    content.innerHTML = allHistoryItems.map(item => `
      <div class="history-item">
        <div class="history-icon">${item.icon}</div>
        <div class="history-content">
          <div class="history-title">${item.title}</div>
          <div class="history-time">${item.time}</div>
          <div class="history-detail">${item.detail}</div>
        </div>
      </div>
    `).join('');
  }

  // Update modal title
  const modalTitle = modal.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = 'Project History';

  modal.style.display = 'block';
  modal.classList.add('open');
}

// Export functions
window.showTaskHistory = showTaskHistory;
window.closeTaskHistory = closeTaskHistory;
window.showProjectHistory = showProjectHistory;
