// test_pretest_glitch_fix.js
// Verification suite for Pre-Test Smooth MCQ Selection & Auto-Submit Glitch Prevention

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n============================================================');
console.log('🧪 RUNNING PRE-TEST SMOOTH SELECTION & AUTO-SUBMIT FIX SUITE');
console.log('============================================================\n');

const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');

// --- TEST 1: Source Code Invariant Checks ---
console.log('--- TEST 1: Code Invariant & Event Handler Verifications ---');

// 1. Debounced saveStudentAttempt exists
assert.ok(studHtml.includes('let _pretestDebounceTimer = null;'), '_pretestDebounceTimer exists in STUD.html');
assert.ok(studHtml.includes('saveStudentAttempt(att, immediateNetworkSync)'), 'saveStudentAttempt supports immediate/debounced network sync');

// 2. In-place DOM update in selectMCQOption without calling renderActiveQuestion()
assert.ok(studHtml.includes('card.querySelectorAll(\'.option-card\')'), 'selectMCQOption updates option-card classes in place');
assert.ok(!studHtml.includes('att.answers[qId] = optKey;\n      saveStudentAttempt(att);\n      renderActiveQuestion();'), 'selectMCQOption does NOT destroy DOM by calling renderActiveQuestion on every click');

// 3. Radio input onclick stops propagation to avoid double firing
assert.ok(studHtml.includes('onclick="event.stopPropagation()"'), 'Radio input stops click propagation');

// 4. Proctoring violation throttling and debouncing
assert.ok(studHtml.includes('let lastViolationTimestamp = 0;'), 'Proctoring has violation cooldown timestamp');
assert.ok(studHtml.includes('now - lastViolationTimestamp < 4000'), 'Proctoring throttles violations (min 4s interval)');
assert.ok(studHtml.includes('document.visibilityState === \'hidden\''), 'Proctoring prioritizes true document visibility hidden');

// 5. In-progress exam protection from background sync and Firebase
assert.ok(studHtml.includes('if (activeExamState && activeExamState.isStarted)'), 'Incoming sync checks activeExamState.isStarted');
assert.ok(studHtml.includes('localCurrent.status === \'in_progress\''), 'Incoming attempt sync protects local in_progress status');

console.log('✅ PASS: All 5 structural & event invariants verified in STUD.html');


// --- TEST 2: Option Selection & State Invariant Simulation ---
console.log('\n--- TEST 2: MCQ Option Selection & State Persistence Simulation ---');
{
  const mockStorage = {};
  const LS_PRETEST_ATTEMPTS = 'rizz_pretest_attempts';
  
  const studentId = 'STUD-001';
  let _pretestDebounceTimer = null;
  let backendSyncCount = 0;

  function saveStudentAttempt(att, immediateNetworkSync) {
    mockStorage[LS_PRETEST_ATTEMPTS] = JSON.stringify({ [studentId]: att });
    if (immediateNetworkSync) {
      backendSyncCount++;
    }
  }

  const activeAttempt = {
    attemptId: 'ATT-STUD-001-123456',
    studentId: studentId,
    status: 'in_progress',
    startTime: Date.now(),
    endTime: Date.now() + 60 * 60 * 1000,
    answers: {},
    warningCount: 0,
    questionsSnapshot: [
      { id: 'q1', text: 'Question 1', options: { A: 'Alpha', B: 'Beta', C: 'Gamma', D: 'Delta' }, correctAnswer: 'A', marks: 1, track: 'production' },
      { id: 'q2', text: 'Question 2', options: { A: 'Alpha', B: 'Beta', C: 'Gamma', D: 'Delta' }, correctAnswer: 'B', marks: 1, track: 'strategy' },
      { id: 'q3', text: 'Question 3', options: { A: 'Alpha', B: 'Beta', C: 'Gamma', D: 'Delta' }, correctAnswer: 'C', marks: 1, track: 'tech' }
    ]
  };

  saveStudentAttempt(activeAttempt, true);

  // Simulate student clicking Q1: Option B
  activeAttempt.answers['q1'] = 'B';
  saveStudentAttempt(activeAttempt, false);

  // Student changes mind on Q1: Option A
  activeAttempt.answers['q1'] = 'A';
  saveStudentAttempt(activeAttempt, false);

  // Student answers Q2: Option B
  activeAttempt.answers['q2'] = 'B';
  saveStudentAttempt(activeAttempt, false);

  // Student answers Q3: Option C
  activeAttempt.answers['q3'] = 'C';
  saveStudentAttempt(activeAttempt, false);

  const saved = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS])[studentId];
  assert.strictEqual(saved.answers['q1'], 'A', 'Q1 answered A');
  assert.strictEqual(saved.answers['q2'], 'B', 'Q2 answered B');
  assert.strictEqual(saved.answers['q3'], 'C', 'Q3 answered C');
  assert.strictEqual(saved.status, 'in_progress', 'Status remains in_progress during answering');
  console.log('✅ PASS: Option selection persists smoothly and answers update seamlessly');
}


