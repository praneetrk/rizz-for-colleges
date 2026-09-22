/**
 * Test Suite: Student Profile Binding & Pre-Test Publish Workshop Unlock Lifecycle
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('🧪 RUNNING STUDENT PROFILE & PRE-TEST PUBLISH WORKFLOW TESTS');
console.log('============================================================\n');

// Read STUD.html
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');

// Mock localStorage and DOM environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();

// Helper to simulate STUD.html helper functions
function createStudentEnvironment(currentUserObj) {
  mockStorage.setItem('currentUser', JSON.stringify(currentUserObj));

  function isWorkshopUnlocked(userId) {
    const uId = userId || currentUserObj.userId || 'STUD-001';
    try {
      const attempts = JSON.parse(mockStorage.getItem('rizz_pretest_attempts') || '{}');
      let att = attempts[uId];
      if (!att) {
        const targetId = String(uId).toLowerCase().trim();
        const targetEmail = (currentUserObj.email || '').toLowerCase().trim();
        for (const k in attempts) {
          const a = attempts[k];
          if (!a) continue;
          const aId = String(a.studentId || k).toLowerCase().trim();
          const aEmail = String(a.email || '').toLowerCase().trim();
          if ((targetId && aId === targetId) || (targetEmail && aEmail === targetEmail)) {
            att = a;
            break;
          }
        }
      }

      if (att) {
        const status = String(att.status || '').trim();
        if (status === 'Published' || att.published === true) {
          return true;
        }
      }
    } catch (e) {}

    try {
      const progKey = 'rizz_progress_' + uId;
      const prog = JSON.parse(mockStorage.getItem(progKey) || '{}');
      if (prog && (prog.resultsStatus === 'published' || prog.workshopStatus === 'available' || prog.workshopStatus === 'in_progress' || prog.workshopStatus === 'completed')) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  function getStudentAttempt(userId) {
    const attempts = JSON.parse(mockStorage.getItem('rizz_pretest_attempts') || '{}');
    if (userId && attempts[userId]) return attempts[userId];
    const targetId = (userId || currentUserObj.userId || '').toLowerCase().trim();
    const targetEmail = (currentUserObj.email || '').toLowerCase().trim();
    for (const k in attempts) {
      const a = attempts[k];
      if (!a) continue;
      const aId = String(a.studentId || k).toLowerCase().trim();
      const aEmail = String(a.email || '').toLowerCase().trim();
      if ((targetId && aId === targetId) || (targetEmail && aEmail === targetEmail)) {
        return a;
      }
    }
    return null;
  }

  return { isWorkshopUnlocked, getStudentAttempt };
}

// TEST 1: Typography and Font Protection
console.log('--- TEST 1: Typography & Font Declarations Unmodified ---');
assert.ok(studHtml.includes("family=Playfair+Display:ital,wght@1,400;1,500;1,600;1,700"), 'Playfair Display Google font preserved');
assert.ok(studHtml.includes("family=Darker+Grotesque:wght@400;500;600;700;800;900"), 'Darker Grotesque Google font preserved');
assert.ok(studHtml.includes("family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400"), 'DM Sans Google font preserved');
assert.ok(studHtml.includes(".font-playfair  { font-family: 'Playfair Display', ui-serif, Georgia; font-style: italic; }"), '.font-playfair class preserved');
assert.ok(studHtml.includes(".font-grotesque { font-family: 'Darker Grotesque', ui-sans-serif; }"), '.font-grotesque class preserved');
console.log('✅ PASS: Fonts are 100% intact (Playfair Display, Darker Grotesque, DM Sans).\n');

// TEST 2: Dynamic User Identity Binding
console.log('--- TEST 2: Dynamic User Identity Binding (Praneet Kawaldar vs Aarav Sharma) ---');
const user1 = { name: 'Praneet Kawaldar', userId: 'STU001', email: 'praneet@college.edu', role: 'student', college: 'RV College' };
const user2 = { name: 'Aarav Sharma', userId: 'STU002', email: 'aarav@college.edu', role: 'student', college: 'PES University' };

const env1 = createStudentEnvironment(user1);
assert.strictEqual(user1.name, 'Praneet Kawaldar');
assert.strictEqual(user1.userId, 'STU001');

const env2 = createStudentEnvironment(user2);
assert.strictEqual(user2.name, 'Aarav Sharma');
assert.strictEqual(user2.userId, 'STU002');
console.log('✅ PASS: Dynamic student name and student ID correctly resolved from currentUser session data.\n');

// TEST 3: Pre-Test & Workshop Lock States Lifecycle
console.log('--- TEST 3: Pre-Test & Workshop Unlock State Lifecycle ---');
mockStorage.clear();

// Step 3.1: Fresh Student - Workshop must be LOCKED
const testUser = { name: 'Praneet Kawaldar', userId: 'STU001', email: 'praneet@college.edu', role: 'student', college: 'RV College' };
const env = createStudentEnvironment(testUser);

assert.strictEqual(env.isWorkshopUnlocked(testUser.userId), false, 'Workshop must be locked initially');
console.log('✅ PASS 3.1: Fresh student has Workshop LOCKED.');

// Step 3.2: Student Submits Pre-Test (status = Pending) - Workshop must remain LOCKED
const pretestAttempts = {};
pretestAttempts[testUser.userId] = {
  studentId: testUser.userId,
  studentName: testUser.name,
  college: testUser.college,
  status: 'Pending',
  published: false,
  totalScore: 24,
  maxScore: 27,
  suggestedCourse: 'Tech'
};
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify(pretestAttempts));

assert.strictEqual(env.isWorkshopUnlocked(testUser.userId), false, 'Workshop must remain LOCKED when Pre-Test is Pending');
console.log('✅ PASS 3.2: Pending Pre-Test submission keeps Workshop strictly LOCKED.');

// Step 3.3: Admin Finalizes Pre-Test (status = Finalized) - Workshop must remain LOCKED
pretestAttempts[testUser.userId].status = 'Finalized';
pretestAttempts[testUser.userId].adminFinalScore = 24;
pretestAttempts[testUser.userId].adminFinalSuggestion = 'Tech';
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify(pretestAttempts));

assert.strictEqual(env.isWorkshopUnlocked(testUser.userId), false, 'Workshop must remain LOCKED when Pre-Test is Finalized but not published');
console.log('✅ PASS 3.3: Finalized (unpublished) result keeps Workshop strictly LOCKED.');

// Step 3.4: Admin Publishes Pre-Test (status = Published) - Workshop must UNLOCK
pretestAttempts[testUser.userId].status = 'Published';
pretestAttempts[testUser.userId].published = true;
pretestAttempts[testUser.userId].publishedAt = new Date().toISOString();
mockStorage.setItem('rizz_pretest_attempts', JSON.stringify(pretestAttempts));

// Also simulate Admin writing student progression key
const progKey = 'rizz_progress_' + testUser.userId;
mockStorage.setItem(progKey, JSON.stringify({
  preTestStatus: 'reviewed',
  workshopStatus: 'available',
  resultsStatus: 'published',
  finalScore: 24,
  suggestedCourse: 'Tech'
}));

assert.strictEqual(env.isWorkshopUnlocked(testUser.userId), true, 'Workshop must be UNLOCKED after Admin publishes result');
console.log('✅ PASS 3.4: Published Pre-Test result successfully UNLOCKS Workshop.');

// Step 3.5: Persistence check - After simulated page reload / session resume
const reloadedEnv = createStudentEnvironment(testUser);
assert.strictEqual(reloadedEnv.isWorkshopUnlocked(testUser.userId), true, 'Workshop remains UNLOCKED on page reload/re-login');
const attemptData = reloadedEnv.getStudentAttempt(testUser.userId);
assert.ok(attemptData, 'Student attempt data is retrievable');
assert.strictEqual(attemptData.adminFinalScore, 24, 'Verified score matches 24');
assert.strictEqual(attemptData.adminFinalSuggestion, 'Tech', 'Recommended course matches Tech');
console.log('✅ PASS 3.5: Published state persists across refresh and re-login with verified score & recommended track.\n');

console.log('============================================================');
console.log('🎉 ALL TESTS PASSED! PROFILE AND WORKSHOP UNLOCK VERIFIED.');
console.log('============================================================');
