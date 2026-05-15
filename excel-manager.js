// Excel Export & Import Manager
function exportTasksToExcel() {
  console.log('📊 Exporting tasks to Excel...');
  
  try {
    // Get tasks to export (all tasks for super admin, assigned tasks for normal user)
    let tasksToExport = isSuperAdmin ? allTasks : allTasks.filter(t => t.assignedToUid === currentUser?.uid);
    
    if (!tasksToExport || tasksToExport.length === 0) {
      showToast('No tasks to export!', 'error');
      return;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const excelData = tasksToExport.map((task, index) => {
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
      { wch: 8 },  // Task ID (sequential number)
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
    
    // Add conditional formatting for status
    const statusColIndex = 4; // Status column
    for (let row = 1; row <= excelData.length; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: statusColIndex });
      if (!ws[cellAddress]) continue;
      
      const status = ws[cellAddress].v;
      let fillColor = "FFFFFF";
      
      if (status === 'complete') {
        fillColor = "70AD47"; // Green
      } else if (status === 'inprocess') {
        fillColor = "FFC000"; // Yellow
      } else if (status === 'pending') {
        fillColor = "5B9BD5"; // Blue
      }
      
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    
    // Add conditional formatting for priority
    const priorityColIndex = 3; // Priority column
    for (let row = 1; row <= excelData.length; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: priorityColIndex });
      if (!ws[cellAddress]) continue;
      
      const priority = ws[cellAddress].v;
      let fillColor = "FFFFFF";
      
      if (priority === 'high') {
        fillColor = "FF0000"; // Red
      } else if (priority === 'medium') {
        fillColor = "FFC000"; // Yellow
      } else if (priority === 'low') {
        fillColor = "70AD47"; // Green
      }
      
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Tasks_Export_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    showToast(`Successfully exported ${tasksToExport.length} tasks to Excel!`, 'success');
    console.log(`✅ Exported ${tasksToExport.length} tasks to ${filename}`);
    
  } catch (error) {
    console.error('❌ Export error:', error);
    showToast('Failed to export tasks. Please try again.', 'error');
  }
}

function importTasksFromExcel(file) {
  console.log('📊 Importing tasks from Excel...');
  
  if (!file) {
    showToast('Please select an Excel file to import!', 'error');
    return;
  }
  
  // Check file type
  if (!file.name.match(/\.(xlsx|xls)$/)) {
    showToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
    return;
  }
  
  // Check file size (10MB limit)
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeInBytes) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showToast(`File size (${fileSizeMB}MB) exceeds the 10MB limit. Please select a smaller file.`, 'error');
    return;
  }
  
  // Check if file is empty
  if (file.size === 0) {
    showToast('The selected file is empty. Please select a valid Excel file.', 'error');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Validate if it's a proper Excel file
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        showToast('Invalid Excel file format. The file appears to be corrupted or not a valid Excel file.', 'error');
        return;
      }
      
      // Get first worksheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Check if worksheet has data
      if (!firstSheet || !firstSheet['!ref']) {
        showToast('The Excel file is empty or has no valid data.', 'error');
        return;
      }
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (!jsonData || jsonData.length === 0) {
        showToast('No data found in Excel file! Please ensure your Excel file has task data in the first worksheet.', 'error');
        return;
      }
      
      // Validate Excel structure
      const requiredColumns = ['Title'];
      const missingColumns = requiredColumns.filter(col => !(col in jsonData[0]));
      
      if (missingColumns.length > 0) {
        showToast(`Invalid Excel format. Missing required columns: ${missingColumns.join(', ')}. Please use the exported Excel format as reference.`, 'error');
        return;
      }
      
      console.log(`📋 Found ${jsonData.length} tasks in Excel file`);
      
      // Process and import tasks
      let importedCount = 0;
      let skippedCount = 0;
      
      jsonData.forEach(async (row, index) => {
        try {
          // Validate required fields
          if (!row['Title'] || row['Title'].toString().trim() === '') {
            console.log(`⚠️ Skipping row ${index + 1}: No title provided`);
            skippedCount++;
            return;
          }
          
          // Validate title length
          const title = row['Title'].toString().trim();
          if (title.length > 200) {
            console.log(`⚠️ Skipping row ${index + 1}: Title too long (max 200 characters)`);
            skippedCount++;
            return;
          }
          
          // Validate description length if exists
          if (row['Description'] && row['Description'].toString().length > 1000) {
            console.log(`⚠️ Skipping row ${index + 1}: Description too long (max 1000 characters)`);
            skippedCount++;
            return;
          }
          
          // Prepare task data
          const taskData = {
            title: row['Title']?.toString().trim() || '',
            description: row['Description']?.toString().trim() || '',
            priority: row['Priority']?.toString().toLowerCase() || 'medium',
            status: row['Status']?.toString().toLowerCase() || 'pending',
            taskType: row['Task Type']?.toString().trim() || '',
            userName: row['Task Allocated By']?.toString().trim() || '',
            projectSiteName: row['Project (Site) Name']?.toString().trim() || '',
            projectZohoUrl: row['Project Zoho URL']?.toString().trim() || '',
            assignedToName: row['Assigned To']?.toString().trim() || 'Unassigned',
            completionNotes: row['Completion Notes']?.toString().trim() || '',
            notes: row['Notes']?.toString().trim() || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdByUid: currentUser.uid,
            createdByName: currentProfile.name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          // Validate priority
          if (!['high', 'medium', 'low'].includes(taskData.priority)) {
            taskData.priority = 'medium';
          }
          
          // Validate status
          if (!['pending', 'inprocess', 'complete'].includes(taskData.status)) {
            taskData.status = 'pending';
          }
          
          // Handle assigned user
          if (taskData.assignedToName !== 'Unassigned' && allUsers.length > 0) {
            const assignedUser = allUsers.find(u => u.name === taskData.assignedToName);
            if (assignedUser) {
              taskData.assignedToUid = assignedUser.id;
            } else {
              taskData.assignedToUid = currentUser.uid;
              taskData.assignedToName = currentProfile.name;
            }
          } else {
            taskData.assignedToUid = currentUser.uid;
            taskData.assignedToName = currentProfile.name;
          }
          
          // Handle dates
          if (row['Due Date']) {
            const dueDate = new Date(row['Due Date']);
            if (!isNaN(dueDate.getTime())) {
              taskData.dueDate = firebase.firestore.Timestamp.fromDate(dueDate);
            }
          }
          
          // Handle completion data
          if (taskData.status === 'complete') {
            if (row['Completed Date']) {
              const completedDate = new Date(row['Completed Date']);
              if (!isNaN(completedDate.getTime())) {
                taskData.completedAt = firebase.firestore.Timestamp.fromDate(completedDate);
              }
            }
            
            if (row['Time Spent (Hours)']) {
              const timeSpent = parseFloat(row['Time Spent (Hours)']);
              if (!isNaN(timeSpent)) {
                taskData.timeSpentHours = timeSpent;
              }
            }
            
            taskData.completedByUid = currentUser.uid;
            taskData.completedByName = currentProfile.name;
          }
          
          // Save to Firebase
          const importedTaskRef = await firebase.firestore().collection('tasks').add(taskData);
          importedCount++;

          // Sheet Tracker entry for imported task
          try {
            await firebase.firestore().collection('sheetTracker').add({
              taskName: taskData.title,
              projectName: taskData.projectSiteName || '',
              checklistUrl: null,
              zohoUrl: taskData.projectZohoUrl || null,
              taskId: importedTaskRef.id,
              createdByUid: currentUser.uid,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          } catch(sheetErr) {
            console.error('Sheet Tracker entry error:', sheetErr);
          }

          console.log(`✅ Imported task: ${taskData.title}`);
          
        } catch (error) {
          console.error(`❌ Error importing row ${index + 1}:`, error);
          skippedCount++;
        }
      });
      
      // Show results
      setTimeout(() => {
        showToast(`Import completed! ${importedCount} tasks imported, ${skippedCount} skipped.`, 'success');
        console.log(`🎉 Import complete: ${importedCount} imported, ${skippedCount} skipped`);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Excel processing error:', error);
      showToast('Failed to process Excel file. Please check the format.', 'error');
    }
  };
  
  reader.onerror = function() {
    showToast('Failed to read Excel file! The file may be corrupted or in an unsupported format.', 'error');
  };
  
  reader.readAsArrayBuffer(file);
}

// Setup file input for Excel import
function setupExcelImport() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.xls';
  fileInput.style.display = 'none';
  fileInput.id = 'excel-import-input';
  
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      importTasksFromExcel(file);
    }
    // Reset input
    e.target.value = '';
  });
  
  document.body.appendChild(fileInput);
}

