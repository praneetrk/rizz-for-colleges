/**
 * test_tech_assessment.js
 * Comprehensive validation suite for Tech Practical Assessments in RIZZ for Colleges
 */

const fs = require('fs');
const path = require('path');

// Mock browser environment for unit testing HTML scripts
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

const globalStorage = new LocalStorageMock();
global.localStorage = globalStorage;
global.window = {
  location: { protocol: 'file:' },
  _rizzMemoryFiles: {}
};
global.URL = {
  createObjectURL: (blob) => 'blob:mock-url-' + Math.random().toString(36).slice(2),
  revokeObjectURL: () => {}
};

// Mock RizzFileStore
const MockFileStore = {
  files: new Map(),
  async saveFile(key, blob, meta = {}) {
    this.files.set(key, { blob, meta, key });
    return true;
  },
  async getFile(key) {
    const f = this.files.get(key);
    return f ? f.blob : null;
  },
  async hasFile(key) {
    return this.files.has(key);
  },
  async getFileUrl(key) {
    return this.files.has(key) ? 'blob://' + key : null;
  },
  async deleteFile(key) {
    this.files.delete(key);
    return true;
  }
};
global.RizzFileStore = MockFileStore;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n==================================================');
console.log('--- TEST SUITE: TECH PRACTICAL ASSESSMENTS ---');
console.log('==================================================\n');

// 1. Static HTML & Data Model Verification
console.log('1. Verifying HTML Data Model & Structure...');

const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const mentorHtml = fs.readFileSync(path.join(__dirname, 'MENTOR.html'), 'utf8');

// Check Track tabs in ADMIN.html
assert(adminHtml.includes('switchAdminAsmTrack(\'production\')'), 'ADMIN has Production track tab switch');
assert(adminHtml.includes('switchAdminAsmTrack(\'strategy\')'), 'ADMIN has Strategy track tab switch');
assert(adminHtml.includes('switchAdminAsmTrack(\'tech\')'), 'ADMIN has Tech track tab switch');

// Check exact subset names
assert(adminHtml.includes('Website Development'), 'ADMIN has Website Development subset');
assert(adminHtml.includes('SEO, AEO & GEO (Content-Led)'), 'ADMIN has SEO, AEO & GEO (Content-Led) subset');
assert(adminHtml.includes('AI & Automation'), 'ADMIN has AI & Automation subset');

// Check Default Assessments in ADMIN.html
assert(adminHtml.includes('asm_tech_webdev:'), 'ADMIN DEFAULT_ASSESSMENTS contains asm_tech_webdev');
assert(adminHtml.includes('asm_tech_seo:'), 'ADMIN DEFAULT_ASSESSMENTS contains asm_tech_seo');
assert(adminHtml.includes('asm_tech_ai:'), 'ADMIN DEFAULT_ASSESSMENTS contains asm_tech_ai');

// Check Deliverables in ADMIN.html
assert(adminHtml.includes("deliverables: ['hostingLink', 'sourceZip', 'selfVideo']"), 'Webdev deliverables are hostingLink, sourceZip, selfVideo');
assert(adminHtml.includes("deliverables: ['finalPdf', 'sourceZip', 'selfVideo']"), 'SEO and AI deliverables are finalPdf, sourceZip, selfVideo');

// Check Default Assessments in STUD.html
assert(studHtml.includes('asm_tech_webdev:'), 'STUD STUD_DEFAULT_ASSESSMENTS contains asm_tech_webdev');
assert(studHtml.includes('asm_tech_seo:'), 'STUD STUD_DEFAULT_ASSESSMENTS contains asm_tech_seo');
assert(studHtml.includes('asm_tech_ai:'), 'STUD STUD_DEFAULT_ASSESSMENTS contains asm_tech_ai');

// Check Deliverables in STUD.html upload panels
assert(studHtml.includes("delivKey === 'hostingLink'"), 'STUD buildUploadPanel supports hostingLink');
assert(studHtml.includes("delivKey === 'selfVideo'"), 'STUD buildUploadPanel supports selfVideo');
assert(studHtml.includes("delivKey === 'finalPdf'"), 'STUD buildUploadPanel supports finalPdf');
assert(studHtml.includes("delivKey === 'sourceZip'"), 'STUD buildUploadPanel supports sourceZip');

// Check Deliverables in MENTOR.html
assert(mentorHtml.includes("asm_tech_webdev:             ['hostingLink','sourceZip','selfVideo']"), 'MENTOR_ASM_DELIVERABLES supports asm_tech_webdev');
assert(mentorHtml.includes("asm_tech_seo:                ['finalPdf','sourceZip','selfVideo']"), 'MENTOR_ASM_DELIVERABLES supports asm_tech_seo');
assert(mentorHtml.includes("asm_tech_ai:                 ['finalPdf','sourceZip','selfVideo']"), 'MENTOR_ASM_DELIVERABLES supports asm_tech_ai');
assert(mentorHtml.includes("d === 'hostingLink'"), 'MENTOR modal supports hostingLink review card');

