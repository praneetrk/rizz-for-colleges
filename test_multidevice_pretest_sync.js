/**
 * TEST SUITE: MULTI-DEVICE PRE-TEST SUBMISSION & ADMIN EVALUATION TAB SYNC
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { server, PORT, UPLOADS_DIR } = require('./server');

let totalTests = 0;
let passedTests = 0;

function assert(condition, msg) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const req = http.request(
      `http://localhost:${PORT}${urlPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:${PORT}${urlPath}`,
      { method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 RUNNING MULTI-DEVICE PRE-TEST SUBMISSION & ADMIN EVAL SYNC');
  console.log('============================================================\n');

  // Start test server if not already listening
  if (!server.listening) {
    try {
      await new Promise((resolve, reject) => {
        server.listen(PORT, () => {
          console.log(`Test server active on port ${PORT}\n`);
          resolve();
        });
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Connected to existing server on port ${PORT}\n`);
            resolve();
          } else {
            reject(err);
          }
        });
      });
    } catch (e) {}
  }

  try {
    // 0. Clean test attempts file
    const pretestFile = path.join(UPLOADS_DIR, 'pretest_attempts.json');
    if (fs.existsSync(pretestFile)) fs.unlinkSync(pretestFile);

    // 1. Simulate Student 1 (STUD-001) Pre-Test submission from Device 1
    console.log('--- TEST 1: Student 1 (STUD-001) Submits Pre-Test ---');
    const student1Attempt = {
      attemptId: 'ATT-STUD-001-' + Date.now(),
      studentId: 'STUD-001',
      studentName: 'Aarav Sharma',
      email: 'aarav.sharma@college.edu',
      college: 'Delhi Technical University',
      paperSeries: 'A',
      totalScore: 18,
      maxScore: 21,
      productionScore: 6,
      productionMax: 7,
      strategyScore: 7,
      strategyMax: 7,
      techScore: 5,
      techMax: 7,
      suggestedCourse: 'Strategy',
      isTie: false,
      status: 'Pending',
      submitTime: Date.now(),
      published: false
    };

    const s1Res = await postJson('/api/pretest/attempts', {
      studentId: 'STUD-001',
      attempt: student1Attempt
    });
    assert(s1Res.status === 200 && s1Res.data.success, 'Student 1 pre-test attempt saved to backend server');

    // 2. Simulate Student 2 (STUD-002) Pre-Test submission from Device 2
    console.log('\n--- TEST 2: Student 2 (STUD-002) Submits Pre-Test ---');
    const student2Attempt = {
      attemptId: 'ATT-STUD-002-' + Date.now(),
      studentId: 'STUD-002',
      studentName: 'Priya Patel',
      email: 'priya.patel@college.edu',
      college: 'Mumbai Institute of Tech',
      paperSeries: 'B',
      totalScore: 19,
      maxScore: 21,
      productionScore: 5,
      productionMax: 7,
      strategyScore: 7,
      strategyMax: 7,
      techScore: 7,
      techMax: 7,
      suggestedCourse: 'Tie — Admin Decision Required',
      isTie: true,
      status: 'Pending',
      submitTime: Date.now(),
      published: false
    };

    const s2Res = await postJson('/api/pretest/attempts', {
      studentId: 'STUD-002',
      attempt: student2Attempt
    });
    assert(s2Res.status === 200 && s2Res.data.success, 'Student 2 pre-test attempt saved to backend server');

    // 3. Simulate Student 3 (STUD-003) Pre-Test submission from Device 3
    console.log('\n--- TEST 3: Student 3 (STUD-003) Submits Pre-Test ---');
    const student3Attempt = {
      attemptId: 'ATT-STUD-003-' + Date.now(),
      studentId: 'STUD-003',
      studentName: 'Rohan Verma',
      email: 'rohan.verma@college.edu',
      college: 'Bangalore Engineering College',
      paperSeries: 'C',
      totalScore: 16,
      maxScore: 21,
      productionScore: 7,
      productionMax: 7,
      strategyScore: 4,
      strategyMax: 7,
      techScore: 5,
      techMax: 7,
      suggestedCourse: 'Production',
      isTie: false,
      status: 'Pending',
      submitTime: Date.now(),
      published: false
    };

    const s3Res = await postJson('/api/pretest/attempts', {
      studentId: 'STUD-003',
      attempt: student3Attempt
    });
    assert(s3Res.status === 200 && s3Res.data.success, 'Student 3 pre-test attempt saved to backend server');

    // 4. Admin Console Query: Fetch all submissions from server
    console.log('\n--- TEST 4: Admin Queries /api/pretest/attempts ---');
    const adminGetRes = await getJson('/api/pretest/attempts');
    assert(adminGetRes.status === 200 && adminGetRes.data.success, 'Admin successfully fetches pre-test attempts');
    const attemptsMap = adminGetRes.data.attempts;
    assert(Object.keys(attemptsMap).length === 3, 'All 3 student attempts present on server');
    assert(attemptsMap['STUD-001'].studentName === 'Aarav Sharma', 'STUD-001 name verified');
    assert(attemptsMap['STUD-002'].studentName === 'Priya Patel', 'STUD-002 name verified');
    assert(attemptsMap['STUD-003'].studentName === 'Rohan Verma', 'STUD-003 name verified');
    assert(attemptsMap['STUD-001'].totalScore === 18, 'STUD-001 total marks 18 verified');
    assert(attemptsMap['STUD-002'].isTie === true, 'STUD-002 tie condition verified');
    assert(attemptsMap['STUD-003'].suggestedCourse === 'Production', 'STUD-003 course recommendation verified');

    // 5. Simulate Admin Evaluation: Finalize Student 2 (Tie resolution)
    console.log('\n--- TEST 5: Admin Finalizes Student 2 ---');
    attemptsMap['STUD-002'].adminFinalScore = 20;
    attemptsMap['STUD-002'].adminFinalSuggestion = 'Tech';
    attemptsMap['STUD-002'].status = 'Finalized';

    const finalizeRes = await postJson('/api/pretest/attempts', {
      studentId: 'STUD-002',
      attempt: attemptsMap['STUD-002']
    });
    assert(finalizeRes.status === 200, 'Student 2 finalization synced to server');

    const checkFinalized = await getJson('/api/pretest/attempts');
    assert(checkFinalized.data.attempts['STUD-002'].status === 'Finalized', 'STUD-002 status is Finalized on server');
    assert(checkFinalized.data.attempts['STUD-002'].adminFinalSuggestion === 'Tech', 'STUD-002 course resolved to Tech');

    // 6. Simulate Admin Bulk Publish
    console.log('\n--- TEST 6: Admin Bulk Publishes Evaluations ---');
    attemptsMap['STUD-001'].status = 'Published';
    attemptsMap['STUD-001'].published = true;
    attemptsMap['STUD-002'].status = 'Published';
    attemptsMap['STUD-002'].published = true;
    attemptsMap['STUD-003'].status = 'Published';
    attemptsMap['STUD-003'].published = true;

    const pubRes = await postJson('/api/pretest/attempts', {
      attempts: attemptsMap
    });
    assert(pubRes.status === 200, 'All 3 attempts bulk-published to server');

    // Also push progress for STUD-001
    await postJson('/api/progress/STUD-001', {
      progress: {
        preTestStatus: 'reviewed',
        workshopStatus: 'available',
        resultsStatus: 'published',
        finalScore: 18,
        suggestedCourse: 'Strategy'
      }
    });

    const checkProg = await getJson('/api/progress/STUD-001');
    assert(checkProg.data.progress.workshopStatus === 'available', 'STUD-001 workshop unlocked on server');

    // 7. Verify /api/sync/all batch endpoint
    console.log('\n--- TEST 7: Full Sync Endpoint (/api/sync/all) ---');
    const syncRes = await getJson('/api/sync/all');
    assert(syncRes.status === 200, '/api/sync/all returned 200 OK');
    assert(Object.keys(syncRes.data.pretestAttempts).length === 3, 'Sync returned all 3 pretest attempts');
    assert(syncRes.data.progress['STUD-001'].workshopStatus === 'available', 'Sync returned student progress');

    // 8. Admin Reset Student 1
    console.log('\n--- TEST 8: Admin Resets Student 1 ---');
    const resetRes = await postJson('/api/reset-student', { studentId: 'STUD-001' });
    assert(resetRes.status === 200 && resetRes.data.success, 'Student reset executed successfully on server');

    const postResetAttempts = await getJson('/api/pretest/attempts');
    assert(!postResetAttempts.data.attempts['STUD-001'], 'STUD-001 removed from pre-test attempts');
    assert(postResetAttempts.data.attempts['STUD-002'], 'STUD-002 preserved intact');
    assert(postResetAttempts.data.attempts['STUD-003'], 'STUD-003 preserved intact');

    console.log('\n============================================================');
    console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('============================================================\n');

  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
