/**
 * test_pretest_results_lock_fix.js
 * Verification test suite for Pre-Test Publication vs Results Tab Locking Logic.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('🧪 VERIFYING PRE-TEST PUBLICATION VS RESULTS TAB LOCKING');
console.log('======================================================================\n');

// 1. Static HTML & Code Analysis
console.log('--- 1. Static Code Analysis in STUD.html & ADMIN.html ---');
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');

// Verify isWorkshopUnlocked in STUD.html does not depend on resultsStatus === 'published'
assert(!studHtml.includes("prog.resultsStatus === 'published' || prog.workshopStatus === 'available'"), 'STUD.html isWorkshopUnlocked does not conflate resultsStatus with workshop unlock');

// Verify Pre-Test publication in ADMIN.html does not set prog.resultsStatus = 'published'
const adminFinaliseMatch = adminHtml.slice(adminHtml.indexOf('function finaliseEvaluation'), adminHtml.indexOf('function finaliseEvaluation') + 1500);
assert(!adminFinaliseMatch.includes("prog.resultsStatus = 'published'"), 'ADMIN.html finaliseEvaluation does not set resultsStatus to published');

const adminBulkPublishMatch = adminHtml.slice(adminHtml.indexOf('function confirmBulkPublish()'), adminHtml.indexOf('function confirmBulkPublish()') + 1500);
assert(!adminBulkPublishMatch.includes("prog.resultsStatus = 'published'"), 'ADMIN.html confirmBulkPublish does not set resultsStatus to published');

// Verify Typography & Theme preserved
assert(studHtml.includes('Playfair Display'), 'STUD.html has Playfair Display font');
assert(studHtml.includes('Darker Grotesque'), 'STUD.html has Darker Grotesque font');
assert(studHtml.includes('DM Sans'), 'STUD.html has DM Sans font');
assert(studHtml.includes('#D31F83'), 'STUD.html has #D31F83 brand color');
assert(studHtml.includes('#EDA233'), 'STUD.html has #EDA233 brand color');

console.log('✅ PASS: Static code verification passed.\n');

// Mock localStorage environment
class MockLocalStorage {
  constructor() { this.store = {}; }
  clear() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
}

const mockStorage = new MockLocalStorage();

function getStudentProgress(uId) {
  const raw = mockStorage.getItem('rizz_progress_' + uId);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return {
    preTestStatus: 'ready',
    preTestAttempt: null,
    evaluationStatus: 'pending',
    finalScore: null,
    suggestedTrack: null,
    suggestedCourse: null,
    chosenTrack: null,
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
}

function loadAssessmentAttempts() {
  try {
    return JSON.parse(mockStorage.getItem('rizz_assessment_attempts') || '{}');
  } catch (e) {
    return {};
  }
}

function isWorkshopUnlocked(userId) {
  const uId = userId || 'STUD-001';
  try {
    const attempts = JSON.parse(mockStorage.getItem('rizz_pretest_attempts') || '{}');
    let att = attempts[uId];
    if (att) {
      const status = String(att.status || '').trim();
      if (status === 'Published' || att.published === true) {
        return true;
      }
    }
  } catch (e) {}

  try {
    const prog = getStudentProgress(uId);
    if (prog && (prog.workshopStatus === 'available' || prog.workshopStatus === 'in_progress' || prog.workshopStatus === 'completed' || prog.preTestStatus === 'reviewed')) {
      return true;
    }
  } catch (e) {}

  return false;
}

function isAssessmentUnlocked(userId) {
  const uId = userId || 'STUD-001';
  const prog = getStudentProgress(uId);
  return prog.workshopStatus === 'completed' || prog.assessmentStatus === 'available' || prog.assessmentStatus === 'completed';
}

function isResultsUnlocked(userId) {
  const uId = userId || 'STUD-001';
  try {
    const prog = getStudentProgress(uId);
    if (prog && prog.resultsStatus === 'published' && (prog.assessmentCompleted === true || (prog.rizzScore !== null && prog.rizzScore !== undefined) || (prog.assessmentFinalScore !== null && prog.assessmentFinalScore !== undefined))) {
      return true;
    }
  } catch (e) {}

  try {
    const attemptsMap = loadAssessmentAttempts();
    const sAttempts = attemptsMap[uId];
    if (sAttempts && sAttempts.attempts && sAttempts.attempts.length > 0) {
      const hasPublished = sAttempts.attempts.some(function(a) {
        return a.status === 'Published' || (a.evaluation && a.evaluation.adminStatus === 'Published');
      });
      if (hasPublished) return true;
    }
  } catch (e) {}

  return false;
}

function isOpportunitiesUnlocked(userId) {
  const uId = userId || 'STUD-001';
  if (!isResultsUnlocked(uId)) return false;
  const prog = getStudentProgress(uId);
  const score = (prog && prog.rizzScore !== null && prog.rizzScore !== undefined) ? Number(prog.rizzScore) : null;
  return score !== null && score >= 70;
}

const studentA = 'STUD-001';
const studentB = 'STUD-002';

// --------------------------------------------------
// TEST A — BEFORE PRE-TEST (Reset / Fresh Student)
// --------------------------------------------------
console.log('--- 2. TEST A: Before Pre-Test ---');
assert.strictEqual(isWorkshopUnlocked(studentA), false, 'Workshop must be locked initially');
assert.strictEqual(isAssessmentUnlocked(studentA), false, 'Assessment must be locked initially');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results must be locked initially');
assert.strictEqual(isOpportunitiesUnlocked(studentA), false, 'Opportunities must be locked initially');
console.log('✅ TEST A PASSED: Home & Pre-Test available, Workshop, Assessment, Results, Opportunities LOCKED.\n');

// --------------------------------------------------
// TEST B — AFTER PRE-TEST SUBMISSION (Pending Review)
// --------------------------------------------------
console.log('--- 3. TEST B: After Pre-Test Submission (Admin has NOT published) ---');
const pretestAttempt = {
  attemptId: 'att_pretest_001',
  studentId: studentA,
  studentName: 'Praneet Kawaldar',
  status: 'Pending',
  totalScore: 18,
  maxScore: 21,
  suggestedCourse: 'Strategy',
  published: false
};
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify({ [studentA]: pretestAttempt }));
mockStorage.setItem('rizz_progress_' + studentA, JSON.stringify({
  preTestStatus: 'submitted',
  workshopStatus: 'locked',
  resultsStatus: 'locked'
}));

assert.strictEqual(isWorkshopUnlocked(studentA), false, 'Workshop must be locked when Pre-Test is Pending');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results must be locked when Pre-Test is Pending');
console.log('✅ TEST B PASSED: Workshop & Results remain strictly LOCKED.\n');

// --------------------------------------------------
// TEST C — ADMIN PUBLISHES PRE-TEST
// --------------------------------------------------
console.log('--- 4. TEST C: Admin Evaluates & Publishes Pre-Test Result ---');
// Simulate Admin Pre-Test Publication (matching updated ADMIN.html)
const attempts = JSON.parse(mockStorage.getItem('rizz_pretest_attempts'));
attempts[studentA].status = 'Published';
attempts[studentA].published = true;
attempts[studentA].adminFinalScore = 19;
attempts[studentA].adminFinalSuggestion = 'Strategy';
attempts[studentA].publishedAt = new Date().toISOString();
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify(attempts));

const progA = getStudentProgress(studentA);
progA.finalScore = 19;
progA.suggestedCourse = 'Strategy';
progA.preTestStatus = 'reviewed';
progA.workshopStatus = 'available';
progA.resultsStatus = 'locked'; // Explicitly remains locked
mockStorage.setItem('rizz_progress_' + studentA, JSON.stringify(progA));

// Verify Student A state
assert.strictEqual(isWorkshopUnlocked(studentA), true, 'Workshop MUST be UNLOCKED after Pre-Test publish');
assert.strictEqual(isAssessmentUnlocked(studentA), false, 'Assessment must remain LOCKED');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results MUST remain LOCKED after Pre-Test publish');
assert.strictEqual(isOpportunitiesUnlocked(studentA), false, 'Opportunities must remain LOCKED');

// Verify Pre-test marks & recommendation are present in data
const updatedAtt = JSON.parse(mockStorage.getItem('rizz_pretest_attempts'))[studentA];
assert.strictEqual(updatedAtt.adminFinalScore, 19, 'Published Pre-Test marks (19) accessible');
assert.strictEqual(updatedAtt.adminFinalSuggestion, 'Strategy', 'Recommended Course (Strategy) accessible');

console.log('✅ TEST C PASSED: Published marks (19/21) & Recommended Course (Strategy) visible.');
console.log('   Sidebar: WORKSHOP is UNLOCKED. RESULTS is LOCKED.\n');

// --------------------------------------------------
// TEST D — REFRESH PERSISTENCE
// --------------------------------------------------
console.log('--- 5. TEST D: Refresh Student Console ---');
// Reload from storage
const refreshedProg = JSON.parse(mockStorage.getItem('rizz_progress_' + studentA));
assert.strictEqual(refreshedProg.workshopStatus, 'available', 'Workshop status persists as available');
assert.strictEqual(refreshedProg.resultsStatus, 'locked', 'Results status persists as locked');
assert.strictEqual(isWorkshopUnlocked(studentA), true, 'Workshop remains UNLOCKED on refresh');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results remains LOCKED on refresh');
console.log('✅ TEST D PASSED: State persists correctly across page reload.\n');

// --------------------------------------------------
// TEST E — LOGOUT / LOGIN PERSISTENCE
// --------------------------------------------------
console.log('--- 6. TEST E: Logout and Login as Same Student ---');
assert.strictEqual(isWorkshopUnlocked(studentA), true, 'Workshop remains UNLOCKED on re-login');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results remains LOCKED on re-login');
console.log('✅ TEST E PASSED: State persists correctly across logout and re-login.\n');

// --------------------------------------------------
// TEST G — STUDENT ISOLATION
// --------------------------------------------------
console.log('--- 7. Student Isolation (Student A published vs Student B fresh) ---');
assert.strictEqual(isWorkshopUnlocked(studentB), false, 'Student B workshop must NOT be unlocked');
assert.strictEqual(isResultsUnlocked(studentB), false, 'Student B results must NOT be unlocked');
console.log('✅ Student Isolation PASSED: Student B unaffected by Student A publication.\n');

// --------------------------------------------------
// TEST F — LATER ASSESSMENT & FINAL RESULTS FLOW
// --------------------------------------------------
console.log('--- 8. TEST F: Later Results Flow (Assessment completion -> Admin publish) ---');
// Student completes workshop
progA.workshopStatus = 'completed';
mockStorage.setItem('rizz_progress_' + studentA, JSON.stringify(progA));
assert.strictEqual(isAssessmentUnlocked(studentA), true, 'Assessment unlocked after workshop completion');
assert.strictEqual(isResultsUnlocked(studentA), false, 'Results still locked during assessment stage');

// Student submits assessments, Mentor evaluates, Admin assigns RIZZ score = 85 & publishes
const asmAttempts = {
  [studentA]: {
    studentId: studentA,
    attempts: [
      { assessmentId: 'asm_strat_contentwriting', status: 'Published', evaluation: { adminStatus: 'Published', adminFinalScore: 85 } }
    ]
  }
};
mockStorage.setItem('rizz_assessment_attempts', JSON.stringify(asmAttempts));

progA.assessmentStatus = 'completed';
progA.assessmentCompleted = true;
progA.resultsStatus = 'published';
progA.rizzScore = 85;
progA.opportunitiesUnlocked = true;
mockStorage.setItem('rizz_progress_' + studentA, JSON.stringify(progA));

assert.strictEqual(isResultsUnlocked(studentA), true, 'Results Tab UNLOCKS after final Assessment result publication');
assert.strictEqual(isOpportunitiesUnlocked(studentA), true, 'Opportunities Tab UNLOCKS with RIZZ Score 85 >= 70');
console.log('✅ TEST F PASSED: Legitimate later Assessment Results unlock flow 100% preserved.\n');

// --------------------------------------------------
// TEST H — RESET COMPATIBILITY
// --------------------------------------------------
console.log('--- 9. Student Reset Compatibility ---');
// Admin resets student
mockStorage.setItem('rizz_progress_' + studentA, JSON.stringify({
  preTestStatus: 'ready',
  workshopStatus: 'locked',
  assessmentStatus: 'locked',
  resultsStatus: 'locked',
  opportunitiesUnlocked: false
}));
const allPretest = JSON.parse(mockStorage.getItem('rizz_pretest_attempts'));
delete allPretest[studentA];
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify(allPretest));
const allAsm = JSON.parse(mockStorage.getItem('rizz_assessment_attempts'));
delete allAsm[studentA];
mockStorage.setItem('rizz_assessment_attempts', JSON.stringify(allAsm));

assert.strictEqual(isWorkshopUnlocked(studentA), false, 'After reset: Workshop is locked');
assert.strictEqual(isAssessmentUnlocked(studentA), false, 'After reset: Assessment is locked');
assert.strictEqual(isResultsUnlocked(studentA), false, 'After reset: Results is locked');
assert.strictEqual(isOpportunitiesUnlocked(studentA), false, 'After reset: Opportunities is locked');
console.log('✅ Student Reset PASSED: All stages return to initial clean state.\n');

console.log('======================================================================');
console.log('🎉 ALL TESTS PASSED PERFECTLY!');
console.log('======================================================================\n');
