// Task Recovery Script - Fix corrupted assignedToUid values
// Run this in browser console as Super Admin to fix hidden tasks

async function recoverHiddenTasks() {
  console.log('🔧 Starting task recovery...');
  
  try {
    // Get all tasks
    const allTasksSnapshot = await firebase.firestore().collection('tasks').get();
    const allTasks = allTasksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`📋 Found ${allTasks.length} total tasks`);
    
    // Find tasks with corrupted assignedToUid
    const corruptedTasks = allTasks.filter(task => {
      return !task.assignedToUid || 
             task.assignedToUid === '' || 
             task.assignedToUid === 'undefined' ||
             task.assignedToUid === 'null';
    });
    
    console.log(`🚨 Found ${corruptedTasks.length} corrupted tasks:`, corruptedTasks.map(t => ({ id: t.id, title: t.title, assignedToUid: t.assignedToUid })));
    
    if (corruptedTasks.length === 0) {
      console.log('✅ No corrupted tasks found!');
      return;
    }
    
    // Get all users to find potential assignees
    const usersSnapshot = await firebase.firestore().collection('users').get();
    const allUsers = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`👥 Found ${allUsers.length} users`);
    
    // Fix each corrupted task
    let fixedCount = 0;
    for (const task of corruptedTasks) {
      try {
        // Try to find the original assignee from assignedToName
        let assignedToUid = null;
        let assignedToName = task.assignedToName || 'Unassigned';
        
        if (task.assignedToName) {
          const userByName = allUsers.find(u => u.name === task.assignedToName);
          if (userByName) {
            assignedToUid = userByName.id;
            assignedToName = userByName.name;
          }
        }
        
        // If still not found, assign to first user (or keep as is)
        if (!assignedToUid && allUsers.length > 0) {
          assignedToUid = allUsers[0].id;
          assignedToName = allUsers[0].name;
        }
        
        // Update the task
        await firebase.firestore().collection('tasks').doc(task.id).update({
          assignedToUid: assignedToUid,
          assignedToName: assignedToName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Fixed task: ${task.title} → assigned to ${assignedToName}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to fix task ${task.id}:`, error);
      }
    }
    
    console.log(`🎉 Recovery complete! Fixed ${fixedCount} out of ${corruptedTasks.length} corrupted tasks`);
    console.log('🔄 Please refresh the page to see the fixed tasks');
    
  } catch (error) {
    console.error('❌ Recovery failed:', error);
  }
}

// Auto-run the recovery
recoverHiddenTasks();
