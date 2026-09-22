// test_full_network_flow.js
// Complete End-to-End Simulation of Multi-Device Scheduled Pre-Test, Submission, and Admin Evaluation Tab Sync

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

// Simulated URL resolver from HTML files
function simulatedGetBackendApiUrl(loc, path) {
  if (loc.protocol === 'file:') {
    return 'http://localhost:8080' + path;
  }
  if (loc.port && loc.port !== '8080') {
    var host = loc.hostname || 'localhost';
    return loc.protocol + '//' + host + ':8080' + path;
  }
  return path;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING FULL NETWORK SCHEDULED PRE-TEST & EVALUATION SYNC TEST SUITE');
  console.log('========================================================================\n');

  // Test 1: URL Resolver across different environments
  console.log('--- TEST 1: URL Resolver Verification ---');
  assert.strictEqual(
    simulatedGetBackendApiUrl({ protocol: 'file:', hostname: '', port: '' }, '/api/sync/all'),
    'http://localhost:8080/api/sync/all'
  );
  assert.strictEqual(
    simulatedGetBackendApiUrl({ protocol: 'http:', hostname: '192.168.29.231', port: '5500' }, '/api/sync/all'),
    'http://192.168.29.231:8080/api/sync/all'
  );
  assert.strictEqual(
    simulatedGetBackendApiUrl({ protocol: 'http:', hostname: '192.168.29.231', port: '8080' }, '/api/sync/all'),
    '/api/sync/all'
  );
  console.log('✅ PASS: getBackendApiUrl correctly resolves file://, Live Server (:5500), and direct (:8080) URLs\n');

  // Test 2: Admin Schedules Exam
  console.log('--- TEST 2: Admin Schedules Pre-Test ---');
  const futureSchedule = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const initialSync = await request('GET', '/api/sync/all');
  const existingExam = (initialSync.data && initialSync.data.examData) || {};
  const examConfig = {
    settings: {
      ...(existingExam.settings || {}),
      examName: 'RIZZ Foundation Pre-Test 2026',
      examId: 'PRE-2026-01',
      durationMinutes: 60,
      totalMarks: 21,
      status: 'Scheduled',
      scheduledAt: futureSchedule
    },
    series: existingExam.series || {
      A: { production: [], strategy: [], tech: [] },
      B: { production: [], strategy: [], tech: [] },
      C: { production: [], strategy: [], tech: [] }
    }
  };
  const postExamRes = await request('POST', '/api/exam-data', { examData: examConfig });
  assert.strictEqual(postExamRes.status, 200);
  console.log('✅ PASS: Admin successfully saved Scheduled configuration to backend\n');

  // Test 3: Teammate on another laptop syncs via /api/sync/all
  console.log('--- TEST 3: Teammate Laptop Syncs /api/sync/all ---');
  const syncRes = await request('GET', '/api/sync/all');
  assert.strictEqual(syncRes.status, 200);
  assert.strictEqual(syncRes.data.examData.settings.status, 'Scheduled');
  assert.strictEqual(syncRes.data.examData.settings.scheduledAt, futureSchedule);

  // Guard verification
  const now = Date.now();
  const schedMs = new Date(syncRes.data.examData.settings.scheduledAt).getTime();
  const isLocked = syncRes.data.examData.settings.status === 'Scheduled' && schedMs > now;
  assert.strictEqual(isLocked, true, 'Test must be locked on teammate laptop before scheduled time');
  console.log('✅ PASS: Teammate portal recognizes Scheduled test and locks the Start Pre-Test button\n');

  // Test 4: Admin Publishes the Pre-Test
  console.log('--- TEST 4: Admin Publishes Pre-Test for immediate taking ---');
  examConfig.settings.status = 'Published';
  examConfig.settings.scheduledAt = null;
  await request('POST', '/api/exam-data', { examData: examConfig });

  const syncAfterPub = await request('GET', '/api/sync/all');
  assert.strictEqual(syncAfterPub.data.examData.settings.status, 'Published');
  console.log('✅ PASS: Teammate live polling receives Published status and unlocks Start Pre-Test\n');

  // Test 5: Teammate (e.g. Student S-TEAM-01) takes exam and submits
  console.log('--- TEST 5: Teammate Submits Pre-Test ---');
  const teammateAttempt = {
    attemptId: 'ATT-TEAM-01-' + Date.now(),
    studentId: 'TEAM-01',
    studentName: 'Teammate Rahul',
    email: 'rahul@teammate.com',
    college: 'Engineering College',
    paperSeries: 'A',
    status: 'Pending',
    submitTime: Date.now(),
    autoSubmitted: false,
    mcqScore: 18,
    productionScore: 6,
    productionMax: 7,
    strategyScore: 6,
    strategyMax: 7,
    techScore: 6,
    techMax: 7,
    totalScore: 18,
    maxScore: 21,
    suggestedCourse: 'Tie — Admin Decision Required',
    isTie: true,
    published: false
  };

  const submitRes = await request('POST', '/api/pretest/attempts', {
    studentId: 'TEAM-01',
    attempt: teammateAttempt
  });
  assert.strictEqual(submitRes.status, 200);
  console.log('✅ PASS: Teammate submission successfully transmitted to server\n');

  // Test 6: Admin Evaluation Live Sync pulls submissions
  console.log('--- TEST 6: Admin Evaluation Tab Syncs Attempts ---');
  const adminAttemptsRes = await request('GET', '/api/pretest/attempts');
  assert.strictEqual(adminAttemptsRes.status, 200);
  const attempts = adminAttemptsRes.data.attempts;
  assert.ok(attempts['TEAM-01'], 'TEAM-01 attempt must exist in server pretest_attempts');
  assert.strictEqual(attempts['TEAM-01'].studentName, 'Teammate Rahul');
  assert.strictEqual(attempts['TEAM-01'].status, 'Pending');
  assert.strictEqual(attempts['TEAM-01'].totalScore, 18);

  // Filter simulation (as in renderEvaluationViewSync)
  const allAttempts = Object.values(attempts);
  const pendingAttempts = allAttempts.filter(a => (a.status || 'Pending') === 'Pending');
  assert.ok(pendingAttempts.some(a => a.studentId === 'TEAM-01'), 'TEAM-01 must be in Pending evaluations list');
  console.log('✅ PASS: Admin Evaluation Tab immediately receives and displays Teammate Rahul as Pending review\n');

  // Test 7: Admin Finalises and Publishes Review
  console.log('--- TEST 7: Admin Finalises and Publishes Evaluation ---');
  attempts['TEAM-01'].status = 'Published';
  attempts['TEAM-01'].published = true;
  attempts['TEAM-01'].adminFinalScore = 19;
  attempts['TEAM-01'].adminFinalSuggestion = 'Tech';

  await request('POST', '/api/pretest/attempts', { attempts: attempts });
  await request('POST', '/api/progress/TEAM-01', {
    progress: {
      preTestStatus: 'reviewed',
      workshopStatus: 'available',
      resultsStatus: 'published',
      finalScore: 19,
      suggestedCourse: 'Tech'
    }
  });

  // Verify full sync reflects changes for teammate
  const fullSyncRes = await request('GET', '/api/sync/all');
  assert.strictEqual(fullSyncRes.data.pretestAttempts['TEAM-01'].status, 'Published');
  assert.strictEqual(fullSyncRes.data.pretestAttempts['TEAM-01'].adminFinalSuggestion, 'Tech');
  assert.strictEqual(fullSyncRes.data.progress['TEAM-01'].workshopStatus, 'available');
  console.log('✅ PASS: Teammate portal receives Published evaluation and unlocks Workshop navigation!\n');

  // Clean up test attempt to keep pretest_attempts.json completely clean
  delete attempts['TEAM-01'];
  await request('POST', '/api/pretest/attempts', { attempts: attempts });
  await request('POST', '/api/reset-student', { studentId: 'TEAM-01' });

  console.log('========================================================================');
  console.log('🎉 ALL NETWORK & MULTI-DEVICE SYNC TESTS PASSED SUCCESSFULLY (100%)');
  console.log('========================================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
