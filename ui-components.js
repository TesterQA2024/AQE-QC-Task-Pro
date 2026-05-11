// ═════════════════════════━━━━━━━━━━━━══════
// AQE QC SYSTEM - UI COMPONENTS & MODALS
// ═════════════════════════━━━━━━━━━━━━══════

// Firebase functions available globally via compat scripts

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 UI RENDERING FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Pagination State
let tasksCurrentPage = 1;
let tasksItemsPerPage = 10;
let projectsCurrentPage = 1;
let projectsItemsPerPage = 10;

// DASHBOARD RENDERING
function renderDashboard() {
  console.log('📊 renderDashboard() called, allTasks:', allTasks.length);
  
  const total    = allTasks.length;
  const pending  = allTasks.filter(t => t.status === 'pending').length;
  const ongoing  = allTasks.filter(t => t.status === 'ongoing').length;
  const complete = allTasks.filter(t => t.status === 'complete').length;

  console.log('📊 Task counts:', { total, pending, ongoing, complete });

  const totalEl    = document.getElementById('stat-total');
  const pendingEl  = document.getElementById('stat-pending');
  const ongoingEl  = document.getElementById('stat-ongoing');
  const completeEl = document.getElementById('stat-complete');
  
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (ongoingEl) ongoingEl.textContent = ongoing;
  if (completeEl) completeEl.textContent = complete;
  
  console.log('📊 Dashboard stats updated:', { 
    total: totalEl?.textContent, 
    pending: pendingEl?.textContent, 
    ongoing: ongoingEl?.textContent, 
    complete: completeEl?.textContent 
  });

  // Recent tasks (last 5)
  const recent = allTasks.slice(0, 5);
  const tbody  = document.getElementById('recent-tasks-body');
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state" style="padding:24px">No tasks yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(t => `
    <tr>
      <td><div class="task-title-cell">${esc(t.title)}</div></td>
      <td><span class="badge badge-${t.status}">${capitalize(t.status)}</span></td>
      <td class="date-cell">${formatDate(t.createdAt)}<span class="time">${formatTime(t.createdAt)}</span></td>
    </tr>
  `).join('');
}

// TASKS RENDERING
function renderTasks() {
  const tbody = document.getElementById('tasks-body');
  if (!tbody) return;

  console.log('🎨 renderTasks() called, allTasks length:', allTasks.length);
  console.log('🎨 Current user UID:', currentUser?.uid);
  console.log('🎨 Is Super Admin:', isSuperAdmin);

  let filtered = allTasks;
  if (taskFilter !== 'all') filtered = filtered.filter(t => t.status === taskFilter);
  if (priorityFilter) filtered = filtered.filter(t => t.priority === priorityFilter);

  // Pagination
  const totalPages = Math.ceil(filtered.length / tasksItemsPerPage);
  const startIndex = (tasksCurrentPage - 1) * tasksItemsPerPage;
  const endIndex = startIndex + tasksItemsPerPage;
  const paginatedTasks = filtered.slice(startIndex, endIndex);

  // Update pagination info
  const infoEl = document.getElementById('tasks-pagination-info');
  if (infoEl) {
    const showingFrom = filtered.length > 0 ? startIndex + 1 : 0;
    const showingTo = Math.min(endIndex, filtered.length);
    infoEl.textContent = `Showing ${showingFrom}-${showingTo} of ${filtered.length}`;
  }

  // Update page numbers
  const currentPageEl = document.getElementById('tasks-current-page');
  const totalPagesEl = document.getElementById('tasks-total-pages');
  if (currentPageEl) currentPageEl.textContent = tasksCurrentPage;
  if (totalPagesEl) totalPagesEl.textContent = totalPages || 1;

  // Update button states
  const prevBtn = document.getElementById('prev-tasks-btn');
  const nextBtn = document.getElementById('next-tasks-btn');
  if (prevBtn) prevBtn.disabled = tasksCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = tasksCurrentPage >= totalPages || totalPages === 0;

  tbody.innerHTML = paginatedTasks.map(t => {
    const priorityIcon = {
      high: '🔴',
      medium: '🟡', 
      low: '🟢'
    }[t.priority] || '⚪';

    const createdDate = t.createdAt ? formatDate(t.createdAt) : '';
    const createdTime = t.createdAt ? formatTime(t.createdAt) : '';
    
    return `
    <tr data-task-id="${t.id}">
      <td style="text-align:center;vertical-align:middle;">
        <input type="checkbox" class="task-checkbox" value="${t.id}" onchange="handleTaskSelection('${t.id}', this.checked)">
      </td>
      <td>
        <div class="task-title-cell">${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
      </td>
      <td>${priorityIcon} <span class="badge badge-${t.priority}">${capitalize(t.priority)}</span></td>
      <td><span class="badge badge-${t.status}">${capitalize(t.status)}</span></td>
      <td class="date-cell">
        ${t.taskTime ? formatDate(t.taskTime) + '<span class="time">' + formatTime(t.taskTime) + '</span>' : ''}
        ${t.dueDate  ? `<span style="font-size:11px;color:var(--amber);display:block;margin-top:2px;">Due: ${formatDate(t.dueDate)} ${formatTime(t.dueDate)}</span>` : ''}
        ${t.timeSpentHours && t.timeSpentHours > 0 ? `<span style="font-size:12px;color:var(--green);display:block;margin-top:3px;font-weight:bold;background:var(--green-light, #e8f5e8);padding:2px 6px;border-radius:4px;border-left:3px solid var(--green);">⏱️ ${t.timeSpentDisplay || t.timeSpentHours + 'h'}</span>` : ''}
        ${t.createdAt ? `<span style="font-size:11px;color:var(--purple);display:block;margin-top:2px;">📅 Created: ${formatDate(t.createdAt)} ${formatTime(t.createdAt)}</span>` : ''}
        ${t.completedAt && t.timeSpentHours && t.timeSpentHours > 0 ? `<span style="font-size:12px;color:var(--red);display:block;margin-top:3px;font-weight:bold;background:var(--red-light, #fee2e2);padding:2px 6px;border-radius:4px;border-left:3px solid var(--red);">🎯 ${t.assignedToName ? `${t.assignedToName} completed in ${t.timeSpentDisplay || t.timeSpentHours + 'h'}` : `Completed in ${t.timeSpentDisplay || t.timeSpentHours + 'h'}`}</span>` : ''}
        ${!t.taskTime && !t.dueDate && (!t.timeSpentHours || t.timeSpentHours === 0) && !t.createdAt && !t.completedAt ? '<span style="color:var(--text-muted);">—</span>' : ''}
      </td>
      <td>
        ${t.projectSiteName ? `<div style="font-size:12px;color:var(--blue);font-weight:bold;">${esc(t.projectSiteName)}</div>` : ''}
        ${t.projectZohoUrl ? `<a href="${t.projectZohoUrl}" target="_blank" style="font-size:11px;color:var(--blue);display:block;margin-top:2px;">🔗 Zoho Link</a>` : ''}
        ${!t.projectSiteName && !t.projectZohoUrl ? '<span style="color:var(--text-muted);">—</span>' : ''}
      </td>
      <td>${esc(t.assignedToName || 'Unassigned')}</td>
      <td>
        <div class="action-group">
          <div class="action-btn" title="View" data-action="view" data-task-id="${t.id}" style="background:var(--cyan);">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </div>
          <div class="action-btn" title="Edit" data-action="edit" data-task-id="${t.id}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
          </div>
          ${t.status !== 'complete' && (t.assignedToUid === currentUser?.uid || isSuperAdmin) ? `<div class="action-btn complete" title="Complete Task" data-action="complete" data-task-id="${t.id}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>` : ''}
          ${isSuperAdmin ? `<div class="action-btn" title="View History" data-action="history" data-task-id="${t.id}" style="background:var(--purple);">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>` : ''}
          <div class="action-btn del" title="Delete" data-action="delete" data-task-id="${t.id}" data-task-title="${esc(t.title)}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
        </div>
      </td>
    </tr>
  `;
  }).join('');

  // Note: Event listeners are handled by global delegation below
}

// PROJECTS RENDERING
function renderProjects() {
  const tbody = document.getElementById('projects-body');
  if (!tbody) return;

  let filtered = allProjects;
  if (projectFilter !== 'all') filtered = filtered.filter(p => p.status === projectFilter);
  if (searchQuery) filtered = filtered.filter(p => 
    p.projectName.toLowerCase().includes(searchQuery) || 
    (p.notes && p.notes.toLowerCase().includes(searchQuery))
  );

  // Render Project Details entries (from task completion)
  // Show all entries with taskId (from task completion) regardless of task status
  // Entry deletion happens when status changes from complete to non-complete in changeTaskStatus
  const projectEntries = allExcel.filter(e => {
    if (!e.taskId || !e.taskName) return false;
    return true; // Show all task completion entries
  });

  // Combine manual projects and auto-generated project entries
  const allEntries = [...filtered, ...projectEntries];

  // Sort by completion date (newest first) BEFORE pagination
  allEntries.sort((a, b) => {
    const dateA = a.completedAt ? (a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt)) : new Date(0);
    const dateB = b.completedAt ? (b.completedAt.toDate ? b.completedAt.toDate() : new Date(b.completedAt)) : new Date(0);
    return dateB - dateA;
  });

  // Pagination (applied AFTER sorting)
  const totalPages = Math.ceil(allEntries.length / projectsItemsPerPage);
  const startIndex = (projectsCurrentPage - 1) * projectsItemsPerPage;
  const endIndex = startIndex + projectsItemsPerPage;
  const paginatedEntries = allEntries.slice(startIndex, endIndex);

  // Update pagination info
  const infoEl = document.getElementById('projects-pagination-info');
  if (infoEl) {
    const showingFrom = allEntries.length > 0 ? startIndex + 1 : 0;
    const showingTo = Math.min(endIndex, allEntries.length);
    infoEl.textContent = `Showing ${showingFrom}-${showingTo} of ${allEntries.length}`;
  }

  // Update page numbers
  const currentPageEl = document.getElementById('projects-current-page');
  const totalPagesEl = document.getElementById('projects-total-pages');
  if (currentPageEl) currentPageEl.textContent = projectsCurrentPage;
  if (totalPagesEl) totalPagesEl.textContent = totalPages || 1;

  // Update button states
  const prevBtn = document.getElementById('prev-projects-btn');
  const nextBtn = document.getElementById('next-projects-btn');
  if (prevBtn) prevBtn.disabled = projectsCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = projectsCurrentPage >= totalPages || totalPages === 0;

  if (!allEntries.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>No projects found</h3><p>Import a project to get started</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = paginatedEntries.map(entry => {
    if (entry.taskId) {
      // Auto-generated entry from task completion
      const found = parseInt(entry.bugsFound || 0);
      const done  = parseInt(entry.bugsDone  || 0);
      const ignored = parseInt(entry.ignored || 0);
      const live = parseInt(entry.asPerLive || 0);
      return `
        <tr>
          <td style="text-align:center;vertical-align:middle;">
            <input type="checkbox" class="project-checkbox" data-id="${entry.id}" onchange="updateProjectSelection()">
          </td>
          <td>
            <div class="task-title-cell">${esc(entry.projectName || '—')}</div>
            ${entry.taskName ? `<div class="task-desc" style="font-size:11px;color:var(--text-muted);margin-top:4px;">📋 ${esc(entry.taskName)}</div>` : ''}
          </td>
          <td><span class="bug-pill bug-found">${found}</span></td>
          <td><span class="bug-pill bug-done">${done}</span></td>
          <td><span class="bug-pill bug-ignored">${ignored}</span></td>
          <td><span class="bug-pill bug-live">${live}</span></td>
          <td><span style="color:var(--text-muted);">—</span></td>
          <td><span class="badge badge-success">Complete</span></td>
          <td>
            ${entry.notes ? `<span style="font-size:12px;color:var(--text-muted);max-width:120px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(entry.notes)}">${esc(entry.notes)}</span>` : '<span style="color:var(--text-muted);">—</span>'}
          </td>
          <td>
            <div class="action-group">
              ${isSuperAdmin || entry.completedByUid === currentUser.uid ? `
                <div class="action-btn" title="View" data-action="excel-view" data-entry-id="${entry.id}" style="background:var(--cyan);">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
                <div class="action-btn" title="Edit" data-action="excel-edit" data-entry-id="${entry.id}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
                </div>
                ${entry.taskId ? `
                  <div class="action-btn" title="View History" data-action="history" data-task-id="${entry.taskId}" style="background:var(--purple);">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                ` : ''}
                <div class="action-btn del" title="Delete" data-action="excel-delete" data-entry-id="${entry.id}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
              ` : `
                <div class="action-btn" title="View Only" style="opacity:0.5;cursor:not-allowed;">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
              `}
            </div>
          </td>
        </tr>
      `;
    } else {
      // Manual project entry
      const found = parseInt(entry.bugsFound || 0);
      const done  = parseInt(entry.bugsDone  || 0);
      const ignored = parseInt(entry.ignored || 0);
      const live = parseInt(entry.asPerLive || 0);
      return `
        <tr>
          <td style="text-align:center;vertical-align:middle;">
            <input type="checkbox" class="project-checkbox" data-id="${entry.id}" onchange="updateProjectSelection()">
          </td>
          <td>
            <div class="task-title-cell">${esc(entry.projectName || '—')}</div>
            ${entry.zohoLink ? `<div class="task-desc"><a href="${esc(entry.zohoLink)}" target="_blank" class="zoho-link">🔗 Zoho Project</a></div>` : ''}
            ${entry.checklistUrl ? `<div class="task-desc"><a href="${esc(entry.checklistUrl)}" target="_blank" class="checklist-link">📋 Checklist</a></div>` : ''}
            ${entry.taskName ? `<div class="task-desc" style="font-size:11px;color:var(--text-muted);margin-top:4px;">� ${esc(entry.taskName)}</div>` : ''}
          </td>
          <td><span class="bug-pill bug-found">${found}</span></td>
          <td><span class="bug-pill bug-done">${done}</span></td>
          <td><span class="bug-pill bug-ignored">${ignored}</span></td>
          <td><span class="bug-pill bug-live">${live}</span></td>
          <td>
            ${entry.preQaDone ? '<span class="badge badge-success">✅ Yes</span>' : '<span class="badge badge-pending">❌ No</span>'}
          </td>
          <td><span class="badge badge-${entry.status || 'pending'}">${capitalize(entry.status || 'pending')}</span></td>
          <td>
            ${entry.notes ? `<span style="font-size:12px;color:var(--text-muted);max-width:120px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(entry.notes)}">${esc(entry.notes)}</span>` : '<span style="color:var(--text-muted);">—</span>'}
          </td>
          <td>
            <div class="action-group">
              ${isSuperAdmin || entry.importedByUid === currentUser.uid ? `
                <div class="action-btn" title="View" data-action="project-view" data-project-id="${entry.id}" style="background:var(--cyan);">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
                <div class="action-btn" title="View History" data-action="project-history" data-project-id="${entry.id}" style="background:var(--purple);">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div class="action-btn" title="Edit" data-action="project-edit" data-project-id="${entry.id}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
                </div>
                <div class="action-btn del" title="Delete" data-action="project-delete" data-project-id="${entry.id}" data-project-name="${esc(entry.projectName)}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }
  }).join('');

  // Add multi-select actions
  const multiSelectDiv = document.createElement('div');
  multiSelectDiv.className = 'multi-select-actions';
  multiSelectDiv.id = 'project-multi-select-actions';
  multiSelectDiv.innerHTML = `
    <div class="multi-select-info">
      <span id="selected-projects-count">0</span> projects selected
    </div>
    <div class="multi-select-buttons">
      <button class="multi-select-btn export" onclick="bulkExportProjects()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        Export
      </button>
      <button class="multi-select-btn delete" onclick="bulkDeleteProjects()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Delete
      </button>
    </div>
  `;

  // Insert multi-select actions after table header
  const tableCard = document.querySelector('#tab-projects .table-card');
  if (tableCard && !document.getElementById('project-multi-select-actions')) {
    tableCard.insertBefore(multiSelectDiv, tableCard.querySelector('.data-table'));
  }
}

// EXCEL/COMPLETIONS RENDERING
function renderExcel() {
  const tbody = document.getElementById('excel-body');
  if (!tbody) return;

  let filtered = allExcel;
  if (searchQuery) filtered = filtered.filter(e => 
    (e.taskName && e.taskName.toLowerCase().includes(searchQuery)) || 
    (e.projectName && e.projectName.toLowerCase().includes(searchQuery)) ||
    (e.completedByName && e.completedByName.toLowerCase().includes(searchQuery))
  );

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>No completions found</h3><p>Completed projects will appear here</p></div></td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(e => {
    html += `
      <tr>
        <td>
          <div class="task-title-cell">${esc(e.taskName || '—')}</div>
          ${e.projectName && e.projectName !== e.taskName ? `<div class="task-desc">${esc(e.projectName)}</div>` : ''}
        </td>
        <td>${e.version ? `<span class="badge badge-auto">${esc(e.version)}</span>` : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td><span style="font-weight:500;">${esc(e.completedByName || '—')}</span></td>
        <td class="date-cell">${formatDate(e.completedAt)}<span class="time">${formatTime(e.completedAt)}</span></td>
        <td>${e.bugsFound != null ? `<span class="bug-pill bug-found">${e.bugsFound}</span>` : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td>${e.bugsDone  != null ? `<span class="bug-pill bug-done">${e.bugsDone}</span>`   : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td>${e.ignored   != null ? `<span class="bug-pill bug-ignored">${e.ignored}</span>` : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td>${e.asPerLive != null ? `<span class="bug-pill bug-live">${e.asPerLive}</span>`  : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td><span class="badge badge-${e.addedMethod||'auto'}">${capitalize(e.addedMethod||'auto')}</span></td>
        <td>
          <div class="action-group">
            ${isSuperAdmin || e.completedByUid === currentUser.uid ? `
              <div class="action-btn del" title="Delete" onclick="deleteExcelEntry('${e.id}')">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
              </div>
            ` : `
              <div class="action-btn" title="View Only" style="opacity:0.5;cursor:not-allowed;">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
            `}
          </div>
        </td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

// USERS RENDERING
function renderUsers() {
  console.log('👥 renderUsers() called, allUsers:', allUsers.length);
  
  const tbody = document.getElementById('users-body');
  if (!tbody) {
    console.error('❌ users-body not found');
    return;
  }

  if (!allUsers.length) {
    console.log('📭 No users found');
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg><h3>No users yet</h3><p>Create your first user to get started</p></div></td></tr>`;
    return;
  }

  console.log('👥 Rendering users:', allUsers.map(u => ({ name: u.name, email: u.email, role: u.role })));

  tbody.innerHTML = allUsers.map(u => {
    console.log('👤 Rendering user:', u);
    return `
    <tr>
      <td>
        <div class="user-cell">
          <div class="user-row-avatar">${(u.name || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <div>${esc(u.name || '—')}</div>
            ${u.uid ? `<div style="font-size:11px;color:var(--text-muted)">UID: ${u.uid.slice(0,8)}...</div>` : ''}
          </div>
        </div>
      </td>
      <td>${esc(u.email || '—')}</td>
      <td>
        <span class="badge ${u.role === 'superadmin' ? 'badge-complete' : 'badge-ongoing'}">
          ${u.role === 'superadmin' ? '👑 Super Admin' : '👤 User'}
        </span>
      </td>
      <td>
        <label class="switch" title="Toggle user status">
          <input type="checkbox" ${u.status === 'active' ? 'checked' : ''} 
                 onchange="toggleUserStatus('${u.id}', '${u.status || 'active'}')"
                 ${!isSuperAdmin || u.id === currentUser?.uid ? 'disabled' : ''}>
          <span class="slider round"></span>
        </label>
      </td>
      <td class="date-cell">
        ${formatDate(u.createdAt)}
        <span class="time">${formatTime(u.createdAt)}</span>
      </td>
      <td>
        <div class="action-group">
          <div class="action-btn" title="Edit" onclick="editUser('${u.id}')">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
          </div>
          ${u.id !== currentUser?.uid ? `<div class="action-btn del" title="Delete" onclick="deleteUser('${u.id}', '${esc(u.name)}')">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  console.log('✅ Users rendered successfully!');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 MODAL FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    // Also set display:none for modals that use inline style display
    modal.style.display = 'none';
    // Clear any editing ID if present
    if (modal.dataset && modal.dataset.editingId) {
      delete modal.dataset.editingId;
    }
    
    // Re-render tasks if closing project modal to ensure event listeners work
    if (modalId === 'project-modal') {
      console.log('🔒 Closing project modal, re-rendering tasks to fix event listeners');
      setTimeout(() => {
        console.log('🔄 Re-rendering tasks after closing project modal');
        renderTasks();
      }, 100);
    }
  }
}

// TASK MODAL
function openTaskModal(id = null) {
  editingTaskId = id;
  const task = id ? allTasks.find(t => t.id === id) : null;

  document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : 'Add New Task';
  document.getElementById('t-title').value = task?.title || '';
  document.getElementById('t-desc').value = task?.description || '';
  document.getElementById('t-priority').value = task?.priority || 'medium';
  document.getElementById('t-status').value = task?.status || 'pending';
  // Due date field - handle Firebase Timestamp
  if (task?.dueDate) {
    try {
      console.log('🔍 Debug: task.dueDate:', task.dueDate);
      const d = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      console.log('🔍 Debug: converted date:', d);
      const dueDateValue = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
      console.log('🔍 Debug: dueDateValue:', dueDateValue);
      document.getElementById('t-due').value = dueDateValue;
      console.log('🔍 Debug: Set due date field to:', document.getElementById('t-due').value);
    } catch (e) { 
      console.error('❌ Debug: Due date conversion error:', e);
      document.getElementById('t-due').value = ''; 
    }
  } else {
    console.log('🔍 Debug: No due date found');
    document.getElementById('t-due').value = '';
  }
  document.getElementById('t-project-site').value = task?.projectSiteName || '';
  document.getElementById('t-project-zoho').value = task?.projectZohoUrl || '';
  document.getElementById('t-notes').value = task?.notes || '';
  document.getElementById('t-type').value = task?.taskType || '';
  document.getElementById('t-user-name').value = task?.userName || '';

  // Time field
  if (task?.taskTime) {
    try {
      const d = task.taskTime.toDate ? task.taskTime.toDate() : new Date(task.taskTime);
      document.getElementById('t-time').value = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    } catch { document.getElementById('t-time').value = ''; }
  } else {
    document.getElementById('t-time').value = '';
  }

  // Assign to dropdown — only Super Admin
  const assignGroup = document.getElementById('assign-to-group');
  if (isSuperAdmin) {
    assignGroup.style.display = 'block';
    populateAssigneeDropdown(task?.assignedToUid);
  } else {
    assignGroup.style.display = 'none';
  }

  openModal('task-modal');
}

// PROJECT MODAL
function openProjectModal(id = null, viewMode = false) {
  editingProjectId = id;
  const proj = id ? allProjects.find(p => p.id === id) : null;

  document.getElementById('project-modal-title').textContent = viewMode ? 'View Project' : (proj ? 'Edit Project' : 'Add Project');
  document.getElementById('p-name').value = proj?.projectName || '';
  document.getElementById('p-zoho').value = proj?.zohoLink || '';
  document.getElementById('p-notes').value = proj?.notes || '';
  document.getElementById('p-status').value = proj?.status || 'pending';
  document.getElementById('p-bugs-found').value = proj?.bugsFound || '';
  document.getElementById('p-bugs-done').value = proj?.bugsDone || '';
  document.getElementById('p-ignored').value = proj?.ignored || '';
  document.getElementById('p-live').value = proj?.asPerLive || '';
  document.getElementById('p-checklist-url').value = proj?.checklistUrl || '';
  document.getElementById('p-pre-qa-done').checked = proj?.preQaDone || false;

  // If view mode, make all fields readonly
  const fields = ['p-name', 'p-zoho', 'p-notes', 'p-status', 'p-bugs-found', 'p-bugs-done', 'p-ignored', 'p-live', 'p-checklist-url', 'p-pre-qa-done'];
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.readOnly = viewMode;
      field.disabled = viewMode && field.type === 'checkbox';
    }
  });

  // Show/hide save button based on view mode
  const saveBtn = document.querySelector('#project-modal .save-btn');
  if (saveBtn) saveBtn.style.display = viewMode ? 'none' : 'inline-block';

  openModal('project-modal');
}

// USER MODAL
function openUserModal(id = null) {
  console.log('👤 openUserModal() called with id:', id);
  
  editingUserId = id;
  const user = id ? allUsers.find(u => u.id === id) : null;
  
  console.log('👤 Found user:', user);

  const titleEl = document.getElementById('user-modal-title');
  const nameEl = document.getElementById('u-name');
  const emailEl = document.getElementById('u-email');
  const roleEl = document.getElementById('u-role');
  
  if (!titleEl || !nameEl || !emailEl || !roleEl) {
    console.error('❌ User modal elements not found');
    return;
  }
  
  titleEl.textContent = user ? 'Edit User' : 'Create User';
  nameEl.value = user?.name || '';
  emailEl.value = user?.email || '';
  roleEl.value = user?.role || 'user';
  
  // Handle password field for edit vs create
  const passwordInput = document.getElementById('u-password');
  const passwordGroup = document.getElementById('password-group');
  const passwordRequirements = document.getElementById('password-requirements');
  
  if (user) {
    // Edit mode - hide password field
    passwordInput.value = '';
    passwordGroup.style.display = 'none';
    passwordRequirements.style.display = 'none';
  } else {
    // Create mode - show password field
    passwordInput.value = '';
    passwordGroup.style.display = 'block';
    passwordRequirements.style.display = 'block';
    // Reset requirement colors
    document.getElementById('req-length').style.color = 'var(--text-muted)';
    document.getElementById('req-letter').style.color = 'var(--text-muted)';
    document.getElementById('req-number').style.color = 'var(--text-muted)';
  }
  
  console.log('👤 Modal filled with data:', { title: titleEl.textContent, name: nameEl.value, email: emailEl.value, role: roleEl.value });

  openModal('user-modal');
}

function editUser(id) {
  console.log('✏️ editUser() called with id:', id);
  openUserModal(id);
}

function toggleUserStatus(userId, currentStatus) {
  console.log('🔄 toggleUserStatus() called:', { userId, currentStatus });
  
  // Only super admin can toggle status
  if (!isSuperAdmin) {
    showToast('Only Super Admin can change user status.', 'error');
    return;
  }
  
  // Don't allow self-status change
  if (userId === currentUser?.uid) {
    showToast('You cannot change your own status.', 'error');
    return;
  }
  
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  // Direct update without confirmation for toggle switch
  try {
    console.log('🔄 Updating user status:', { userId, newStatus });
    
    firebase.firestore().collection('users').doc(userId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      console.log('✅ User status updated successfully!');
      showToast(`User status changed to ${newStatus}.`, 'success');
      
      // If user was deactivated, force logout
      if (newStatus === 'inactive') {
        showToast('User will be logged out on next login attempt.', 'info');
      }
    }).catch(e => {
      console.error('❌ Status toggle error:', e);
      showToast('Error: ' + e.message, 'error');
    });
    
  } catch(e) {
    console.error('❌ Status toggle error:', e);
    showToast('Error: ' + e.message, 'error');
  }
}

// EXCEL ENTRY MODAL
function openManualEntryModal() {
  document.getElementById('e-task').value = '';
  document.getElementById('e-project').value = '';
  document.getElementById('e-version').value = '';
  document.getElementById('e-found').value = '';
  document.getElementById('e-done').value = '';
  document.getElementById('e-ignored').value = '';
  document.getElementById('e-live').value = '';
  document.getElementById('e-notes').value = '';
  document.getElementById('excel-modal-error').style.display = 'none';

  openModal('excel-modal');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 TOAST NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    info: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 CONFIRM DIALOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openConfirm(text, cb) {
  document.getElementById('confirm-text').innerHTML = text;
  confirmCallback = cb;
  openModal('confirm-modal');
  document.getElementById('confirm-ok-btn').onclick = () => {
    closeModal('confirm-modal');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 TAB NAVIGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const tabMeta = {
  dashboard:  { title: 'Dashboard',        sub: 'System overview and statistics',      search: false },
  tasks:      { title: 'Tasks',            sub: 'Manage and track all your tasks',         search: true  },
  projects:   { title: 'Project Details',  sub: 'QC project tracking with bug counts',     search: true  },
  manageexcel:{ title: 'Manage Excel',     sub: 'Version-wise completed projects log',     search: false },
  users:       { title: 'User Management',  sub: 'Manage team members and permissions',     search: false },
};

function switchTab(tab) {
  console.log('🔄 Switching to tab:', tab);
  
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[onclick="switchTab('${tab}')"]`)?.classList.add('active');

  // Update tabs
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');

  // Update topbar
  const meta = tabMeta[tab] || {};
  document.getElementById('topbar-title').textContent = meta.title || tab;
  document.getElementById('topbar-sub').textContent   = meta.sub || '';

  // Search box
  const searchBox = document.getElementById('search-box');
  const actionBtn = document.getElementById('topbar-action-btn');
  searchBox.style.display = meta.search ? 'flex' : 'none';
  actionBtn.style.display = 'none';
  document.getElementById('search-input').value = '';
  searchQuery = '';

  // Re-render content for the active tab to ensure buttons work properly
  if (tab === 'tasks') {
    setTimeout(() => {
      console.log('🔄 Re-rendering tasks after tab switch');
      renderTasks();
      // Also re-attach event listeners after a short delay
      setTimeout(() => {
        const tbody = document.getElementById('tasks-body');
        if (tbody) {
          const actionButtons = tbody.querySelectorAll('.action-btn');
          console.log('🔧 Re-attaching listeners to', actionButtons.length, 'buttons');
        }
      }, 50);
    }, 200);
  } else if (tab === 'projects') {
    setTimeout(() => {
      console.log('🔄 Re-rendering projects after tab switch');
      renderProjects();
    }, 200);
  }
}

function handleSearch() {
  searchQuery = document.getElementById('search-input').value.toLowerCase();
  const activeTab = document.querySelector('.tab-pane.active')?.id;
  if (activeTab === 'tab-tasks')    renderTasks();
  if (activeTab === 'tab-projects') renderProjects();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function esc(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
  } catch { return ''; }
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  } catch { return ''; }
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  } catch { return ''; }
}

function formatDateFull(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function populateAssigneeDropdown(selectedUid = null) {
  const sel = document.getElementById('t-assignee');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select user...</option>';
  allUsers.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name + (u.id === currentUser?.uid ? ' (You)' : '');
    if (u.id === selectedUid) opt.selected = true;
    sel.appendChild(opt);
  });
}

function viewTaskDetails(id) {
  console.log('🔍 viewTaskDetails() called with id:', id);
  const task = allTasks.find(t => t.id === id);
  if (!task) {
    console.log('❌ Task not found for id:', id);
    return;
  }
  console.log('✅ Task found:', task.title);

  const content = document.getElementById('task-view-content');
  content.innerHTML = `
    <div class="task-detail-view">
      <div class="detail-section">
        <h3>📋 Task Information</h3>
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span class="detail-value">${esc(task.title)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Description:</span>
          <span class="detail-value">${esc(task.description || '—')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Priority:</span>
          <span class="detail-value"><span class="badge badge-${task.priority}">${capitalize(task.priority)}</span></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value"><span class="badge badge-${task.status}">${capitalize(task.status)}</span></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Task Type:</span>
          <span class="detail-value">${esc(task.taskType || '—')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Task Allocated By:</span>
          <span class="detail-value">${esc(task.userName || '—')}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>📅 Time Information</h3>
        <div class="detail-row">
          <span class="detail-label">Task Time:</span>
          <span class="detail-value">${task.taskTime ? formatTimestamp(task.taskTime) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">${task.dueDate ? formatDate(task.dueDate) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Created At:</span>
          <span class="detail-value">${task.createdAt ? formatTimestamp(task.createdAt) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Completed At:</span>
          <span class="detail-value">${task.completedAt ? formatTimestamp(task.completedAt) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time Spent:</span>
          <span class="detail-value">${task.timeSpentHours ? task.timeSpentHours + ' hours' : '—'}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>🏢 Project Information</h3>
        <div class="detail-row">
          <span class="detail-label">Project (Site) Name:</span>
          <span class="detail-value">${esc(task.projectSiteName || '—')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Project Zoho URL:</span>
          <span class="detail-value">${task.projectZohoUrl ? `<a href="${task.projectZohoUrl}" target="_blank">🔗 ${task.projectZohoUrl}</a>` : '—'}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>👤 Assignment Information</h3>
        <div class="detail-row">
          <span class="detail-label">Assigned To:</span>
          <span class="detail-value">${esc(task.assignedToName || 'Unassigned')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Created By:</span>
          <span class="detail-value">${esc(task.createdByName || 'Unknown')}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>📝 Notes</h3>
        <div class="detail-row">
          <span class="detail-label">Notes:</span>
          <span class="detail-value">${esc(task.notes || '—')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Completion Notes:</span>
          <span class="detail-value">${esc(task.completionNotes || '—')}</span>
        </div>
      </div>
    </div>
  `;

  openModal('task-view-modal');
}

function closeTaskView() {
  console.log('🔒 Closing task view modal, re-rendering tasks');
  closeModal('task-view-modal');
  // Re-render tasks to ensure event listeners are attached
  setTimeout(() => {
    console.log('🔄 Re-rendering tasks after closing task view');
    renderTasks();
  }, 100);
}

function toggleMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}

// Pagination Functions
function prevTasksPage() {
  if (tasksCurrentPage > 1) {
    tasksCurrentPage--;
    renderTasks();
  }
}

function nextTasksPage() {
  const filtered = allTasks;
  const totalPages = Math.ceil(filtered.length / tasksItemsPerPage);
  if (tasksCurrentPage < totalPages) {
    tasksCurrentPage++;
    renderTasks();
  }
}

function prevProjectsPage() {
  if (projectsCurrentPage > 1) {
    projectsCurrentPage--;
    renderProjects();
  }
}

function nextProjectsPage() {
  const filtered = allProjects;
  const totalPages = Math.ceil(filtered.length / projectsItemsPerPage);
  if (projectsCurrentPage < totalPages) {
    projectsCurrentPage++;
    renderProjects();
  }
}

// Export functions for global use
window.renderDashboard = renderDashboard;
window.renderTasks = renderTasks;
window.renderProjects = renderProjects;
window.renderExcel = renderExcel;
window.renderUsers = renderUsers;
window.openModal = openModal;
window.closeModal = closeModal;
window.openTaskModal = openTaskModal;
window.openProjectModal = openProjectModal;
window.openUserModal = openUserModal;
window.openManualEntryModal = openManualEntryModal;
window.showToast = showToast;
window.openConfirm = openConfirm;
window.switchTab = switchTab;
window.handleSearch = handleSearch;
window.esc = esc;
window.capitalize = capitalize;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatTimestamp = formatTimestamp;
window.formatDateFull = formatDateFull;
window.populateAssigneeDropdown = populateAssigneeDropdown;
window.viewTaskDetails = viewTaskDetails;
window.closeTaskView = closeTaskView;
window.toggleMobileMenu = toggleMobileMenu;
window.prevTasksPage = prevTasksPage;
window.nextTasksPage = nextTasksPage;
window.prevProjectsPage = prevProjectsPage;
window.nextProjectsPage = nextProjectsPage;
