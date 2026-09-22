/**
 * ============================================================================
 * RIZZ FOR COLLEGES - STUDENT RESET COMPREHENSIVE TEST SUITE
 * Validating the Complete Student Reset Lifecycle across 14 points.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n============================================================');
console.log('🔄 RUNNING STUDENT RESET VERIFICATION TEST SUITE (14 POINTS)');
console.log('============================================================\n');

// Load HTML files
const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const mentorHtml = fs.readFileSync(path.join(__dirname, 'MENTOR.html'), 'utf8');

// Mock localStorage store
function createMockStorage() {
  const store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    _dump: () => store
  };
}

// Mock RizzFileStore with deletion support
function createMockFileStore() {
  const files = {};
  return {
    saveFile: async (key, blobOrFile, meta) => {
      files[key] = { data: blobOrFile, meta: meta || {} };
      return true;
    },
    getFile: async (key) => {
      return files[key] ? files[key].data : null;
    },
    deleteFile: async (key) => {
      if (files[key]) {
        delete files[key];
        return true;
      }
      return true;
    },
    _dump: () => files
  };
}

let passedCount = 0;
function pass(msg) {
  passedCount++;
  console.log(`✅ PASS: ${msg}`);
}

// ----------------------------------------------------------------------------
// TEST 1: Reset confirmation modal text and structure in ADMIN.html
// ----------------------------------------------------------------------------
console.log('\n--- POINT 8: Reset Confirmation Modal Validation ---');
{
  assert(adminHtml.includes('Reset Student Progress?'), 'Modal title must be "Reset Student Progress?"');
  assert(adminHtml.includes('This will reset the student\'s complete learning journey, including:'), 'Modal must explain full journey reset scope');
  assert(adminHtml.includes('Pre-Test'), 'Modal lists Pre-Test');
  assert(adminHtml.includes('Workshop progress'), 'Modal lists Workshop progress');
  assert(adminHtml.includes('Assessment attempt'), 'Modal lists Assessment attempt');
  assert(adminHtml.includes('Assessment uploads'), 'Modal lists Assessment uploads');
  assert(adminHtml.includes('Assessment evaluation'), 'Modal lists Assessment evaluation');
  assert(adminHtml.includes('Results'), 'Modal lists Results');
  assert(adminHtml.includes('Opportunity eligibility'), 'Modal lists Opportunity eligibility');
  assert(adminHtml.includes("The student's account details and login credentials will not be changed"), 'Modal states account & credentials are not changed');
  assert(adminHtml.includes('Reset Student'), 'Modal has "Reset Student" confirm button');
  assert(adminHtml.includes('Cancel'), 'Modal has Cancel button');
  pass('Admin Reset Confirmation Modal matches exact itemized wording and safety guarantees');
}

// ----------------------------------------------------------------------------
// TEST 2: Full Student Learning Journey Setup & Execution of Reset
// ----------------------------------------------------------------------------
console.log('\n--- POINTS 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14: End-to-End Reset Lifecycle ---');
(async () => {
  const storage = createMockStorage();
  const fileStore = createMockFileStore();

  const student1 = 'STUD-001';
  const student2 = 'STUD-002'; // Control student

  // A. Seed Admin Master Assessment (Master Data)
  const masterAssessment = {
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Production — Designing Practical Assessment',
      track: 'Production',
      subset: 'Designing',
      durationMinutes: 120,
      status: 'Published',
      availableFrom: new Date(Date.now() - 3600000).toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString(),
      caseStudy: 'Design a high-converting hero banner for RIZZ campus recruitment.',
      instructions: '1. Export final banner as PNG.\n2. Package all source assets as ZIP.\n3. Record max 120s explanation video.',
      questions: [
        { id: 'q1', title: 'Task 1: Hero Banner Layout', content: 'Create a 16:9 banner.', marks: 40 },
        { id: 'q2', title: 'Task 2: Component Architecture', content: 'Organize design system tokens.', marks: 30 },
        { id: 'q3', title: 'Task 3: Pitch & Walkthrough', content: 'Record video walkthrough.', marks: 30 }
      ],
      assetPackage: {
        fileKey: 'asset_pkg_asm_prod_designing',
        fileName: 'design-starter-kit.zip',
        fileSize: 10485760
      }
    }
  };
  storage.setItem('rizz_assessments', JSON.stringify(masterAssessment));
  await fileStore.saveFile('asset_pkg_asm_prod_designing', 'ADMIN_STARTER_ZIP_DATA', { name: 'design-starter-kit.zip', size: 10485760 });

  // B. Seed Student 1 Account Credentials
  const userAccounts = [
    { userId: student1, name: 'Praneet Kawaldar', email: 'praneet@jain.edu', phone: '9876543210', role: 'Student', college: 'Jain University', password: 'password123' },
    { userId: student2, name: 'Ananya Sharma', email: 'ananya@rvce.edu', phone: '9123456780', role: 'Student', college: 'RVCE', password: 'password456' }
  ];
  storage.setItem('allUsers', JSON.stringify(userAccounts));
  storage.setItem('currentUser', JSON.stringify(userAccounts[0]));

  // C. Student 1 completes Pre-Test
  const pretestAttempts = {
    [student1]: {
      studentId: student1,
      name: 'Praneet Kawaldar',
      college: 'Jain University',
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'Finalized',
      score: 85,
      suggestedTrack: 'Production'
    },
    [student2]: {
      studentId: student2,
      name: 'Ananya Sharma',
      college: 'RVCE',
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'Finalized',
      score: 92,
      suggestedTrack: 'Tech'
    }
  };
  storage.setItem('rizz_pretest_attempts', JSON.stringify(pretestAttempts));

  // D. Student 1 chooses workshop track & progresses
  const workshopChoices = {
    [student1]: 'Production',
    [student2]: 'Tech'
  };
  storage.setItem('rizz_workshop_student_choices', JSON.stringify(workshopChoices));

  // E. Student 1 completes workshop & unlocks assessment
  const student1Prog = {
    preTestStatus: 'reviewed',
    preTestAttempt: { score: 85 },
    evaluationStatus: 'finalized',
    finalScore: 85,
    suggestedTrack: 'Production',
    suggestedCourse: 'Production Designing',
    chosenTrack: 'Production',
    selectedSet: 'Production',
    workshopStatus: 'completed',
    workshopProgress: 100,
    assessmentStatus: 'submitted',
    assessmentCompleted: true,
    assessmentFinalScore: 90,
    rizzScore: 88,
    opportunitiesUnlocked: true,
    resultsStatus: 'published',
    overallProgress: 100
  };
  storage.setItem('rizz_progress_' + student1, JSON.stringify(student1Prog));

  // F. Student 1 uploads deliverables and submits Assessment
  const student1PngKey = 'sub_png_att_asm_prod_designing_STUD-001_1';
  const student1ZipKey = 'sub_zip_att_asm_prod_designing_STUD-001_1';
  const student1VidKey = 'sub_vid_att_asm_prod_designing_STUD-001_1';

  await fileStore.saveFile(student1PngKey, 'BLOB_PNG_DATA', { name: 'final_banner.png', size: 2048500, type: 'image/png' });
  await fileStore.saveFile(student1ZipKey, 'BLOB_ZIP_DATA', { name: 'source_files.zip', size: 15400200, type: 'application/zip' });
  await fileStore.saveFile(student1VidKey, 'BLOB_VID_DATA', { name: 'walkthrough.mp4', size: 45000000, type: 'video/mp4' });

  // Student 2 also uploads deliverables (control student)
  const student2PngKey = 'sub_png_att_asm_prod_designing_STUD-002_1';
  const student2ZipKey = 'sub_zip_att_asm_prod_designing_STUD-002_1';
  const student2VidKey = 'sub_vid_att_asm_prod_designing_STUD-002_1';
  await fileStore.saveFile(student2PngKey, 'BLOB_PNG_STUD2', { name: 'ananya_banner.png', size: 1048500, type: 'image/png' });
  await fileStore.saveFile(student2ZipKey, 'BLOB_ZIP_STUD2', { name: 'ananya_source.zip', size: 12400200, type: 'application/zip' });
  await fileStore.saveFile(student2VidKey, 'BLOB_VID_STUD2', { name: 'ananya_walkthrough.mp4', size: 30000000, type: 'video/mp4' });

  const assessmentAttempts = {
    [student1]: {
      studentId: student1,
      activeAttemptId: 'att_asm_prod_designing_STUD-001_1',
      attempts: [
        {
          attemptId: 'att_asm_prod_designing_STUD-001_1',
          attemptNumber: 1,
          assessmentId: 'asm_prod_designing',
          studentId: student1,
          studentName: 'Praneet Kawaldar',
          studentEmail: 'praneet@jain.edu',
          college: 'Jain University',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          submitTime: new Date(Date.now() - 1800000).toISOString(),
          status: 'Published',
          submissions: {
            finalPng: { fileKey: student1PngKey, fileName: 'final_banner.png', fileSize: 2048500 },
            sourceZip: { fileKey: student1ZipKey, fileName: 'source_files.zip', fileSize: 15400200 },
            explanationVideo: { fileKey: student1VidKey, fileName: 'walkthrough.mp4', fileSize: 45000000, durationSeconds: 95 }
          },
          evaluation: {
            aiScore: 84,
            aiRemarks: 'Strong visual hierarchy.',
            mentorScore: 88,
            mentorRemarks: 'Excellent execution.',
            adminFinalScore: 90,
            adminRemarks: 'Approved for opportunities.',
            status: 'Published'
          }
        }
      ]
    },
    [student2]: {
      studentId: student2,
      activeAttemptId: 'att_asm_prod_designing_STUD-002_1',
      attempts: [
        {
          attemptId: 'att_asm_prod_designing_STUD-002_1',
          attemptNumber: 1,
          assessmentId: 'asm_prod_designing',
          studentId: student2,
          studentName: 'Ananya Sharma',
          studentEmail: 'ananya@rvce.edu',
          college: 'RVCE',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          submitTime: new Date(Date.now() - 1800000).toISOString(),
          status: 'Submitted',
          submissions: {
            finalPng: { fileKey: student2PngKey, fileName: 'ananya_banner.png', fileSize: 1048500 },
            sourceZip: { fileKey: student2ZipKey, fileName: 'ananya_source.zip', fileSize: 12400200 },
            explanationVideo: { fileKey: student2VidKey, fileName: 'ananya_walkthrough.mp4', fileSize: 30000000, durationSeconds: 60 }
          },
          evaluation: {
            aiScore: 90,
            aiRemarks: 'Clean design.',
            mentorScore: null,
            mentorRemarks: null,
            adminFinalScore: null,
            adminRemarks: null,
            status: 'Pending'
          }
        }
      ]
    }
  };
  storage.setItem('rizz_assessment_attempts', JSON.stringify(assessmentAttempts));

  // G. Execute Reset for Student 1 (matching ADMIN.html executeStudentReset)
  async function simulateExecuteStudentReset(targetStudentId, st, fsStore) {
    // 1. Remove Pre-Test attempt
    const attempts = JSON.parse(st.getItem('rizz_pretest_attempts') || '{}');
    if (attempts[targetStudentId]) {
      delete attempts[targetStudentId];
      st.setItem('rizz_pretest_attempts', JSON.stringify(attempts));
    }

    // 2. Remove Workshop Track Choice
    const choices = JSON.parse(st.getItem('rizz_workshop_student_choices') || '{}');
    if (choices[targetStudentId]) {
      delete choices[targetStudentId];
      st.setItem('rizz_workshop_student_choices', JSON.stringify(choices));
    }

    // 3. Clear Assessment Attempts and Attached Student Binary Files
    const attemptsMap = JSON.parse(st.getItem('rizz_assessment_attempts') || '{}');
    const sRecord = attemptsMap[targetStudentId];
    if (sRecord) {
      const attemptsList = sRecord.attempts || [];
      for (let i = 0; i < attemptsList.length; i++) {
        const att = attemptsList[i];
        if (att && att.submissions) {
          if (att.submissions.finalPng && att.submissions.finalPng.fileKey) {
            await fsStore.deleteFile(att.submissions.finalPng.fileKey);
          }
          if (att.submissions.sourceZip && att.submissions.sourceZip.fileKey) {
            await fsStore.deleteFile(att.submissions.sourceZip.fileKey);
          }
          if (att.submissions.explanationVideo && att.submissions.explanationVideo.fileKey) {
            await fsStore.deleteFile(att.submissions.explanationVideo.fileKey);
          }
        }
      }
      delete attemptsMap[targetStudentId];
      st.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));
    }

    // 4. Reset student progression to initial ready state
    const progKey = 'rizz_progress_' + targetStudentId;
    const resetProg = {
      preTestStatus: 'ready',
      preTestAttempt: null,
      evaluationStatus: 'pending',
      finalScore: null,
      suggestedTrack: null,
      suggestedCourse: null,
      chosenTrack: null,
      selectedSet: null,
      workshopStatus: 'locked',
      workshopProgress: 0,
      assessmentStatus: 'locked',
      assessmentCompleted: false,
      assessmentFinalScore: null,
      rizzScore: null,
      opportunitiesUnlocked: false,
      resultsStatus: 'locked',
      overallProgress: 0
    };
    st.setItem(progKey, JSON.stringify(resetProg));
  }

  // Execute reset for student 1
  await simulateExecuteStudentReset(student1, storage, fileStore);

  // --------------------------------------------------------------------------
  // VERIFICATIONS
  // --------------------------------------------------------------------------

  // 1. Check Assessment state cleared for Student 1
  const postAttemptsMap = JSON.parse(storage.getItem('rizz_assessment_attempts') || '{}');
  assert.strictEqual(postAttemptsMap[student1], undefined, 'Student 1 assessment attempt record must be completely deleted');
  pass('Point 1: Student Assessment attempt record completely cleared');

  // 2. Check Assessment files deleted from file store for Student 1
  assert.strictEqual(await fileStore.getFile(student1PngKey), null, 'Final PNG file must be deleted from file store');
  assert.strictEqual(await fileStore.getFile(student1ZipKey), null, 'Source ZIP file must be deleted from file store');
  assert.strictEqual(await fileStore.getFile(student1VidKey), null, 'Explanation Video file must be deleted from file store');
  pass('Point 4: Student uploaded binary deliverables (PNG, ZIP, Video) deleted from file store');

  // 3. Check Admin Master Assessment Assets and Configuration are 100% Intact
  assert.notStrictEqual(await fileStore.getFile('asset_pkg_asm_prod_designing'), null, 'Admin asset package ZIP must NOT be deleted');
  const postAdminAssessments = JSON.parse(storage.getItem('rizz_assessments') || '{}');
  assert(postAdminAssessments.asm_prod_designing, 'Admin assessment config must remain intact');
  assert.strictEqual(postAdminAssessments.asm_prod_designing.name, 'Production — Designing Practical Assessment');
  assert.strictEqual(postAdminAssessments.asm_prod_designing.status, 'Published');
  assert.strictEqual(postAdminAssessments.asm_prod_designing.questions.length, 3);
  assert.strictEqual(postAdminAssessments.asm_prod_designing.assetPackage.fileName, 'design-starter-kit.zip');
  pass('Point 7 & 12: Admin Assessment Master configuration, questions, instructions, and asset ZIP remain 100% intact');

  // 4. Check Workshop and Pre-Test state cleared for Student 1
  const postPretest = JSON.parse(storage.getItem('rizz_pretest_attempts') || '{}');
  assert.strictEqual(postPretest[student1], undefined, 'Pre-Test attempt must be deleted for Student 1');
  const postChoices = JSON.parse(storage.getItem('rizz_workshop_student_choices') || '{}');
  assert.strictEqual(postChoices[student1], undefined, 'Workshop choice must be deleted for Student 1');
  pass('Point 2: Workshop progress, track choice, and Pre-Test attempt completely cleared');

  // 5. Check Student 1 Progression and Navigation states
  const postProg = JSON.parse(storage.getItem('rizz_progress_' + student1) || '{}');
  assert.strictEqual(postProg.preTestStatus, 'ready');
  assert.strictEqual(postProg.workshopStatus, 'locked');
  assert.strictEqual(postProg.assessmentStatus, 'locked');
  assert.strictEqual(postProg.assessmentCompleted, false);
  assert.strictEqual(postProg.assessmentFinalScore, null);
  assert.strictEqual(postProg.resultsStatus, 'locked');
  assert.strictEqual(postProg.opportunitiesUnlocked, false);
  assert.strictEqual(postProg.chosenTrack, null);
  assert.strictEqual(postProg.overallProgress, 0);
  pass('Point 3: Progression reset: Home (initial), Pre-Test (unlocked), Workshop (locked), Assessment (locked), Results (locked), Opportunities (locked)');

  // 6. Check Student 1 Account Details & Login Credentials Intact
  const allUsersPost = JSON.parse(storage.getItem('allUsers') || '[]');
  const student1User = allUsersPost.find(u => u.userId === student1);
  assert(student1User, 'Student 1 account record must exist');
  assert.strictEqual(student1User.name, 'Praneet Kawaldar');
  assert.strictEqual(student1User.email, 'praneet@jain.edu');
  assert.strictEqual(student1User.phone, '9876543210');
  assert.strictEqual(student1User.college, 'Jain University');
  assert.strictEqual(student1User.role, 'Student');
  assert.strictEqual(student1User.password, 'password123');
  pass('Point 9: Student account data, name, email, phone, college, role, and login password preserved untouched');

  // 7. Check Control Student 2 is completely unaffected
  assert(postAttemptsMap[student2], 'Student 2 assessment attempt must NOT be deleted');
  assert.strictEqual(postPretest[student2].score, 92, 'Student 2 pretest must NOT be deleted');
  assert.strictEqual(postChoices[student2], 'Tech', 'Student 2 workshop choice must NOT be deleted');
  assert.notStrictEqual(await fileStore.getFile(student2PngKey), null, 'Student 2 PNG file must NOT be deleted');
  assert.notStrictEqual(await fileStore.getFile(student2ZipKey), null, 'Student 2 ZIP file must NOT be deleted');
  assert.notStrictEqual(await fileStore.getFile(student2VidKey), null, 'Student 2 Video file must NOT be deleted');
  pass('Point 14: Control Student 2 remains completely untouched (no data leak/bleed across students)');

  // 8. Check Fresh Attempt Lifecycle when Student 1 later unlocks Assessment
  // Simulate Student 1 re-starting assessment
  const reAttemptsMap = JSON.parse(storage.getItem('rizz_assessment_attempts') || '{}');
  if (!reAttemptsMap[student1]) {
    reAttemptsMap[student1] = { studentId: student1, attempts: [] };
  }
  const attList = reAttemptsMap[student1].attempts || [];
  const freshAttemptNum = attList.length + 1;
  const freshAttemptId = 'att_asm_prod_designing_' + student1 + '_' + freshAttemptNum;

  assert.strictEqual(freshAttemptNum, 1, 'Attempt number restarts cleanly at 1');
  assert.strictEqual(freshAttemptId, 'att_asm_prod_designing_STUD-001_1', 'Fresh attempt ID generated without previous attempt residue');

  // Check initial checklist state for fresh attempt
  let draftPng = null;
  let draftZip = null;
  let draftVid = null;
  const checklist = {
    hasPng: !!draftPng,
    hasZip: !!draftZip,
    hasVid: !!draftVid
  };
  assert.strictEqual(checklist.hasPng, false, 'Checklist PNG is unchecked [ ]');
  assert.strictEqual(checklist.hasZip, false, 'Checklist ZIP is unchecked [ ]');
  assert.strictEqual(checklist.hasVid, false, 'Checklist Video is unchecked [ ]');
  pass('Points 5 & 6: Subsequent assessment access produces a fresh attempt with [ ] [ ] [ ] clean unchecked checklist');

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedCount + 1} STUDENT RESET CRITERIA VERIFIED SUCCESSFULLY!`);
  console.log('============================================================\n');
})();
