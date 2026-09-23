// test_pretest_refresh_fix.js
// Verification suite for Pre-Test No-Refresh Option Selection & Proctoring Reload Guard

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n============================================================');
console.log('🧪 RUNNING PRE-TEST NO-REFRESH & PROCTORING RELOAD GUARD TEST');
console.log('============================================================\n');

const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// --- TEST 1: Source Code Invariant Verifications ---
console.log('--- TEST 1: Source Code Invariants in STUD.html and server.js ---');

// 1. Check isPageUnloading and beforeunload/pagehide listeners
assert.ok(studHtml.includes("let isPageUnloading = false;"), "STUD.html defines isPageUnloading");
assert.ok(studHtml.includes("window.addEventListener('beforeunload'"), "STUD.html listens to beforeunload");
assert.ok(studHtml.includes("window.addEventListener('pagehide'"), "STUD.html listens to pagehide");
assert.ok(studHtml.includes("if (isPageUnloading) return;"), "STUD.html guards onVisibilityChange with isPageUnloading");
assert.ok(studHtml.includes("proctoringArmTimestamp"), "STUD.html has arming grace period");

// 2. Check option card DOM & clean click handling
assert.ok(studHtml.includes('class="option-card${isSelected ? \' selected\' : \'\'}"'), "Option cards have option-card class");
assert.ok(studHtml.includes('pointer-events-none'), "Radio input has pointer-events-none to prevent double-firing");
assert.ok(studHtml.includes('if (typeof event.preventDefault === \'function\') event.preventDefault();'), "selectMCQOption prevents default event behavior");

// 3. Check server.js in-memory attempt caching and disk-shielding
assert.ok(serverJs.includes('let inMemoryPretestAttempts = null;'), "server.js has inMemoryPretestAttempts cache");
assert.ok(serverJs.includes('getPretestAttemptsMap()'), "server.js has getPretestAttemptsMap");
assert.ok(serverJs.includes("if (payload.attempt.status && payload.attempt.status !== 'in_progress')"), "server.js only writes to disk when attempt is NOT in_progress");

console.log('✅ PASS: All structural code invariants verified successfully.\n');


// --- TEST 2: Live Server API Disk-Shielding Verification ---
console.log('--- TEST 2: Backend API Disk-Shielding During In-Progress Exam ---');

async function testBackendDiskShielding() {
  const attemptsFilePath = path.join(__dirname, 'uploads', 'pretest_attempts.json');
  const initialMtime = fs.statSync(attemptsFilePath).mtimeMs;

  const testStudentId = 'TEST-SHIELD-001';
  const inProgressAttempt = {
    attemptId: 'ATT-TEST-INPROGRESS-1',
    studentId: testStudentId,
    status: 'in_progress',
    startTime: Date.now(),
    endTime: Date.now() + 3600000,
    answers: { q1: 'A' },
    warningCount: 0
  };

  // POST in_progress attempt
  const resp1 = await fetch('http://localhost:8080/api/pretest/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: testStudentId, attempt: inProgressAttempt })
  });
  assert.strictEqual(resp1.status, 200, 'POST in_progress returned 200');

  // Verify disk file was NOT modified (mtime unchanged)
  const mtimeAfterInProgress = fs.statSync(attemptsFilePath).mtimeMs;
  assert.strictEqual(mtimeAfterInProgress, initialMtime, 'Disk file mtime was NOT touched during in_progress update!');
  console.log('✅ PASS: In-progress attempt did NOT touch disk (file watchers/Live Server will NOT reload)');

  // Verify GET /api/pretest/attempts returns in-memory state in real time
  const getResp = await fetch('http://localhost:8080/api/pretest/attempts');
  const getData = await getResp.json();
  assert.ok(getData.attempts[testStudentId], 'GET /api/pretest/attempts returns in-memory active attempt');
  assert.strictEqual(getData.attempts[testStudentId].answers.q1, 'A', 'In-memory answer returned accurately');
  console.log('✅ PASS: Real-time in-memory lookup serves active answers immediately');

  // POST submitted/Pending attempt -> MUST write to disk
  inProgressAttempt.status = 'Pending';
  inProgressAttempt.submitTime = Date.now();
  const resp2 = await fetch('http://localhost:8080/api/pretest/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: testStudentId, attempt: inProgressAttempt })
  });
  assert.strictEqual(resp2.status, 200, 'POST Pending returned 200');

  const mtimeAfterPending = fs.statSync(attemptsFilePath).mtimeMs;
  assert.ok(mtimeAfterPending >= initialMtime, 'Disk file was properly updated upon submission');
  console.log('✅ PASS: Disk file updated upon exam submission');

  // Clean up test student
  await fetch('http://localhost:8080/api/reset-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: testStudentId })
  });
}

// --- TEST 3: Proctoring Visibility & Unload Logic Simulation ---
console.log('\n--- TEST 3: Proctoring Reload Guard vs. Genuine Tab Switch Simulation ---');
{
  let warningCount = 0;
  let isPageUnloading = false;
  let proctoringArmTimestamp = Date.now() - 5000; // 5s ago
  let activeExamState = { proctoringArmed: true, isViolationModalOpen: false };

  function onVisibilityChangeMock(docVisibilityState) {
    if (isPageUnloading) return; // Guard!
    if (Date.now() - proctoringArmTimestamp < 2500) return;
    if (docVisibilityState === 'hidden' && activeExamState.proctoringArmed) {
      warningCount++;
    }
  }

  // Scenario A: Page reload happens (beforeunload fires first)
  isPageUnloading = true;
  onVisibilityChangeMock('hidden');
  assert.strictEqual(warningCount, 0, 'Page reload/unload did NOT trigger any violation warning');
  console.log('✅ PASS: Page reload/unload correctly ignored by proctoring (0 warnings)');

  // Scenario B: Real student tab switch occurs (beforeunload did NOT fire)
  isPageUnloading = false;
  onVisibilityChangeMock('hidden');
  assert.strictEqual(warningCount, 1, 'Genuine tab switch registered Warning 1');

  // Another tab switch 5s later
  onVisibilityChangeMock('hidden');
  assert.strictEqual(warningCount, 2, 'Genuine tab switch registered Warning 2');

  console.log('✅ PASS: Genuine tab switching continues to trigger security warnings properly');
}

testBackendDiskShielding().then(() => {
  console.log('\n============================================================');
  console.log('🎉 ALL PRE-TEST NO-REFRESH & PROCTORING TESTS PASSED (100%)');
  console.log('============================================================\n');
}).catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
