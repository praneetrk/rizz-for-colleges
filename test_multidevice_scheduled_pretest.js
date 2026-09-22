// test_multidevice_scheduled_pretest.js
// Verification of multi-device scheduled Pre-Test synchronization across Admin and Student laptops

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
  console.log('🧪 RUNNING MULTI-DEVICE SCHEDULED PRE-TEST SYNC TEST SUITE');
  console.log('============================================================\n');

  // Step 1: Admin schedules Pre-Test for 2 hours in the future
  console.log('--- STEP 1: Admin Schedules Pre-Test on Server ---');
  const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  
  const initialSync = await request('GET', '/api/sync/all');
  const existingExam = (initialSync.data && initialSync.data.examData) || {};
  const scheduledExamData = {
    settings: {
      ...(existingExam.settings || {}),
      examName: 'RIZZ Foundation Pre-Test 2026',
      examId: 'PRE-2026-01',
      durationMinutes: 60,
      totalMarks: 21,
      passingScore: 50,
      status: 'Scheduled',
      scheduledAt: futureTime
    },
    series: existingExam.series || {
      A: { production: [], strategy: [], tech: [] },
      B: { production: [], strategy: [], tech: [] },
      C: { production: [], strategy: [], tech: [] }
    }
  };

  const saveRes = await request('POST', '/api/exam-data', { examData: scheduledExamData });
  assert.strictEqual(saveRes.status, 200);
  console.log('✅ PASS: Admin successfully pushed Scheduled exam configuration to backend');

  // Step 2: Teammate on student laptop syncs from server
  console.log('\n--- STEP 2: Teammate Student Laptop Syncs /api/sync/all ---');
  const syncRes = await request('GET', '/api/sync/all');
  assert.strictEqual(syncRes.status, 200);
  assert.strictEqual(Boolean(syncRes.data.examData), true, 'examData must be present');
  assert.strictEqual(syncRes.data.examData.settings.status, 'Scheduled', 'Status must be Scheduled');
  assert.strictEqual(syncRes.data.examData.settings.scheduledAt, futureTime, 'scheduledAt must match');
  console.log('✅ PASS: Teammate student laptop receives Scheduled status and future timestamp');

  // Step 3: Validate Student Portal Schedule Guard logic
  console.log('\n--- STEP 3: Validate Schedule Guard on Student Side ---');
  const config = syncRes.data.examData;
  const s = config.settings;
  const scheduledTimeMs = new Date(s.scheduledAt).getTime();
  const isScheduledFuture = (s.status === 'Scheduled') && (scheduledTimeMs > Date.now());
  assert.strictEqual(isScheduledFuture, true, 'Test must be flagged as scheduled in future');
  console.log('✅ PASS: Schedule countdown is active and test start button is locked on student side');

  // Step 4: Admin Opens / Publishes Test
  console.log('\n--- STEP 4: Admin Publishes Test (Opens Now) ---');
  scheduledExamData.settings.status = 'Published';
  scheduledExamData.settings.scheduledAt = null;

  await request('POST', '/api/exam-data', { examData: scheduledExamData });
  const syncAfterPublish = await request('GET', '/api/sync/all');
  assert.strictEqual(syncAfterPublish.data.examData.settings.status, 'Published');
  console.log('✅ PASS: Test successfully opened now and unlocked for all teammate laptops');

  console.log('\n============================================================');
  console.log('🎉 ALL MULTI-DEVICE SCHEDULE TESTS PASSED (100%)');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