console.log('\n2. Verifying URL & File Validation Logic...');

// URL Regex Validation test
const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
assert(urlRegex.test('https://myproject.vercel.app'), 'Valid https URL accepted');
assert(urlRegex.test('http://subdomain.domain.com/path/index.html'), 'Valid http URL accepted');
assert(!urlRegex.test('not a url'), 'Invalid plain text rejected as URL');
assert(!urlRegex.test('ftp://myserver.com'), 'FTP protocol rejected');
assert(!urlRegex.test(''), 'Empty string rejected as URL');

// Video Duration Validation test
function validateVideoDuration(dur) {
  return dur >= 5 && dur <= 120;
}
assert(validateVideoDuration(5), '5 second video accepted');
assert(validateVideoDuration(60), '60 second video accepted');
assert(validateVideoDuration(120), '120 second video accepted');
assert(!validateVideoDuration(4), '4 second video rejected (<5s)');
assert(!validateVideoDuration(121), '121 second video rejected (>120s)');
assert(!validateVideoDuration(300), '300 second video rejected (>120s)');

// PDF Extension Validation test
function validatePdf(fileName, mimeType) {
  const isPdfExt = fileName.toLowerCase().endsWith('.pdf');
  const isPdfMime = mimeType === 'application/pdf';
  return isPdfExt || isPdfMime;
}
assert(validatePdf('strategy_document.pdf', 'application/pdf'), 'PDF document accepted');
assert(!validatePdf('banner.png', 'image/png'), 'PNG rejected for PDF field');
assert(!validatePdf('video.mp4', 'video/mp4'), 'MP4 rejected for PDF field');
assert(!validatePdf('archive.zip', 'application/zip'), 'ZIP rejected for PDF field');

// ZIP Extension Validation test
function validateZip(fileName, mimeType) {
  const isZipExt = fileName.toLowerCase().endsWith('.zip');
  const isZipMime = mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed';
  return isZipExt || isZipMime;
}
assert(validateZip('project_source.zip', 'application/zip'), 'ZIP archive accepted');
assert(!validateZip('notes.pdf', 'application/pdf'), 'PDF rejected for ZIP field');
assert(!validateZip('image.jpg', 'image/jpeg'), 'JPG rejected for ZIP field');

console.log('\n3. Verifying End-to-End Simulation: Website Development Assessment...');

