// ═════════════════════════════════════════
// AQE QC SYSTEM - PROJECT IMPORT/EXPORT FUNCTIONS
// ═══════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 PROJECT EXPORT FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function exportProjectsToExcel() {
  try {
    if (allProjects.length === 0) {
      showToast('No projects to export.', 'error');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(allProjects.map(p => ({
      'Project Name': p.projectName || '',
      'Zoho Link': p.zohoLink || '',
      'Status': p.status || '',
      '🐛 Bugs Found': p.bugsFound || 0,
      '✅ Bugs Done': p.bugsDone || 0,
      '🚫 Ignored': p.ignored || 0,
      '🟢 As Per Live': p.asPerLive || 0,
      'Pre QC Done': p.preQaDone ? 'Yes' : 'No',
      'Checklist URL': p.checklistUrl || '',
      'Notes': p.notes || '',
      'Imported By': p.importedByName || '',
      'Imported At': formatDateFull(p.importedAt),
      'Updated At': formatDateFull(p.updatedAt)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    const fileName = `AQE_Projects_${formatDateFull(new Date()).replace(/[:\s/]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showToast(`Exported ${allProjects.length} projects successfully.`, 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting projects: ' + error.message, 'error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📥 PROJECT IMPORT FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function triggerProjectsImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.style.display = 'none';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      validateAndImportProjects(file);
    }
  };
  
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

function validateAndImportProjects(file) {
  // File size validation (15MB limit)
  const maxSize = 15 * 1024 * 1024; // 15MB in bytes
  if (file.size > maxSize) {
    showToast('File size exceeds 15MB limit. Please choose a smaller file.', 'error');
    return;
  }

  // File type validation
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  
  if (!validTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload an Excel file (.xlsx or .xls).', 'error');
    return;
  }

  // Show loading state
  showToast('Processing file...', 'info');
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      importProjectsData(jsonData);
    } catch (error) {
      console.error('File reading error:', error);
      showToast('Error reading file: ' + error.message, 'error');
    }
  };
  
  reader.onerror = function() {
    showToast('Error reading file. Please try again.', 'error');
  };
  
  reader.readAsArrayBuffer(file);
}

function importProjectsData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    showToast('No valid data found in file.', 'error');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) {
        continue;
      }

      // Validate required fields
      const projectName = row['Project Name'] || row['ProjectName'] || row['project_name'] || '';
      if (!projectName || projectName.toString().trim() === '') {
        errors.push(`Row ${i + 1}: Project Name is required`);
        errorCount++;
        continue;
      }

      const projectData = {
        projectName: projectName.toString().trim(),
        zohoLink: (row['Zoho Link'] || row['Zoho Project Link'] || row['ZohoLink'])?.toString().trim() || '',
        status: (row['Status'] || row['status'])?.toString().toLowerCase() || 'pending',
        bugsFound: parseInt(row['🐛 Bugs Found'] || row['Bugs Found'] || row['bugsFound']) || 0,
        bugsDone: parseInt(row['✅ Bugs Done'] || row['Bugs Done'] || row['bugsDone']) || 0,
        ignored: parseInt(row['🚫 Ignored'] || row['Ignored'] || row['ignored']) || 0,
        asPerLive: parseInt(row['🟢 As Per Live'] || row['As Per Live'] || row['asPerLive']) || 0,
        preQaDone: (row['Pre QC Done'] || row['Pre QC Done'] || row['preQaDone'])?.toString().toLowerCase() === 'yes',
        checklistUrl: (row['Checklist URL'] || row['ChecklistUrl'] || row['checklistUrl'])?.toString().trim() || '',
        notes: (row['Notes'] || row['notes'])?.toString().trim() || '',
        importedByUid: currentUser.uid,
        importedByName: currentProfile.name,
        importedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Validate status
      const validStatuses = ['pending', 'ongoing', 'complete'];
      if (!validStatuses.includes(projectData.status)) {
        projectData.status = 'pending';
      }

      // Save to Firebase
      firebase.firestore().collection('projects').add(projectData).then(projRef => {
        // Sheet Tracker entry for imported project
        firebase.firestore().collection('sheetTracker').add({
          taskName: projectData.projectName,
          projectName: projectData.projectName,
          checklistUrl: projectData.checklistUrl || null,
          zohoUrl: projectData.zohoLink || null,
          taskId: null,
          createdByUid: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(sheetErr => console.error('Sheet Tracker entry error:', sheetErr));
      });
      successCount++;
      
    } catch (error) {
      console.error(`Error importing row ${i + 1}:`, error);
      errors.push(`Row ${i + 1}: ${error.message}`);
      errorCount++;
    }
  }

  // Show results
  if (successCount > 0) {
    showToast(`Successfully imported ${successCount} projects.`, 'success');
  }
  
  if (errorCount > 0) {
    console.error('Import errors:', errors);
    showToast(`${errorCount} projects had errors and were not imported.`, 'warning');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 BULK OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function toggleAllProjects() {
  const selectAll = document.getElementById('select-all-projects');
  const checkboxes = document.querySelectorAll('.project-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
  
  updateProjectSelection();
}

function updateProjectSelection() {
  const checkboxes = document.querySelectorAll('.project-checkbox:checked');
  const count = checkboxes.length;
  
  const countElement = document.getElementById('selected-projects-count');
  if (countElement) {
    countElement.textContent = count;
  }
  
  // Show/hide bulk actions
  const multiSelectActions = document.getElementById('project-multi-select-actions');
  if (multiSelectActions) {
    multiSelectActions.style.display = count > 0 ? 'flex' : 'none';
  }
}

function getSelectedProjectIds() {
  const checkboxes = document.querySelectorAll('.project-checkbox:checked');
  console.log('🗑️ Found checked checkboxes:', checkboxes.length);
  
  const ids = [];
  checkboxes.forEach(cb => {
    if (cb.dataset && cb.dataset.id) {
      ids.push(cb.dataset.id);
      console.log('🗑️ Checkbox ID:', cb.dataset.id, 'Name:', cb.dataset.name || 'Unknown');
    }
  });
  console.log('🗑️ Final selected IDs:', ids);
  return ids;
}

async function bulkDeleteProjects() {
  console.log('🗑️ bulkDeleteProjects() called');
  const selectedIds = getSelectedProjectIds();
  console.log('🗑️ Selected IDs:', selectedIds);

  if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
    console.log('❌ No projects selected');
    showToast('Please select projects to delete.', 'error');
    return;
  }

  // Ensure allProjects and allExcel are arrays
  const projectsArray = Array.isArray(allProjects) ? allProjects : [];
  const excelArray = Array.isArray(allExcel) ? allExcel : [];
  console.log('🗑️ Projects array length:', projectsArray.length, 'Excel array length:', excelArray.length);

  // Use simple for loops instead of filter to avoid indexOf issues
  const selectedProjects = [];
  const selectedExcelEntries = [];

  for (let i = 0; i < projectsArray.length; i++) {
    if (projectsArray[i] && projectsArray[i].id && selectedIds.includes(projectsArray[i].id)) {
      selectedProjects.push(projectsArray[i]);
      console.log('🗑️ Found selected project:', projectsArray[i].projectName);
    }
  }

  for (let i = 0; i < excelArray.length; i++) {
    if (excelArray[i] && excelArray[i].id && selectedIds.includes(excelArray[i].id)) {
      selectedExcelEntries.push(excelArray[i]);
      console.log('🗑️ Found selected excel entry:', excelArray[i].taskName || excelArray[i].projectName);
    }
  }

  console.log('🗑️ Selected projects count:', selectedProjects.length, 'Selected excel entries count:', selectedExcelEntries.length);

  // Delete from projects collection
  if (selectedProjects.length > 0) {
    const projectNames = selectedProjects.map(p => p.projectName || 'Unknown').filter(n => n).join(', ');
    const message = `Delete ${selectedProjects.length} project(s): "${projectNames}"?`;
    console.log('🗑️ Showing project delete confirmation:', message);
    openConfirm(message, async () => {
      console.log('🗑️ Project delete confirmed, deleting', selectedProjects.length, 'projects');
      try {
        const deletePromises = selectedProjects.map(p =>
          firebase.firestore().collection('projects').doc(p.id).delete()
        );
        await Promise.all(deletePromises);

        // Delete linked Sheet Tracker entries for each project
        for (const p of selectedProjects) {
          const stSnap = await firebase.firestore().collection('sheetTracker')
            .where('projectName', '==', p.projectName).get();
          stSnap.forEach(doc => {
            if (!doc.data().taskId) doc.ref.delete();
          });
        }

        showToast(`Deleted ${selectedProjects.length} projects successfully.`, 'success');

        // Clear selection
        const selectAllCheckbox = document.getElementById('select-all-projects');
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          console.log('🗑️ Cleared project selection checkbox');
        }
        updateProjectSelection();
      } catch (error) {
        console.error('❌ Bulk delete error:', error);
        showToast('Error deleting projects: ' + error.message, 'error');
      }
    });
    return;
  }

  // Delete from manageExcel collection
  if (selectedExcelEntries.length > 0) {
    const entryNames = selectedExcelEntries.map(e => e.projectName || e.taskName || 'Unknown').filter(n => n).join(', ');
    const message = `Delete ${selectedExcelEntries.length} completion entry/ies: "${entryNames}"?`;
    console.log('🗑️ Showing excel entry delete confirmation:', message);
    openConfirm(message, async () => {
      console.log('🗑️ Excel entry delete confirmed, deleting', selectedExcelEntries.length, 'entries');
      try {
        const deletePromises = selectedExcelEntries.map(e =>
          db.collection('manageExcel').doc(e.id).delete()
        );
        await Promise.all(deletePromises);

        // Delete linked Sheet Tracker entries
        for (const e of selectedExcelEntries) {
          if (e.taskId) {
            const stSnap = await firebase.firestore().collection('sheetTracker').where('taskId', '==', e.taskId).get();
            stSnap.forEach(doc => doc.ref.delete());
          } else if (e.taskName) {
            const stSnap = await firebase.firestore().collection('sheetTracker')
              .where('taskName', '==', e.taskName)
              .where('projectName', '==', e.projectName || '').get();
            stSnap.forEach(doc => doc.ref.delete());
          }
        }

        showToast(`Deleted ${selectedExcelEntries.length} entries successfully.`, 'success');

        // Clear selection
        const selectAllCheckbox = document.getElementById('select-all-projects');
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          console.log('🗑️ Cleared excel selection checkbox');
        }
        updateProjectSelection();
      } catch (error) {
        console.error('❌ Bulk delete error:', error);
        showToast('Error deleting entries: ' + error.message, 'error');
      }
    });
    return;
  }

  showToast('No valid items selected for deletion.', 'error');
}

async function bulkExportProjects() {
  const selectedIds = getSelectedProjectIds();
  
  if (selectedIds.length === 0) {
    showToast('Please select projects to export.', 'error');
    return;
  }

  try {
    const selectedProjects = allProjects.filter(p => selectedIds.includes(p.id));
    
    const worksheet = XLSX.utils.json_to_sheet(selectedProjects.map(p => ({
      'Project Name': p.projectName || '',
      'Zoho Link': p.zohoLink || '',
      'Status': p.status || '',
      '🐛 Bugs Found': p.bugsFound || 0,
      '✅ Bugs Done': p.bugsDone || 0,
      '🚫 Ignored': p.ignored || 0,
      '🟢 As Per Live': p.asPerLive || 0,
      'Pre QC Done': p.preQaDone ? 'Yes' : 'No',
      'Checklist URL': p.checklistUrl || '',
      'Notes': p.notes || '',
      'Imported By': p.importedByName || '',
      'Imported At': formatDateFull(p.importedAt),
      'Updated At': formatDateFull(p.updatedAt)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Projects');

    const fileName = `AQE_Selected_Projects_${formatDateFull(new Date()).replace(/[:\s/]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showToast(`Exported ${selectedProjects.length} selected projects.`, 'success');
  } catch (error) {
    console.error('Bulk export error:', error);
    showToast('Error exporting projects: ' + error.message, 'error');
  }
}

// Export functions to window
window.exportProjectsToExcel = exportProjectsToExcel;
window.triggerProjectsImport = triggerProjectsImport;
window.toggleAllProjects = toggleAllProjects;
window.updateProjectSelection = updateProjectSelection;
window.bulkDeleteProjects = bulkDeleteProjects;
window.bulkExportProjects = bulkExportProjects;
