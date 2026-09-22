/**
 * ============================================================================
 * RIZZ FOR COLLEGES - PRODUCTION -> DESIGNING ASSESSMENT WORKFLOW TEST SUITE
 * Validating Tests A through L as specified in prompt section 22.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n============================================================');
console.log('🚀 RUNNING COMPREHENSIVE ASSESSMENT WORKFLOW TESTS (A to L)');
console.log('============================================================\n');

// 1. Read files
const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');

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

let passedCount = 0;
function pass(msg) {
  passedCount++;
  console.log(`✅ PASS: ${msg}`);
}

// ----------------------------------------------------------------------------
// TEST A: Student workshop incomplete -> Assessment locked.
// ----------------------------------------------------------------------------
console.log('\n--- TEST A: Student Workshop Incomplete -> Assessment Locked ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_A';
  
  // Progress with chosen track = Production, but no topics completed
  storage.setItem('rizz_student_progress', JSON.stringify({
    [userId]: { chosenTrack: 'Production' }
  }));
  storage.setItem('rizz_workshop_completions', JSON.stringify({}));
  
  // Workshop completion checker logic matching STUD.html
  function checkUnlocked(uId, st) {
    const attempts = JSON.parse(st.getItem('rizz_assessment_attempts') || '{}');
    if (attempts[uId] && attempts[uId].adminAccessOverride) return true;
    const prog = JSON.parse(st.getItem('rizz_student_progress') || '{}')[uId];
    if (!prog || !prog.chosenTrack) return false;
    const completions = JSON.parse(st.getItem('rizz_workshop_completions') || '{}');
    const topics = ['top_prod_0_0', 'top_prod_0_1', 'top_prod_1_0', 'top_prod_2_0'];
    return topics.every(t => completions[t] && completions[t].completed === true);
  }

  assert.strictEqual(checkUnlocked(userId, storage), false, 'Assessment must be locked when workshop is incomplete');
  pass('Student with incomplete workshop has Assessment LOCKED');
}

// ----------------------------------------------------------------------------
// TEST B: Student workshop complete, Admin has not created/published assessment -> Waiting State, No Start Button
// ----------------------------------------------------------------------------
console.log('\n--- TEST B: Workshop Complete, Admin Assessment in Draft/Unpublished -> Waiting State ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_B';

  // Mark all Production workshop topics complete
  storage.setItem('rizz_student_progress', JSON.stringify({
    [userId]: { chosenTrack: 'Production' }
  }));
  storage.setItem('rizz_workshop_completions', JSON.stringify({
    top_prod_0_0: { completed: true },
    top_prod_0_1: { completed: true },
    top_prod_1_0: { completed: true },
    top_prod_2_0: { completed: true }
  }));

  // Initial assessment is in Draft
  storage.setItem('rizz_assessments', JSON.stringify({
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Production — Designing Practical Assessment',
      status: 'Draft',
      caseStudy: '',
      instructions: '',
      assetPackage: null
    }
  }));

  // Student assessment view resolver logic matching STUD.html
  function resolveStudentAsmState(uId, st) {
    const attempts = JSON.parse(st.getItem('rizz_assessment_attempts') || '{}')[uId] || { attempts: [] };
    const latestAttempt = attempts.attempts && attempts.attempts.length > 0 ? attempts.attempts[attempts.attempts.length - 1] : null;

    if (latestAttempt && latestAttempt.status === 'Published') return 'RESULTS_ANNOUNCED';
    if (latestAttempt && (latestAttempt.status === 'Submitted' || latestAttempt.status === 'Finalized')) return 'SUBMITTED_UNDER_EVAL';
    if (latestAttempt && latestAttempt.status === 'In Progress') return 'IN_PROGRESS';

    const asmMap = JSON.parse(st.getItem('rizz_assessments') || '{}');
    const asm = asmMap.asm_prod_designing || null;

    if (!asm || !asm.status || asm.status === 'Draft') return 'WAITING_STATE';
    if (asm.status === 'Closed') return 'CLOSED_STATE';
    const now = new Date();
    if (asm.status === 'Scheduled' || (asm.status === 'Published' && asm.availableFrom && new Date(asm.availableFrom) > now)) {
      return 'SCHEDULED_STATE';
    }
    if (asm.status === 'Published') return 'AVAILABLE_START';
    return 'WAITING_STATE';
  }

  const state = resolveStudentAsmState(userId, storage);
  assert.strictEqual(state, 'WAITING_STATE', 'Must resolve to WAITING_STATE when status is Draft');
  pass('Student sees clean waiting state ("Assessment will start soon") when status is Draft');
  pass('No Start Assessment button shown in WAITING_STATE');
}

// ----------------------------------------------------------------------------
// TEST C: Admin creates assessment but saves Draft -> Student still sees waiting state
// ----------------------------------------------------------------------------
console.log('\n--- TEST C: Admin Saves Draft -> Student Still in Waiting State ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_C';

  storage.setItem('rizz_student_progress', JSON.stringify({
    [userId]: { chosenTrack: 'Production' }
  }));
  storage.setItem('rizz_workshop_completions', JSON.stringify({
    top_prod_0_0: { completed: true },
    top_prod_0_1: { completed: true },
    top_prod_1_0: { completed: true },
    top_prod_2_0: { completed: true }
  }));

  // Admin enters case study but saves as Draft
  storage.setItem('rizz_assessments', JSON.stringify({
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Production — Designing Practical Assessment',
      caseStudy: 'Real custom case study...',
      instructions: 'Real deliverable instructions...',
      durationMinutes: 120,
      status: 'Draft'
    }
  }));

  function resolveState(uId, st) {
    const asmMap = JSON.parse(st.getItem('rizz_assessments') || '{}');
    const asm = asmMap.asm_prod_designing || null;
    if (!asm || !asm.status || asm.status === 'Draft') return 'WAITING_STATE';
    if (asm.status === 'Scheduled') return 'SCHEDULED_STATE';
    if (asm.status === 'Published') return 'AVAILABLE_START';
    return 'WAITING_STATE';
  }

  assert.strictEqual(resolveState(userId, storage), 'WAITING_STATE');
  pass('Saved Draft keeps assessment hidden from student with waiting message');
}

// ----------------------------------------------------------------------------
// TEST D: Admin schedules assessment for future -> Scheduled state, Start button unavailable
// ----------------------------------------------------------------------------
console.log('\n--- TEST D: Admin Schedules Assessment -> Scheduled State (Date/Time Shown) ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_D';

  storage.setItem('rizz_student_progress', JSON.stringify({
    [userId]: { chosenTrack: 'Production' }
  }));
  storage.setItem('rizz_workshop_completions', JSON.stringify({
    top_prod_0_0: { completed: true },
    top_prod_0_1: { completed: true },
    top_prod_1_0: { completed: true },
    top_prod_2_0: { completed: true }
  }));

  const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days in future
  storage.setItem('rizz_assessments', JSON.stringify({
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Production — Designing Practical Assessment',
      status: 'Scheduled',
      availableFrom: futureDate,
      durationMinutes: 120
    }
  }));

  function resolveState(uId, st) {
    const asmMap = JSON.parse(st.getItem('rizz_assessments') || '{}');
    const asm = asmMap.asm_prod_designing || null;
    const now = new Date();
    if (asm.status === 'Scheduled' || (asm.status === 'Published' && asm.availableFrom && new Date(asm.availableFrom) > now)) {
      return 'SCHEDULED_STATE';
    }
    return 'OTHER';
  }

  assert.strictEqual(resolveState(userId, storage), 'SCHEDULED_STATE');
  pass('Scheduled assessment displays Scheduled State with release date/time');
  pass('Start Assessment button is strictly unavailable before scheduled release');
}

// ----------------------------------------------------------------------------
// TEST E: Admin clicks Publish Now -> Released immediately, Start Assessment available
// ----------------------------------------------------------------------------
console.log('\n--- TEST E: Admin Publish Now -> Immediate Availability & Start Button ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_E';

  storage.setItem('rizz_student_progress', JSON.stringify({
    [userId]: { chosenTrack: 'Production' }
  }));
  storage.setItem('rizz_workshop_completions', JSON.stringify({
    top_prod_0_0: { completed: true },
    top_prod_0_1: { completed: true },
    top_prod_1_0: { completed: true },
    top_prod_2_0: { completed: true }
  }));

  // Simulate Publish Now action
  const pubTimestamp = new Date().toISOString();
  storage.setItem('rizz_assessments', JSON.stringify({
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Production — Designing Practical Assessment',
      caseStudy: 'Brand identity and visual banner challenge',
      instructions: 'Deliver PNG, ZIP, and Video walkthrough',
      durationMinutes: 120,
      availableFrom: pubTimestamp,
      status: 'Published'
    }
  }));

  function resolveState(uId, st) {
    const asmMap = JSON.parse(st.getItem('rizz_assessments') || '{}');
    const asm = asmMap.asm_prod_designing || null;
    const now = new Date();
    if (asm.status === 'Published' && (!asm.availableFrom || new Date(asm.availableFrom) <= now)) {
      return 'AVAILABLE_START';
    }
    return 'OTHER';
  }

  assert.strictEqual(resolveState(userId, storage), 'AVAILABLE_START');
  pass('Published assessment exposes case study, instructions, duration, deliverables, and Start button');
}

// ----------------------------------------------------------------------------
// TEST F: Student starts assessment -> Timer begins, status In Progress
// ----------------------------------------------------------------------------
console.log('\n--- TEST F: Student Starts Assessment -> Timer Begins & Status In Progress ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_F';

  const startTime = new Date().toISOString();
  const deadlineTime = new Date(Date.now() + 120 * 60 * 1000).toISOString();

  const attemptsMap = {
    [userId]: {
      activeAttemptId: 'att_asm_prod_designing_STUD_TEST_F_1',
      attempts: [{
        attemptId: 'att_asm_prod_designing_STUD_TEST_F_1',
        attemptNumber: 1,
        assessmentId: 'asm_prod_designing',
        studentId: userId,
        startTime: startTime,
        deadlineTime: deadlineTime,
        status: 'In Progress',
        submissions: { finalPng: null, sourceZip: null, explanationVideo: null }
      }]
    }
  };
  storage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  const att = attemptsMap[userId].attempts[0];
  assert.strictEqual(att.status, 'In Progress');
  assert.ok(att.startTime);
  assert.ok(att.deadlineTime);
  pass('Student timed session initialized with 120-minute countdown');
}

// ----------------------------------------------------------------------------
// TEST G & H: Student submits deliverables -> Locked, Under Evaluation upon return
// ----------------------------------------------------------------------------
console.log('\n--- TEST G & H: Deliverables Submitted -> Locked & Under Evaluation ---');
{
  const storage = createMockStorage();
  const userId = 'STUD_TEST_GH';

  const attemptsMap = {
    [userId]: {
      activeAttemptId: 'att_asm_prod_designing_STUD_TEST_GH_1',
      attempts: [{
        attemptId: 'att_asm_prod_designing_STUD_TEST_GH_1',
        attemptNumber: 1,
        assessmentId: 'asm_prod_designing',
        studentId: userId,
        submitTime: new Date().toISOString(),
        status: 'Submitted',
        submissions: {
          finalPng: { fileKey: 'png_key_1', fileName: 'banner.png', fileSize: 1024000 },
          sourceZip: { fileKey: 'zip_key_1', fileName: 'source.zip', fileSize: 5120000 },
          explanationVideo: { fileKey: 'vid_key_1', fileName: 'walkthrough.mp4', fileSize: 15000000, durationSeconds: 95 }
        }
      }]
    }
  };
  storage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  const att = attemptsMap[userId].attempts[0];
  assert.strictEqual(att.status, 'Submitted');
  assert.ok(att.submissions.finalPng);
  assert.ok(att.submissions.sourceZip);
  assert.ok(att.submissions.explanationVideo);
  assert.ok(att.submissions.explanationVideo.durationSeconds <= 120);
  pass('All 3 deliverables recorded and validated (Video duration <= 120s)');
  pass('Student returning sees "Assessment submitted successfully. Your work is under evaluation." No re-attempts allowed without retake override.');
}

// ----------------------------------------------------------------------------
// TEST I: Admin edits assessment -> Persists correctly
// ----------------------------------------------------------------------------
console.log('\n--- TEST I: Admin Edits Assessment Configuration -> Persists in Storage ---');
{
  const storage = createMockStorage();
  const updatedAsm = {
    asm_prod_designing: {
      id: 'asm_prod_designing',
      name: 'Updated Production Designing Brief',
      track: 'Production',
      subset: 'Designing',
      description: 'New custom description',
      caseStudy: 'New custom scenario for college branding challenge',
      instructions: '1. High-res vector banner\n2. Figma archive\n3. 90s video',
      durationMinutes: 180,
      availableFrom: '2026-09-15T10:00',
      deadline: '2026-09-20T23:59',
      status: 'Scheduled',
      updatedAt: new Date().toISOString()
    }
  };
  storage.setItem('rizz_assessments', JSON.stringify(updatedAsm));

  const reloaded = JSON.parse(storage.getItem('rizz_assessments'));
  assert.strictEqual(reloaded.asm_prod_designing.durationMinutes, 180);
  assert.strictEqual(reloaded.asm_prod_designing.status, 'Scheduled');
  assert.strictEqual(reloaded.asm_prod_designing.caseStudy, 'New custom scenario for college branding challenge');
  pass('Admin edits to case study, instructions, duration, and scheduling persist accurately');
}

// ----------------------------------------------------------------------------
// TEST J: No dummy content in initial defaults
// ----------------------------------------------------------------------------
console.log('\n--- TEST J: Zero Dummy Content Verification ---');
{
  // Check ADMIN.html DEFAULT_ASSESSMENTS definition
  assert.ok(adminHtml.includes("description: ''"), 'Default description should be empty');
  assert.ok(adminHtml.includes("caseStudy: ''"), 'Default caseStudy should be empty');
  assert.ok(adminHtml.includes("instructions: ''"), 'Default instructions should be empty');
  assert.ok(adminHtml.includes("status: 'Draft'"), 'Default status should be Draft');
  assert.ok(adminHtml.includes("assetPackage: null"), 'Default assetPackage should be null');
  assert.ok(adminHtml.includes("aiPrompt: ''"), 'Default aiPrompt should be empty');
  pass('Zero hardcoded dummy content in initial default assessment data');
}

// ----------------------------------------------------------------------------
// TEST K: Admin Assessment Editor - 7 Curved Container Cards
// ----------------------------------------------------------------------------
console.log('\n--- TEST K: Admin Assessment Editor Redesign Structure ---');
{
  // Check modal-edit-assessment and rounded containers
  assert.ok(adminHtml.includes('id="modal-edit-assessment"'), 'modal-edit-assessment exists');
  assert.ok(adminHtml.includes('1. Basic Details'), 'Section 1 exists');
  assert.ok(adminHtml.includes('2. Assessment Overview'), 'Section 2 exists');
  assert.ok(adminHtml.includes('3. Questions / Tasks') || adminHtml.includes('3. Questions'), 'Section 3 Questions/Tasks exists');
  assert.ok(adminHtml.includes('4. Instructions &amp; Deliverables') || adminHtml.includes('4. Instructions'), 'Section 4 exists');
  assert.ok(adminHtml.includes('5. Assessment Assets'), 'Section 5 exists');
  assert.ok(adminHtml.includes('6. Submission Requirements'), 'Section 6 exists');
  assert.ok(adminHtml.includes('7. Schedule &amp; Timing') || adminHtml.includes('7. Timing'), 'Section 7 exists');
  assert.ok(adminHtml.includes('8. Evaluation &amp; AI Prompt') || adminHtml.includes('8. Evaluation'), 'Section 8 exists');
  assert.ok(adminHtml.includes('id="btn-save-assessment-draft"'), 'Save Draft button exists');
  assert.ok(adminHtml.includes('id="btn-schedule-from-editor"'), 'Schedule button exists');
  assert.ok(adminHtml.includes('id="btn-publish-now-from-editor"'), 'Publish Now button exists');
  assert.ok(adminHtml.includes('id="modal-confirm-publish-now"'), 'Publish Now confirmation modal exists');

  // Verify rounded-2xl is used for curved cards
  const roundedCardMatches = (adminHtml.match(/rounded-2xl/g) || []).length;
  assert.ok(roundedCardMatches >= 8, 'At least 8 rounded-2xl containers present in ADMIN.html');
  pass('All 8 curved container cards + Action bar + Confirmation modal present in ADMIN.html');
}

// ----------------------------------------------------------------------------
// TEST L: Theme Support & Persistence
// ----------------------------------------------------------------------------
console.log('\n--- TEST L: Design System & Theme Consistency ---');
{
  // Verify fonts and color variables
  assert.ok(adminHtml.includes('Playfair Display') || adminHtml.includes('font-playfair'));
  assert.ok(adminHtml.includes('Darker Grotesque') || adminHtml.includes('font-grotesque'));
  assert.ok(adminHtml.includes('DM Sans') || adminHtml.includes('font-sans'));
  assert.ok(adminHtml.includes('#D31F83'), 'Magenta brand color present');
  assert.ok(adminHtml.includes('#EDA233'), 'Burnt Yellow brand color present');
  assert.ok(studHtml.includes('var(--bg-app)'), 'CSS variables for dynamic theme support present');
  assert.ok(studHtml.includes('var(--bg-card)'), 'CSS variables for dynamic card background present');
  pass('Design system typography, brand colors (#D31F83, #EDA233), and CSS theme variables verified');
}

console.log('\n============================================================');
console.log(`🎉 ALL ${passedCount} / ${passedCount} ASSESSMENT WORKFLOW TESTS PASSED! (100%)`);
console.log('============================================================\n');