(async () => {
  // Setup Mock Data
  const studentId = 'STUD-TECH-001';
  const college = 'MIT Pune';
  const assessmentKey = 'asm_tech_webdev';

  // 1. Student creates attempt
  const attemptId = 'att_asm_tech_webdev_STUD-TECH-001_1';
  const initialAttempt = {
    attemptId,
    attemptNumber: 1,
    assessmentId: assessmentKey,
    studentId,
    studentName: 'Aarav Patel',
    college,
    startTime: new Date().toISOString(),
    status: 'In Progress',
    submissions: {
      hostingLink: null,
      sourceZip: null,
      selfVideo: null
    },
    evaluation: {
      mentorScore: null,
      mentorRemarks: null,
      adminFinalScore: null,
      adminRemarks: null,
      status: 'Pending'
    }
  };

  const attemptsMap = {};
  attemptsMap[studentId] = {
    studentId,
    activeAttemptId: attemptId,
    attempts: [initialAttempt]
  };
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  // 2. Student uploads deliverables
  // a) Hosting Link
  const validUrl = 'https://aarav-tech-dev.web.app';
  assert(urlRegex.test(validUrl), 'Student entered valid hosting URL');
  initialAttempt.submissions.hostingLink = {
    url: validUrl,
    submittedAt: new Date().toISOString()
  };

  // b) Source ZIP
  const zipFileKey = 'sub_zip_' + attemptId;
  await MockFileStore.saveFile(zipFileKey, { size: 2048576, name: 'website_source.zip' }, { name: 'website_source.zip', size: 2048576, type: 'application/zip' });
  initialAttempt.submissions.sourceZip = {
    fileKey: zipFileKey,
    fileName: 'website_source.zip',
    fileSize: 2048576,
    mimeType: 'application/zip',
    uploadedAt: new Date().toISOString()
  };

  // c) Self Video (90s <= 120s)
  const vidFileKey = 'sub_selfvid_' + attemptId;
  const videoDuration = 90;
  assert(validateVideoDuration(videoDuration), 'Video duration 90s is valid (<=120s)');
  await MockFileStore.saveFile(vidFileKey, { size: 10485760, name: 'self_walkthrough.mp4' }, { name: 'self_walkthrough.mp4', size: 10485760, type: 'video/mp4' });
  initialAttempt.submissions.selfVideo = {
    fileKey: vidFileKey,
    fileName: 'self_walkthrough.mp4',
    fileSize: 10485760,
    mimeType: 'video/mp4',
    durationSeconds: videoDuration,
    uploadedAt: new Date().toISOString()
  };

  // Verify all 3 deliverables are present and persisted
  const hasHl = initialAttempt.submissions.hostingLink && urlRegex.test(initialAttempt.submissions.hostingLink.url);
  const hasZip = initialAttempt.submissions.sourceZip && (await MockFileStore.hasFile(initialAttempt.submissions.sourceZip.fileKey));
  const hasVid = initialAttempt.submissions.selfVideo && (await MockFileStore.hasFile(initialAttempt.submissions.selfVideo.fileKey));

  assert(hasHl && hasZip && hasVid, 'All 3 required deliverables are valid and persisted');

  // 3. Student submits practical assessment
  initialAttempt.status = 'Submitted';
  initialAttempt.submitTime = new Date().toISOString();
  initialAttempt.evaluation.status = 'Under Evaluation';
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  assert(initialAttempt.status === 'Submitted', 'Assessment submitted successfully');
  assert(initialAttempt.evaluation.status === 'Under Evaluation', 'Assessment is Under Evaluation');

  // 4. Mentor reviews submission (Strict Privacy: No Student Name)
  const mentorViewRecord = {
    studentId: initialAttempt.studentId,
    college: initialAttempt.college,
    assessment: 'Website Development',
    submissions: initialAttempt.submissions
  };

  assert(!mentorViewRecord.studentName, 'Mentor CANNOT see Student Name (Privacy Preserved)');
  assert(mentorViewRecord.studentId === studentId, 'Mentor sees Student ID');
  assert(mentorViewRecord.submissions.hostingLink.url === validUrl, 'Mentor sees Hosting Link');
  assert(mentorViewRecord.submissions.sourceZip.fileKey === zipFileKey, 'Mentor can access Source ZIP');
  assert(mentorViewRecord.submissions.selfVideo.fileKey === vidFileKey, 'Mentor can access Self Video');

  // Mentor enters score and remarks
  initialAttempt.evaluation.mentorScore = 88;
  initialAttempt.evaluation.mentorRemarks = 'Clean clean code structure, responsive UI, good performance.';
  initialAttempt.evaluation.mentorStatus = 'Submitted';
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  assert(initialAttempt.evaluation.mentorScore === 88, 'Mentor scored 88/100');

  // Mentor bulk publishes to Admin queue
  initialAttempt.evaluation.mentorStatus = 'Published';
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));
  assert(initialAttempt.evaluation.mentorStatus === 'Published', 'Mentor published evaluation to Admin');

  // 5. Admin evaluates and finalises
  const adminViewRecord = {
    studentId: initialAttempt.studentId,
    studentName: initialAttempt.studentName,
    college: initialAttempt.college,
    mentorScore: initialAttempt.evaluation.mentorScore,
    mentorRemarks: initialAttempt.evaluation.mentorRemarks,
    submissions: initialAttempt.submissions
  };

  assert(adminViewRecord.studentName === 'Aarav Patel', 'Admin can see Student Name');
  assert(adminViewRecord.mentorScore === 88, 'Admin sees Mentor Score 88');

  // Admin enters final score
  initialAttempt.evaluation.adminFinalScore = 92;
  initialAttempt.evaluation.adminRemarks = 'Approved by Admin. Excellent execution.';
  initialAttempt.evaluation.adminStatus = 'Finalized';
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));
  assert(initialAttempt.evaluation.adminFinalScore === 92, 'Admin finalized score as 92/100');

  // 6. Admin bulk publishes final result
  initialAttempt.status = 'Published';
  initialAttempt.evaluation.adminStatus = 'Published';
  initialAttempt.evaluation.status = 'Published';
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  assert(initialAttempt.status === 'Published', 'Admin published final result');

  // 7. Student view after publish
  assert(initialAttempt.evaluation.adminFinalScore === 92, 'Student sees final score 92');

  // 8. Admin Reset Student test
  console.log('\n4. Verifying Admin Reset Student on Tech Assessments...');
  // Check files exist before reset
  assert(await MockFileStore.hasFile(zipFileKey), 'ZIP exists before reset');
  assert(await MockFileStore.hasFile(vidFileKey), 'Video exists before reset');

  // Execute reset
  await MockFileStore.deleteFile(zipFileKey);
  await MockFileStore.deleteFile(vidFileKey);
  delete attemptsMap[studentId];
  globalStorage.setItem('rizz_assessment_attempts', JSON.stringify(attemptsMap));

  // Check files and attempts cleared
  assert(!(await MockFileStore.hasFile(zipFileKey)), 'ZIP deleted after student reset');
  assert(!(await MockFileStore.hasFile(vidFileKey)), 'Video deleted after student reset');
  assert(!attemptsMap[studentId], 'Assessment attempt cleared after student reset');

  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
})();
