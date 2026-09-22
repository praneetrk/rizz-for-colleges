// test_mq_student_reset.js
// Verification of MQ student (Name: MQ, User ID: CBALC-001, Email: 1@mq) reset and retake lifecycle

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
  console.log('🧪 RUNNING MQ STUDENT (CBALC-001) RESET & RETAKE TEST SUITE');
  console.log('============================================================\n');

  // Scenario 1: Attempt was keyed by 'MQ' (Name) or 'CBALC-001'
  console.log('--- TEST 1: Submit Initial Attempts for MQ (key: MQ) & Control Student (JAIN-001) ---');
  
  const mqAttempt = {
    attemptId: 'ATT-MQ-1789467200000',
    studentId: 'MQ',
    studentName: 'MQ',
    email: '1@mq',
    college: 'CBALC',
    paperSeries: 'A',
    answers: { 'q1': 'A', 'q2': 'B', 'q3': 'C' },
    status: 'Pending',
    submitTime: 1789467200000,
    mcqScore: 15,
    totalScore: 15,
    maxScore: 21,
    suggestedCourse: 'Tech',
    isTie: false,
    published: false
  };

  const controlAttempt = {
    attemptId: 'ATT-JAIN-001-1789467201000',
    studentId: 'JAIN-001',
    studentName: 'Praneet',
    email: 'praneet@college.edu',
    college: 'Jain',
    paperSeries: 'B',
    answers: { 'q1': 'B' },
    status: 'Pending',
    submitTime: 1789467201000,
    mcqScore: 18,
    totalScore: 18,
    maxScore: 21,
    suggestedCourse: 'Strategy',
    isTie: false,
    published: false
  };

  await request('POST', '/api/pretest/attempts', { studentId: 'MQ', attempt: mqAttempt });
  await request('POST', '/api/pretest/attempts', { studentId: 'JAIN-001', attempt: controlAttempt });
  await request('POST', '/api/workshop/choices', { studentId: 'MQ', choice: 'Tech' });
  await request('POST', '/api/assessment/attempts', {
    studentId: 'MQ',
    record: {
      studentId: 'MQ',
      studentName: 'MQ',
      email: '1@mq',
      attempts: [{ attemptId: 'ASM-1', status: 'Submitted' }]
    }
  });

  const check1 = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(Boolean(check1.data.attempts['MQ']), true, 'MQ attempt must be in backend');
  assert.strictEqual(Boolean(check1.data.attempts['JAIN-001']), true, 'JAIN-001 attempt must be in backend');
  console.log('✅ PASS: Both MQ and Control attempts recorded on server');

  // Scenario 2: Admin triggers reset passing User ID 'CBALC-001' (from students.xlsx)
  console.log('\n--- TEST 2: Admin Resets Student via Canonical User ID (CBALC-001) ---');
  const resetRes = await request('POST', '/api/reset-student', {
    studentId: 'CBALC-001',
    studentName: 'MQ',
    email: '1@mq'
  });
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual(resetRes.data.success, true);
  console.log('✅ PASS: /api/reset-student succeeded for student MQ / CBALC-001');

  // Scenario 3: Verify MQ attempt is cleared everywhere
  console.log('\n--- TEST 3: Verify MQ Attempt is Cleared from Server Records ---');
  const evalCheck = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(evalCheck.data.attempts['MQ'], undefined, 'Key MQ must be deleted');
  assert.strictEqual(evalCheck.data.attempts['CBALC-001'], undefined, 'Key CBALC-001 must be deleted');
  assert.strictEqual(Boolean(evalCheck.data.attempts['JAIN-001']), true, 'Control student JAIN-001 must remain intact');
  console.log('✅ PASS: MQ pretest attempt completely cleared from Evaluation records');

  const asmCheck = await request('GET', '/api/assessment/attempts');
  assert.strictEqual(asmCheck.data.attempts['MQ'], undefined, 'MQ assessment attempt deleted');
  assert.strictEqual(asmCheck.data.attempts['CBALC-001'], undefined, 'CBALC-001 assessment attempt deleted');
  console.log('✅ PASS: MQ assessment attempt completely cleared');

  const choicesCheck = await request('GET', '/api/workshop/choices');
  assert.strictEqual(choicesCheck.data.choices['MQ'], undefined, 'MQ workshop choice deleted');
  assert.strictEqual(choicesCheck.data.choices['CBALC-001'], undefined, 'CBALC-001 workshop choice deleted');
  console.log('✅ PASS: MQ workshop choice completely cleared');

  // Scenario 4: MQ Takes the Test Again (Retake)
  console.log('\n--- TEST 4: Student MQ Retakes the Pre-Test ---');
  const retakeAttemptMQ = {
    attemptId: 'ATT-CBALC-001-1789467300000',
    studentId: 'CBALC-001',
    studentName: 'MQ',
    email: '1@mq',
    college: 'CBALC',
    paperSeries: 'A',
    answers: { 'q1': 'A', 'q2': 'A', 'q3': 'A', 'q4': 'A', 'q5': 'A', 'q6': 'A', 'q7': 'A' },
    status: 'Pending',
    submitTime: 1789467300000,
    mcqScore: 21,
    totalScore: 21,
    maxScore: 21,
    productionScore: 7,
    productionMax: 7,
    strategyScore: 7,
    strategyMax: 7,
    techScore: 7,
    techMax: 7,
    suggestedCourse: 'Production',
    isTie: false,
    published: false
  };

  await request('POST', '/api/pretest/attempts', { studentId: 'CBALC-001', attempt: retakeAttemptMQ });

  const afterRetake = await request('GET', '/api/pretest/attempts');
  const freshAttempt = afterRetake.data.attempts['CBALC-001'];
  assert.strictEqual(Boolean(freshAttempt), true, 'CBALC-001 retake must be present');
  assert.strictEqual(freshAttempt.studentName, 'MQ', 'Student name must be MQ');
  assert.strictEqual(freshAttempt.totalScore, 21, 'Score must be 21');
  assert.strictEqual(freshAttempt.status, 'Pending', 'Status must be Pending');
  console.log('✅ PASS: MQ retake successfully recorded and visible in Admin Evaluation tab with score 21/21');

  // Scenario 5: Resetting when keyed by CBALC-001
  console.log('\n--- TEST 5: Resetting Student by Name identifier (MQ) ---');
  const resetByName = await request('POST', '/api/reset-student', {
    studentId: 'MQ',
    studentName: 'MQ',
    email: '1@mq'
  });
  assert.strictEqual(resetByName.status, 200);

  const finalEvalCheck = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(finalEvalCheck.data.attempts['CBALC-001'], undefined, 'CBALC-001 must be deleted when reset by Name MQ');
  assert.strictEqual(Boolean(finalEvalCheck.data.attempts['JAIN-001']), true, 'Control student JAIN-001 still intact');
  console.log('✅ PASS: Resetting by Name identifier (MQ) cleanly purged CBALC-001 evaluation record');

  console.log('\n============================================================');
  console.log('🎉 ALL MQ STUDENT RESET & RETAKE TESTS PASSED (100%)');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