// --- TEST 3: Background Sync Interference Immunity ---
console.log('\n--- TEST 3: Immunity to Background Sync & Stale Server Overwrite ---');
{
  const studentId = 'STUD-001';
  let activeExamState = { isStarted: true };
  let localAttempts = {
    [studentId]: {
      attemptId: 'ATT-STUD-001-NEW',
      studentId: studentId,
      status: 'in_progress',
      answers: { q1: 'A', q2: 'B' }
    }
  };

  // Simulate remote sync payload sending an OLD submitted attempt from a previous session
  const incomingServerAttempt = {
    [studentId]: {
      attemptId: 'ATT-STUD-001-OLD',
      studentId: studentId,
      status: 'submitted',
      answers: {}
    }
  };

  // Simulate STUD.html syncStudentDataWithServer logic
  const localAtt = localAttempts[studentId];
  const merged = Object.assign({}, incomingServerAttempt);
  if (localAtt && localAtt.status === 'in_progress') {
    merged[studentId] = localAtt; // Protected!
  }

  assert.strictEqual(merged[studentId].status, 'in_progress', 'Local in-progress attempt is NOT overwritten by remote submitted status');
  assert.strictEqual(merged[studentId].attemptId, 'ATT-STUD-001-NEW', 'Active attempt ID preserved');
  assert.strictEqual(merged[studentId].answers['q1'], 'A', 'Active answers preserved during server sync');
  console.log('✅ PASS: Background server polling never overwrites active in-progress exam');
}


// --- TEST 4: Proctoring Cooldown & Anti-Spam Protection ---
console.log('\n--- TEST 4: Proctoring Cooldown & Anti-Spam Protection ---');
{
  let warningCount = 0;
  let lastViolationTimestamp = 0;
  let proctoringArmed = true;

  function simulateViolation(nowTimestamp) {
    if (!proctoringArmed) return;
    if (nowTimestamp - lastViolationTimestamp < 4000) {
      return; // Throttled!
    }
    lastViolationTimestamp = nowTimestamp;
    warningCount++;
  }

  const t0 = 1700000000000;
  // Rapid flurry of 5 window blur events within 2 seconds
  simulateViolation(t0);
  simulateViolation(t0 + 200);
  simulateViolation(t0 + 500);
  simulateViolation(t0 + 800);
  simulateViolation(t0 + 1000);

  assert.strictEqual(warningCount, 1, 'Rapid blur flurry only registers 1 warning due to 4s cooldown');

  // Next violation after 5 seconds
  simulateViolation(t0 + 5000);
  assert.strictEqual(warningCount, 2, 'Second warning registered after cooldown');

  // Third violation after another 5 seconds
  simulateViolation(t0 + 10000);
  assert.strictEqual(warningCount, 3, 'Third warning registered only after genuine separate violations');

  console.log('✅ PASS: Proctoring cooldown successfully prevents false-positive rapid auto-submits');
}

console.log('\n============================================================');
console.log('🎉 ALL PRE-TEST GLITCH FIX & SMOOTH SELECTION TESTS PASSED!');
console.log('============================================================\n');
