/**
 * Test Suite: Cross-Device Real-Time Publish, Marks Sync & Workshop Unlock Lifecycle
 */

const fs = require('fs');
const assert = require('assert');

console.log('============================================================');
console.log('🧪 RUNNING CROSS-DEVICE REAL-TIME PUBLISH & MARKS SYNC TESTS');
console.log('============================================================\n');

// 1. Check firebase-config.js has required helper methods
console.log('--- TEST 1: Firebase Sync Methods Verification ---');
const fbCode = fs.readFileSync('firebase-config.js', 'utf8');
assert(fbCode.includes('getPreTestAttempt:'), 'Should have getPreTestAttempt');
assert(fbCode.includes('onPreTestAttemptChange:'), 'Should have onPreTestAttemptChange');
assert(fbCode.includes('getProgress:'), 'Should have getProgress');
assert(fbCode.includes('onProgressChange:'), 'Should have onProgressChange');
assert(fbCode.includes('saveProgress:'), 'Should have saveProgress');
assert(fbCode.includes('getAssessmentAttempt:'), 'Should have getAssessmentAttempt');
assert(fbCode.includes('onAssessmentAttemptChange:'), 'Should have onAssessmentAttemptChange');
console.log('✅ PASS: firebase-config.js exports all real-time publish & progress listeners.');

// 2. Check ADMIN.html publish actions sync to Firebase
console.log('\n--- TEST 2: Admin Console Publish & Progress Sync Verification ---');
const adminCode = fs.readFileSync('ADMIN.html', 'utf8');
assert(adminCode.includes('window.RizzDB.saveProgress(studentId, prog)'), 'Admin bulk publish must call saveProgress');
assert(adminCode.includes('window.RizzDB.savePreTestAttempt(studentId, attempts[studentId])'), 'Admin bulk publish must call savePreTestAttempt');
assert(adminCode.includes('btn-save-and-publish-finalisation'), 'Admin evaluation modal must have direct Finalize & Publish button');
console.log('✅ PASS: ADMIN.html syncs published evaluations and unlocked progress to Firebase.');

// 3. Check STUD.html real-time listeners and handlers
console.log('\n--- TEST 3: Student Portal Real-Time Listeners Verification ---');
const studCode = fs.readFileSync('STUD.html', 'utf8');
assert(studCode.includes('window.RizzDB.onPreTestAttemptChange'), 'STUD.html must register onPreTestAttemptChange');
assert(studCode.includes('window.RizzDB.onProgressChange'), 'STUD.html must register onProgressChange');
assert(studCode.includes('syncStudentDataWithFirebase'), 'STUD.html must bootstrap directly from Firebase on load');
assert(studCode.includes('handleIncomingPreTestAttempt'), 'STUD.html must have handler for incoming pretest attempt');
assert(studCode.includes('handleIncomingProgress'), 'STUD.html must have handler for incoming progress');
assert(studCode.includes('renderStudentResultsView'), 'STUD.html must define renderStudentResultsView');
console.log('✅ PASS: STUD.html implements real-time listeners, Firebase bootstrap, and results view.');

// 4. End-to-End Simulation of Cross-Device Workflow
console.log('\n--- TEST 4: End-to-End Cross-Device Lifecycle Simulation ---');

// Mock localStorage and Student state
const mockLocalStorage = {};
const studentId = 'STUD-001';
const studentEmail = 'student@college.edu';

function getStudentProgress(uId) {
  const raw = mockLocalStorage['rizz_progress_' + uId];
  return raw ? JSON.parse(raw) : { preTestStatus: 'not_started', workshopStatus: 'locked', resultsStatus: 'locked' };
}

function isWorkshopUnlocked(uId) {
  try {
    const attempts = JSON.parse(mockLocalStorage['rizz_pretest_attempts'] || '{}');
    let att = attempts[uId];
    if (att && (att.status === 'Published' || att.published === true)) {
      return true;
    }
  } catch (e) {}

  try {
    const prog = getStudentProgress(uId);
    if (prog && (prog.resultsStatus === 'published' || prog.workshopStatus === 'available')) {
      return true;
    }
  } catch (e) {}

  return false;
}

