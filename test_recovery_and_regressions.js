const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const PORT = 8080;

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

async function verifyAll() {
  console.log('====================================================');
  console.log('🔍 RUNNING COMPREHENSIVE RECOVERY & REGRESSION TESTS');
  console.log('====================================================\n');

  // TEST 1: Server /api/sync/all returns all 10 subsets with recovered curriculum
  console.log('--- TEST 1: Master Syllabus Recovery & Server Sync ---');
  const syncRes = await request('GET', '/api/sync/all');
  assert.strictEqual(syncRes.status, 200, 'Server /api/sync/all returned 200');
  const wData = syncRes.body.workshopData;
  assert(wData && Array.isArray(wData.categories), 'workshopData has categories');
  assert.strictEqual(wData.categories.length, 3, '3 Categories present');

  const prod = wData.categories.find(c => c.id === 'production');
  const strat = wData.categories.find(c => c.id === 'strategy');
  const tech = wData.categories.find(c => c.id === 'tech');

  assert(prod && prod.subsets.length === 3, 'Production has 3 subsets (Designing, Video Editing, Cinematography)');
  assert(strat && strat.subsets.length === 4, 'Strategy has 4 subsets (Social Media, Content Writing, Perf Marketing, Marketing Strategy)');
  assert(tech && tech.subsets.length === 3, 'Tech has 3 subsets (Web Dev, AI & Automation, SEO/AEO/GEO)');

  const totalSubsets = prod.subsets.length + strat.subsets.length + tech.subsets.length;
  assert.strictEqual(totalSubsets, 10, 'Total subsets across curriculum is exactly 10');

  // Verify historical topics and instructors
  const designTop = prod.subsets.find(s => s.id === 'sub_designing').topics[0];
  assert.strictEqual(designTop.name, 'Graphic Designing & Brand Identity');
  assert.strictEqual(designTop.mentor, 'Rohan Verma');

  const videoTop = prod.subsets.find(s => s.id === 'sub_videoediting').topics[0];
  assert.strictEqual(videoTop.name, 'High-Retention Video Editing');
  assert.strictEqual(videoTop.mentor, 'Priya Nair');

  const cineTop = prod.subsets.find(s => s.id === 'sub_cinematography').topics[0];
  assert.strictEqual(cineTop.name, 'Narrative Cinematography & Lighting');
  assert.strictEqual(cineTop.mentor, 'Vikramaditya Singh');

  const smmTop = strat.subsets.find(s => s.id === 'sub_socialmedia').topics[0];
  assert.strictEqual(smmTop.name, 'Social Media Strategy & SMM Systems');
  assert.strictEqual(smmTop.mentor, 'Meera Kapoor');

  const webTop = tech.subsets.find(s => s.id === 'sub_webdev').topics[0];
  assert.strictEqual(webTop.name, 'Web Dev for Creative Portfolios');
  assert.strictEqual(webTop.mentor, 'Devika Rao');

  console.log('✅ TEST 1 PASSED: Master syllabus recovered with all 10 subsets and historical instructors/topics.\n');

  // TEST 2: Static assertions on ADMIN.html
  console.log('--- TEST 2: Admin Console Publish Now & Navigation Protections ---');
  const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');

  // Check event passing and preventDefault
  assert(adminHtml.includes('executePublishAssessmentNow(event)'), 'executePublishAssessmentNow passes event');
  assert(adminHtml.includes('openPublishNowModal(event)'), 'openPublishNowModal passes event');
  assert(adminHtml.includes("sessionStorage.setItem('rizz_admin_active_page', pageId)"), 'Admin active page saved in sessionStorage');
  assert(adminHtml.includes("sessionStorage.getItem('rizz_admin_active_page')"), 'Admin active page restored on DOMContentLoaded');
  assert(adminHtml.includes("activatePage('page-assessment')"), 'executePublishAssessmentNow explicitly stays on page-assessment');

  // Check fonts, colors & typography
  assert(adminHtml.includes('Playfair Display'), 'Preserved font Playfair Display');
  assert(adminHtml.includes('Darker Grotesque'), 'Preserved font Darker Grotesque');
  assert(adminHtml.includes('DM Sans'), 'Preserved font DM Sans');
  assert(adminHtml.includes('#D31F83'), 'Preserved brand color #D31F83');
  assert(adminHtml.includes('#EDA233'), 'Preserved brand color #EDA233');

  console.log('✅ TEST 2 PASSED: Admin Console publish actions guarded against Home redirect.\n');

  // TEST 3: Static assertions on STUD.html
  console.log('--- TEST 3: Student Console Start Pre-Test & Glitch Protections ---');
  const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');

  assert(studHtml.includes('activeExamState.isStarted = true;'), 'STUD.html sets activeExamState.isStarted = true upon exam start');
  assert(studHtml.includes('activeExamState.isStarted = false;'), 'STUD.html sets activeExamState.isStarted = false upon submit');
  assert(studHtml.includes("if (!activeExamState || !activeExamState.isStarted)"), 'refreshCurrentActiveTab checks activeExamState.isStarted');
  assert(studHtml.includes('localAtt.status === \'in_progress\''), 'syncStudentDataWithServer preserves in-progress local attempt');
  assert(studHtml.includes('localStorage.setItem(LS_WORKSHOPS, JSON.stringify(data.workshopData));'), 'STUD.html uses LS_WORKSHOPS for workshop data sync');

  // Check fonts, colors & typography
  assert(studHtml.includes('Playfair Display'), 'Student Console preserved font Playfair Display');
  assert(studHtml.includes('Darker Grotesque'), 'Student Console preserved font Darker Grotesque');
  assert(studHtml.includes('DM Sans'), 'Student Console preserved font DM Sans');
  assert(studHtml.includes('#D31F83'), 'Student Console preserved brand color #D31F83');
  assert(studHtml.includes('#EDA233'), 'Student Console preserved brand color #EDA233');

  console.log('✅ TEST 3 PASSED: Student Console start pre-test glitch fix confirmed.\n');

  // TEST 4: Student Reset Isolation (Section 24/25 verification)
  console.log('--- TEST 4: Student Reset Master Data Isolation ---');
  // Trigger reset for a dummy student ID
  const testStudentId = 'TEST-ISOLATION-999';
  const resetRes = await request('POST', '/api/reset-student', { studentId: testStudentId });
  assert.strictEqual(resetRes.status, 200, '/api/reset-student returned 200');

  // Verify that uploads/workshop_data.json and assessment_data.json were untouched
  const wDataAfter = JSON.parse(fs.readFileSync(path.join(__dirname, 'uploads', 'workshop_data.json'), 'utf8'));
  assert.strictEqual(wDataAfter.categories.length, 3, 'workshop_data.json categories intact');
  const totalSubsetsAfter = wDataAfter.categories.reduce((acc, c) => acc + (c.subsets ? c.subsets.length : 0), 0);
  assert.strictEqual(totalSubsetsAfter, 10, 'All 10 subsets intact after student reset');

  const asmDataAfter = JSON.parse(fs.readFileSync(path.join(__dirname, 'uploads', 'assessment_data.json'), 'utf8'));
  assert.strictEqual(Object.keys(asmDataAfter).length, 10, 'All 10 assessments intact after student reset');

  console.log('✅ TEST 4 PASSED: Student Reset strictly isolated; master syllabus and assessment configs untouched.\n');

  console.log('====================================================');
  console.log('🎉 ALL RECOVERY & REGRESSION VERIFICATIONS PASSED!');
  console.log('====================================================');
}

verifyAll().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
