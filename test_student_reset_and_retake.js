// test_student_reset_and_retake.js
// Verification of clean student reset across all storage, evaluation tabs, and subsequent retake lifecycle

const assert = require('assert');
const http = require('http');

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(`${BASE_URL}${path}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 RUNNING STUDENT RESET & RETAKE VERIFICATION SUITE');
  console.log('============================================================\n');

  // Step 1: Initial Submissions for Student 1, 2, and 3
  console.log('--- STEP 1: Students 1, 2, 3 Submit Initial Pre-Tests ---');
  
  const initialAttemptStud1 = {
    attemptId: 'ATT-STUD-001-1000',
    studentId: 'STUD-001',
    studentName: 'Praneet Kawaldar',
    email: 'praneet@college.edu',
    college: 'Jain University',
    paperSeries: 'A',
    answers: { 'q1': 'A', 'q2': 'B', 'q3': 'C' },
    status: 'Pending',
    submitTime: 1700000000000,
    mcqScore: 12,
    totalScore: 12,
    maxScore: 21,
    productionScore: 7,
    productionMax: 7,
    strategyScore: 5,
    strategyMax: 7,
    techScore: 0,
    techMax: 7,
    suggestedCourse: 'Production',
    isTie: false,
    published: false
  };

  const initialAttemptStud2 = {
    attemptId: 'ATT-STUD-002-1000',
    studentId: 'STUD-002',
    studentName: 'Aarav Sharma',
    email: 'aarav@college.edu',
    college: 'RV College',
    paperSeries: 'B',
    answers: { 'q1': 'B', 'q2': 'B' },
    status: 'Pending',
    submitTime: 1700000001000,
    mcqScore: 14,
    totalScore: 14,
    maxScore: 21,
    suggestedCourse: 'Tie — Admin Decision Required',
    isTie: true,
    published: false
  };

  await request('POST', '/api/pretest/attempts', { studentId: 'STUD-001', attempt: initialAttemptStud1 });
  await request('POST', '/api/pretest/attempts', { studentId: 'STUD-002', attempt: initialAttemptStud2 });
  
  // Student 1 also has workshop track choice and assessment attempt
  await request('POST', '/api/workshop/choices', { studentId: 'STUD-001', choice: 'Production' });
  await request('POST', '/api/assessment/attempts', {
    studentId: 'STUD-001',
    record: {
      studentId: 'STUD-001',
      studentName: 'Praneet Kawaldar',
      attempts: [{
        attemptId: 'ASM-ATT-1',
        submittedAt: new Date().toISOString(),
        score: 85,
        status: 'Submitted'
      }]
    }
  });

  const check1 = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(Boolean(check1.data.attempts['STUD-001']), true);
  assert.strictEqual(Boolean(check1.data.attempts['STUD-002']), true);
  console.log('✅ PASS: Students 1 and 2 attempts recorded on backend server');

  // Step 2: Admin Resets Student 1
  console.log('\n--- STEP 2: Admin Resets Student 1 ---');
  const resetRes = await request('POST', '/api/reset-student', { studentId: 'STUD-001' });
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual(resetRes.data.success, true);
  console.log('✅ PASS: Reset endpoint returned 200 OK');

  // Step 3: Verify Student 1 is cleared everywhere
  console.log('\n--- STEP 3: Verify Student 1 is Cleared from Server Records ---');
  const pretestAfterReset = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(pretestAfterReset.data.attempts['STUD-001'], undefined, 'STUD-001 must be deleted from pretest attempts');
  assert.strictEqual(Boolean(pretestAfterReset.data.attempts['STUD-002']), true, 'STUD-002 must remain untouched');
  console.log('✅ PASS: Student 1 pretest attempt completely cleared from server');

  const asmAfterReset = await request('GET', '/api/assessment/attempts');
  assert.strictEqual(asmAfterReset.data.attempts['STUD-001'], undefined, 'STUD-001 must be deleted from assessment attempts');
  console.log('✅ PASS: Student 1 assessment attempt completely cleared from server');

  const choicesAfterReset = await request('GET', '/api/workshop/choices');
  assert.strictEqual(choicesAfterReset.data.choices['STUD-001'], undefined, 'STUD-001 must be deleted from workshop choices');
  console.log('✅ PASS: Student 1 workshop choice cleared from server');

  const progressAfterReset = await request('GET', '/api/progress/STUD-001');
  assert.strictEqual(progressAfterReset.data.progress.preTestStatus, 'ready');
  assert.strictEqual(progressAfterReset.data.progress.workshopStatus, 'locked');
  assert.strictEqual(progressAfterReset.data.progress.assessmentStatus, 'locked');
  assert.strictEqual(progressAfterReset.data.progress.resultsStatus, 'locked');
  console.log('✅ PASS: Student 1 progress reset to ready / locked state');

  // Step 4: Simulate Student 1 Taking the Test Again (Retake)
  console.log('\n--- STEP 4: Student 1 Retakes the Pre-Test ---');
  const retakeAttemptStud1 = {
    attemptId: 'ATT-STUD-001-2000',
    studentId: 'STUD-001',
    studentName: 'Praneet Kawaldar',
    email: 'praneet@college.edu',
    college: 'Jain University',
    paperSeries: 'C',
    answers: { 'q1': 'D', 'q2': 'D', 'q3': 'D', 'q4': 'D', 'q5': 'D', 'q6': 'D', 'q7': 'D' },
    status: 'Pending',
    submitTime: 1700000050000,
    mcqScore: 21,
    totalScore: 21,
    maxScore: 21,
    productionScore: 7,
    productionMax: 7,
    strategyScore: 7,
    strategyMax: 7,
    techScore: 7,
    techMax: 7,
    suggestedCourse: 'Tech',
    isTie: false,
    published: false
  };

  const retakeSaveRes = await request('POST', '/api/pretest/attempts', { studentId: 'STUD-001', attempt: retakeAttemptStud1 });
  assert.strictEqual(retakeSaveRes.status, 200);
  console.log('✅ PASS: Student 1 retake submitted successfully');

  // Step 5: Admin Evaluation Tab Checks
  console.log('\n--- STEP 5: Admin Queries Evaluation Tab for Retake ---');
  const adminEvalCheck = await request('GET', '/api/pretest/attempts');
  const stud1Fresh = adminEvalCheck.data.attempts['STUD-001'];
  assert.strictEqual(Boolean(stud1Fresh), true, 'STUD-001 must appear in evaluation tab');
  assert.strictEqual(stud1Fresh.attemptId, 'ATT-STUD-001-2000', 'Must be the new attempt ID');
  assert.strictEqual(stud1Fresh.paperSeries, 'C', 'Must have new paper series C');
  assert.strictEqual(stud1Fresh.totalScore, 21, 'Must have new score 21');
  assert.strictEqual(stud1Fresh.suggestedCourse, 'Tech', 'Must have new suggestion Tech');
  assert.strictEqual(stud1Fresh.status, 'Pending', 'Must be in Pending status');
  console.log('✅ PASS: Retake is active and evaluated in Admin Evaluation tab with score 21/21');

  // Step 6: Admin Finalizes and Publishes Retake
  console.log('\n--- STEP 6: Admin Finalizes and Publishes Retake ---');
  stud1Fresh.status = 'Published';
  stud1Fresh.published = true;
  stud1Fresh.adminFinalScore = 21;
  stud1Fresh.adminFinalSuggestion = 'Tech';
  
  await request('POST', '/api/pretest/attempts', { studentId: 'STUD-001', attempt: stud1Fresh });
  await request('POST', '/api/progress/STUD-001', {
    progress: {
      preTestStatus: 'completed',
      workshopStatus: 'available',
      suggestedTrack: 'Tech',
      suggestedCourse: 'Tech',
      resultsStatus: 'published',
      finalScore: 21
    }
  });

  const finalCheck = await request('GET', '/api/sync/all');
  assert.strictEqual(finalCheck.data.pretestAttempts['STUD-001'].status, 'Published');
  assert.strictEqual(finalCheck.data.progress['STUD-001'].workshopStatus, 'available');
  assert.strictEqual(finalCheck.data.progress['STUD-001'].suggestedTrack, 'Tech');
  console.log('✅ PASS: Retake published and workshop unlocked with Tech track');

  console.log('\n============================================================');
  console.log('🎉 ALL RESET & RETAKE TESTS PASSED SUCCESSFULLY (100%)');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
