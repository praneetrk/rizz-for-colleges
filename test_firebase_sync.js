const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Firebase Realtime Database Integration Test Suite...\n');

let passCount = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Verify firebase-config.js structure
test('firebase-config.js exists and exports window.RIZZ_FIREBASE_CONFIG and window.RizzDB', () => {
  const code = fs.readFileSync('firebase-config.js', 'utf8');
  assert(code.includes('window.RIZZ_FIREBASE_CONFIG ='), 'Should define window.RIZZ_FIREBASE_CONFIG');
  assert(code.includes('apiKey:'), 'Should have apiKey placeholder');
  assert(code.includes('databaseURL:'), 'Should have databaseURL placeholder');
  assert(code.includes('window.RizzDB ='), 'Should export window.RizzDB');
  assert(code.includes('setSchedule:'), 'Should have setSchedule method');
  assert(code.includes('onScheduleChange:'), 'Should have onScheduleChange method');
  assert(code.includes('pushSubmission:'), 'Should have pushSubmission method');
  assert(code.includes('onSubmissions:'), 'Should have onSubmissions method');
  assert(code.includes('saveExamData:'), 'Should have saveExamData method');
  assert(code.includes('saveProgress:'), 'Should have saveProgress method');
});

// 2. Verify STUD.html integration
test('STUD.html includes Firebase SDK scripts and firebase-config.js in head', () => {
  const stud = fs.readFileSync('STUD.html', 'utf8');
  assert(stud.includes('firebase-app-compat.js'), 'STUD.html should include firebase-app-compat.js');
  assert(stud.includes('firebase-database-compat.js'), 'STUD.html should include firebase-database-compat.js');
  assert(stud.includes('src="firebase-config.js"'), 'STUD.html should include firebase-config.js');
});

test('STUD.html implements real-time /testSchedule listener & countdown trigger', () => {
  const stud = fs.readFileSync('STUD.html', 'utf8');
  assert(stud.includes('window.RizzDB.onScheduleChange'), 'STUD.html should listen to onScheduleChange');
  assert(stud.includes('landingCountdownDisplay'), 'STUD.html should have landingCountdownDisplay for countdown');
  assert(stud.includes('updateLandingCountdown'), 'STUD.html should have countdown updating function');
});

test('STUD.html pushes submissions to Firebase Realtime Database on submitPreTest', () => {
  const stud = fs.readFileSync('STUD.html', 'utf8');
  assert(stud.includes('window.RizzDB.pushSubmission(att)'), 'STUD.html should call pushSubmission on submit');
  assert(stud.includes('window.RizzDB.saveProgress(uId, prog)'), 'STUD.html should save student progress');
});

// 3. Verify ADMIN.html integration
test('ADMIN.html includes Firebase SDK scripts and firebase-config.js in head', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('firebase-app-compat.js'), 'ADMIN.html should include firebase-app-compat.js');
  assert(admin.includes('firebase-database-compat.js'), 'ADMIN.html should include firebase-database-compat.js');
  assert(admin.includes('src="firebase-config.js"'), 'ADMIN.html should include firebase-config.js');
});

test('ADMIN.html saves scheduled test timestamp and status to Firebase /testSchedule', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('window.RizzDB.setSchedule'), 'ADMIN.html should save schedule to Firebase');
  assert(admin.includes("status: 'Scheduled'"), 'ADMIN.html should support Scheduled status');
  assert(admin.includes("status: 'Published'"), 'ADMIN.html should support Published status');
});

test('ADMIN.html listens in real-time to /submissions and updates evaluations live', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('window.RizzDB.onSubmissions'), 'ADMIN.html should listen to onSubmissions');
  assert(admin.includes('initFirebaseSubmissionsListener'), 'ADMIN.html should have initFirebaseSubmissionsListener');
  assert(admin.includes('renderEvaluationViewSync()'), 'ADMIN.html should re-render evaluations on new submission');
  assert(admin.includes('New pre-test submission from'), 'ADMIN.html should show toast on new submission');
});

// 4. Test RizzDB logic in Node environment (simulated window)
test('RizzDB simulated execution and fallback safety', async () => {
  const globalWindow = {
    addEventListener: () => {},
    RIZZ_FIREBASE_CONFIG: {
      apiKey: "YOUR_API_KEY",
      databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
    }
  };
  
  const firebaseCode = fs.readFileSync('firebase-config.js', 'utf8');
  const contextFunc = new Function('window', firebaseCode);
  contextFunc(globalWindow);

  assert.strictEqual(typeof globalWindow.RizzDB.isConfigured(), 'boolean', 'isConfigured should return boolean');
  assert.strictEqual(globalWindow.RizzDB.isConfigured(), true, 'isConfigured should return true for configured keys');
  
  // Test schedule payload formation
  const schedPayload = await globalWindow.RizzDB.setSchedule({
    scheduledAt: '2026-09-18T10:00:00.000Z',
    status: 'Scheduled',
    durationMinutes: 60
  });

  assert.strictEqual(schedPayload.status, 'Scheduled');
  assert.strictEqual(schedPayload.scheduledAt, '2026-09-18T10:00:00.000Z');
  assert.strictEqual(typeof schedPayload.timestamp, 'number');

  // Test push submission payload formation
  const subPayload = await globalWindow.RizzDB.pushSubmission({
    studentId: 'STUD-001',
    studentName: 'Aarav Patel',
    mcqScore: 18,
    totalScore: 18,
    suggestedCourse: 'Strategy'
  });

  assert.strictEqual(subPayload.studentId, 'STUD-001');
  assert.strictEqual(subPayload.totalScore, 18);
  assert(subPayload.submittedAt, 'Should include submittedAt ISO date');
});

console.log(`\n📊 Test Results: ${passCount} / ${totalTests} tests passed.`);
if (passCount === totalTests) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
} else {
  process.exit(1);
}