// Trigger Excel import dialog
function triggerExcelImport() {
  const fileInput = document.getElementById('excel-import-input');
  if (fileInput) {
    fileInput.click();
  } else {
    setupExcelImport();
    setTimeout(() => {
      document.getElementById('excel-import-input').click();
    }, 100);
  }
}

// Export single task to Excel
function exportSingleTaskToExcel(taskId) {
  console.log('📊 Exporting single task to Excel...');
  
  try {
    // Find the task
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
      showToast('Task not found!', 'error');
      return;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const createdDate = task.createdAt ? formatDate(task.createdAt) : '';
    const createdTime = task.createdAt ? formatTime(task.createdAt) : '';
    const dueDate = task.dueDate ? formatDate(task.dueDate) : '';
    const completedDate = task.completedAt ? formatDate(task.completedAt) : '';
    
    const excelData = [{
      'Task ID': 1,
      'Title': task.title || '',
      'Description': task.description || '',
      'Priority': task.priority || '',
      'Status': task.status || '',
      'Assigned To': task.assignedToName || 'Unassigned',
      'Created Date': createdDate,
      'Created Time': createdTime,
      'Created By': task.createdByName || 'Unknown',
      'Due Date': dueDate,
      'Completed Date': completedDate,
      'Time Spent (Hours)': task.timeSpentHours !== undefined && task.timeSpentHours !== null ? task.timeSpentHours : 0,
      'Completion Notes': task.completionNotes || ''
    }];
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 },  // Task ID (sequential number)
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
    
    // Add conditional formatting for status
    const statusColIndex = 4; // Status column
    const cellAddress = XLSX.utils.encode_cell({ r: 1, c: statusColIndex });
    if (ws[cellAddress]) {
      const status = ws[cellAddress].v;
      let fillColor = "FFFFFF";
      
      if (status === 'complete') {
        fillColor = "70AD47"; // Green
      } else if (status === 'inprocess') {
        fillColor = "FFC000"; // Yellow
      } else if (status === 'pending') {
        fillColor = "5B9BD5"; // Blue
      }
      
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    
    // Add conditional formatting for priority
    const priorityColIndex = 3; // Priority column
    const priorityCellAddress = XLSX.utils.encode_cell({ r: 1, c: priorityColIndex });
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
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Task");
    
    // Generate filename with task title and timestamp
    const cleanTitle = task.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Task_${cleanTitle}_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    showToast(`Successfully exported task "${task.title}" to Excel!`, 'success');
    console.log(`✅ Exported task "${task.title}" to ${filename}`);
    
  } catch (error) {
    console.error('❌ Export error:', error);
    showToast('Failed to export task. Please try again.', 'error');
  }
}

// Export functions
window.exportTasksToExcel = exportTasksToExcel;
window.exportSingleTaskToExcel = exportSingleTaskToExcel;
window.importTasksFromExcel = importTasksFromExcel;
window.triggerExcelImport = triggerExcelImport;
window.setupExcelImport = setupExcelImport;

// Auto-setup import on page load
document.addEventListener('DOMContentLoaded', function() {
  setupExcelImport();
});