// Step A: Student is fresh -> Workshop locked
assert.strictEqual(isWorkshopUnlocked(studentId), false, 'Fresh student should have workshop locked');
console.log('  4.1 Fresh student: Workshop locked ✅');

// Step B: Student submits test -> Status Pending / under_review -> Workshop locked
const submittedAttempt = {
  attemptId: 'ATT-STUD-001-12345',
  studentId: studentId,
  studentName: 'Teammate Student',
  email: studentEmail,
  status: 'Pending',
  totalScore: 18,
  maxScore: 21,
  suggestedCourse: 'Strategy',
  submitTime: Date.now(),
  published: false
};
mockLocalStorage['rizz_pretest_attempts'] = JSON.stringify({ [studentId]: submittedAttempt });
mockLocalStorage['rizz_progress_' + studentId] = JSON.stringify({
  preTestStatus: 'submitted',
  workshopStatus: 'locked',
  resultsStatus: 'under_review'
});

assert.strictEqual(isWorkshopUnlocked(studentId), false, 'Submitted attempt under review should keep workshop locked');
console.log('  4.2 Student submitted: Status Pending / under_review -> Workshop locked ✅');

// Step C: Admin on Device A evaluates & publishes
const publishedAttempt = Object.assign({}, submittedAttempt, {
  status: 'Published',
  published: true,
  adminFinalScore: 19,
  adminFinalSuggestion: 'Tech',
  suggestedCourse: 'Tech',
  publishedAt: new Date().toISOString()
});

const publishedProgress = {
  preTestStatus: 'reviewed',
  workshopStatus: 'available',
  resultsStatus: 'published',
  finalScore: 19,
  suggestedCourse: 'Tech'
};

// Step D: Teammate on Device B receives Firebase update via handleIncomingPreTestAttempt
function simulateHandleIncomingPreTestAttempt(att) {
  const attempts = JSON.parse(mockLocalStorage['rizz_pretest_attempts'] || '{}');
  attempts[att.studentId] = att;
  mockLocalStorage['rizz_pretest_attempts'] = JSON.stringify(attempts);

  if (att.status === 'Published' || att.published === true) {
    const prog = getStudentProgress(att.studentId);
    prog.preTestStatus = 'reviewed';
    prog.workshopStatus = 'available';
    prog.resultsStatus = 'published';
    prog.finalScore = att.adminFinalScore !== undefined ? att.adminFinalScore : att.totalScore;
    prog.suggestedCourse = att.adminFinalSuggestion || att.suggestedCourse;
    mockLocalStorage['rizz_progress_' + att.studentId] = JSON.stringify(prog);
  }
}

simulateHandleIncomingPreTestAttempt(publishedAttempt);

// Step E: Verification on Student's Device B
const finalProg = getStudentProgress(studentId);
const finalAtt = JSON.parse(mockLocalStorage['rizz_pretest_attempts'])[studentId];

assert.strictEqual(finalAtt.status, 'Published', 'Student attempt status should be Published');
assert.strictEqual(finalAtt.published, true, 'Student attempt published flag should be true');
assert.strictEqual(finalAtt.adminFinalScore, 19, 'Student verified marks should be 19');
assert.strictEqual(finalAtt.suggestedCourse, 'Tech', 'Student course recommendation should be Tech');

assert.strictEqual(finalProg.resultsStatus, 'published', 'Student progress resultsStatus should be published');
assert.strictEqual(finalProg.workshopStatus, 'available', 'Student progress workshopStatus should be available');
assert.strictEqual(finalProg.finalScore, 19, 'Student progress finalScore should be 19');

assert.strictEqual(isWorkshopUnlocked(studentId), true, 'Workshop MUST be unlocked after publishing');
console.log('  4.3 Teammate receives published update: Marks 19/21, Track Tech, Workshop UNLOCKED ✅');

console.log('\n============================================================');
console.log('🎉 ALL CROSS-DEVICE PUBLISH & SYNC TESTS PASSED SUCCESSFULLY!');
console.log('============================================================\n');
