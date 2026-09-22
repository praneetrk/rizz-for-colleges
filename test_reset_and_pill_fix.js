const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const PORT = 8080;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function request(method, pathUrl, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: pathUrl,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Verification Tests for Student Reset & Pill Styling Fix...');

  // 1. Static CSS and HTML assertions
  const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
  const mentorHtml = fs.readFileSync(path.join(__dirname, 'MENTOR.html'), 'utf8');
  const firebaseConfigJs = fs.readFileSync(path.join(__dirname, 'firebase-config.js'), 'utf8');

  // Check fonts
  assert(adminHtml.includes("Playfair Display"), "Admin retains Playfair Display font");
  assert(adminHtml.includes("Darker Grotesque"), "Admin retains Darker Grotesque font");
  assert(adminHtml.includes("DM Sans"), "Admin retains DM Sans font");

  // Check colors
  assert(adminHtml.includes("#D31F83"), "Admin retains brand color #D31F83");
  assert(adminHtml.includes("#EDA233"), "Admin retains brand color #EDA233");

  // Check pill CSS
  assert(adminHtml.includes("display: inline-flex;"), "Admin .category-pill has display: inline-flex");
  assert(adminHtml.includes("white-space: nowrap;"), "Admin .category-pill has white-space: nowrap");
  console.log('✅ PASS: Pill styling and typography/colors preserved in ADMIN.html');

  // Check Firebase resetStudent
  assert(firebaseConfigJs.includes("matchesStudentRec"), "firebase-config.js includes robust student record matcher");
  assert(firebaseConfigJs.includes("workshopCompletions"), "firebase-config.js cleans workshopCompletions on reset");
  console.log('✅ PASS: firebase-config.js includes robust resetStudent logic');

  // 2. Integration test: start a test server instance or connect to existing
  const { fork } = require('child_process');
  let serverProcess = null;

  try {
    let health = await request('GET', '/api/health').catch(() => null);
    if (!health || health.status !== 200) {
      console.log('Starting local server for integration tests...');
      serverProcess = fork(path.join(__dirname, 'server.js'), [], {
        env: Object.assign({}, process.env, { PORT: 8080 })
      });
      // Wait for server to boot
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 200));
        health = await request('GET', '/api/health').catch(() => null);
        if (health && health.status === 200) break;
      }
    }

    console.log('✅ Server online on port 8080');

    // Setup Student A (JAIN-001) and Student B (CBALC-002) in server JSON files
    const pretestPath = path.join(UPLOADS_DIR, 'pretest_attempts.json');
    const asmPath = path.join(UPLOADS_DIR, 'assessment_attempts.json');
    const progressPath = path.join(UPLOADS_DIR, 'progress_data.json');
    const choicesPath = path.join(UPLOADS_DIR, 'workshop_choices.json');

    const pretestData = {
      'JAIN-001': { studentId: 'JAIN-001', studentName: 'Praneet', status: 'Published', totalScore: 19 },
      'CBALC-002': { studentId: 'CBALC-002', studentName: 'Avni', status: 'Published', totalScore: 20 }
    };
    fs.writeFileSync(pretestPath, JSON.stringify(pretestData, null, 2));

    const asmData = {
      'JAIN-001': {
        attempts: [
          {
            attemptId: 'att_jain_1',
            studentId: 'JAIN-001',
            assessmentId: 'asm_prod_designing',
            status: 'Published',
            evaluation: { mentorScore: 84, adminFinalScore: 88, adminStatus: 'Published' }
          },
          {
            attemptId: 'att_jain_2',
            studentId: 'JAIN-001',
            assessmentId: 'asm_prod_videoediting',
            status: 'Published',
            evaluation: { mentorScore: 89, adminFinalScore: 90, adminStatus: 'Published' }
          },
          {
            attemptId: 'att_jain_3',
            studentId: 'JAIN-001',
            assessmentId: 'asm_prod_cinematography',
            status: 'Published',
            evaluation: { mentorScore: 75, adminFinalScore: 80, adminStatus: 'Published' }
          }
        ]
      },
      'CBALC-002': {
        attempts: [
          {
            attemptId: 'att_avni_1',
            studentId: 'CBALC-002',
            assessmentId: 'asm_prod_designing',
            status: 'Submitted',
            evaluation: { mentorScore: null }
          }
        ]
      }
    };
    fs.writeFileSync(asmPath, JSON.stringify(asmData, null, 2));

    const progData = {
      'JAIN-001': {
        preTestStatus: 'reviewed',
        workshopStatus: 'completed',
        assessmentStatus: 'submitted',
        assessmentCompleted: true,
        rizzScore: 86,
        resultsStatus: 'published',
        overallProgress: 100
      },
      'CBALC-002': {
        preTestStatus: 'reviewed',
        workshopStatus: 'completed',
        assessmentStatus: 'in_progress',
        overallProgress: 75
      }
    };
    fs.writeFileSync(progressPath, JSON.stringify(progData, null, 2));

    const choicesData = {
      'JAIN-001': { track: 'Production', selectedAt: new Date().toISOString() },
      'CBALC-002': { track: 'Production', selectedAt: new Date().toISOString() }
    };
    fs.writeFileSync(choicesPath, JSON.stringify(choicesData, null, 2));

    // Reset Student A (JAIN-001)
    const resetRes = await request('POST', '/api/reset-student', {
      studentId: 'JAIN-001',
      studentName: 'Praneet',
      email: 'praneet@example.com'
    });
    assert.strictEqual(resetRes.status, 200, 'Reset returned 200 OK');

    // Verify Student A purged from pretest_attempts.json
    const postPretest = JSON.parse(fs.readFileSync(pretestPath, 'utf8'));
    assert.strictEqual(postPretest['JAIN-001'], undefined, 'Student A removed from pretest_attempts.json');
    assert.notStrictEqual(postPretest['CBALC-002'], undefined, 'Student B untouched in pretest_attempts.json');

    // Verify Student A purged from assessment_attempts.json
    const postAsm = JSON.parse(fs.readFileSync(asmPath, 'utf8'));
    assert.strictEqual(postAsm['JAIN-001'], undefined, 'Student A removed from assessment_attempts.json');
    assert.notStrictEqual(postAsm['CBALC-002'], undefined, 'Student B untouched in assessment_attempts.json');

    // Verify Student A progress reset
    const postProg = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    assert.strictEqual(postProg['JAIN-001'].preTestStatus, 'ready', 'Student A progress reset to ready');
    assert.strictEqual(postProg['JAIN-001'].assessmentCompleted, false, 'Student A assessmentCompleted reset to false');
    assert.strictEqual(postProg['JAIN-001'].rizzScore, null, 'Student A rizzScore reset to null');
    assert.strictEqual(postProg['CBALC-002'].overallProgress, 75, 'Student B progress untouched');

    // Verify Student A choice removed
    const postChoices = JSON.parse(fs.readFileSync(choicesPath, 'utf8'));
    assert.strictEqual(postChoices['JAIN-001'], undefined, 'Student A removed from workshop_choices.json');
    assert.notStrictEqual(postChoices['CBALC-002'], undefined, 'Student B untouched in workshop_choices.json');

    console.log('✅ PASS: /api/reset-student successfully clears student evaluation records while preserving other students');
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests();
