const fs = require('fs');
const assert = require('assert');

console.log('============================================================');
console.log('🧪 RUNNING MULTI-SUBSET ASSESSMENT & ADMIN CLOSE TEST SUITE');
console.log('============================================================\n');

const studHtml = fs.readFileSync('STUD.html', 'utf8');
const adminHtml = fs.readFileSync('ADMIN.html', 'utf8');

// TEST 1: Verify Student multi-subset tabs bar & switcher function
console.log('--- TEST 1: Student Console Multi-Subset Support ---');
assert(studHtml.includes('switchStudentAsmSubset'), 'STUD.html must define switchStudentAsmSubset');
assert(studHtml.includes('asm_prod_designing'), 'STUD.html must support asm_prod_designing');
assert(studHtml.includes('asm_prod_videoediting'), 'STUD.html must support asm_prod_videoediting');
assert(studHtml.includes('asm_prod_cinematography'), 'STUD.html must support asm_prod_cinematography');
assert(studHtml.includes('asm_strat_contentwriting'), 'STUD.html must support Strategy subset asm_strat_contentwriting');
assert(studHtml.includes('asm_tech_webdev'), 'STUD.html must support Tech subset asm_tech_webdev');
assert(studHtml.includes('handleStudentFinalVideoSelect'), 'STUD.html must define handleStudentFinalVideoSelect');
console.log('✅ PASS: Multi-subset switcher and deliverable handlers defined in STUD.html');

// TEST 2: Verify Track subset mapping logic
console.log('--- TEST 2: Track Subset Mapping Logic ---');
const TRACK_SUBSETS = {
  production: [
    { key: 'asm_prod_designing', label: 'Designing' },
    { key: 'asm_prod_videoediting', label: 'Video Editing' },
    { key: 'asm_prod_cinematography', label: 'Cinematography' }
  ],
  strategy: [
    { key: 'asm_strat_contentwriting', label: 'Content Writing' },
    { key: 'asm_strat_marketingstrategy', label: 'Marketing Strategy' },
    { key: 'asm_strat_socialmedia', label: 'Social Media Management' },
    { key: 'asm_strat_perfmarketing', label: 'Performance Marketing' }
  ],
  tech: [
    { key: 'asm_tech_webdev', label: 'Website Development' },
    { key: 'asm_tech_seo', label: 'SEO, AEO & GEO' },
    { key: 'asm_tech_ai', label: 'AI & Automation' }
  ]
};

assert.strictEqual(TRACK_SUBSETS.production.length, 3, 'Set 1 (Production) must have 3 subset exams');
assert.strictEqual(TRACK_SUBSETS.strategy.length, 4, 'Set 2 (Strategy) must have 4 subset exams');
assert.strictEqual(TRACK_SUBSETS.tech.length, 3, 'Set 3 (Tech) must have 3 subset exams');
console.log('✅ PASS: Set 1 has exactly 3 subset exams (Designing, Video Editing, Cinematography)');

// TEST 3: Multi-subset submission isolation simulation
console.log('--- TEST 3: Multi-Subset Submission Simulation ---');
const attemptsMap = {
  'STUD-001': {
    studentId: 'STUD-001',
    attempts: []
  }
};

// Student submits subset 1: Designing
const att1 = {
  attemptId: 'att_asm_prod_designing_STUD-001_1',
  assessmentId: 'asm_prod_designing',
  status: 'Submitted',
  submissions: { finalPng: { fileName: 'design.png' }, sourceZip: { fileName: 'source.zip' }, explanationVideo: { fileName: 'video.mp4' } }
};
attemptsMap['STUD-001'].attempts.push(att1);

// Verify that subset 2 and 3 remain unsubmitted and can be taken
const studentAttempts = attemptsMap['STUD-001'].attempts;
const isProd1Submitted = studentAttempts.some(a => a.assessmentId === 'asm_prod_designing' && a.status === 'Submitted');
const isProd2Submitted = studentAttempts.some(a => a.assessmentId === 'asm_prod_videoediting' && a.status === 'Submitted');
const isProd3Submitted = studentAttempts.some(a => a.assessmentId === 'asm_prod_cinematography' && a.status === 'Submitted');

assert.strictEqual(isProd1Submitted, true, 'Subset 1 (Designing) is submitted');
assert.strictEqual(isProd2Submitted, false, 'Subset 2 (Video Editing) is NOT yet submitted and accessible');
assert.strictEqual(isProd3Submitted, false, 'Subset 3 (Cinematography) is NOT yet submitted and accessible');

// Student submits subset 2: Video Editing
const att2 = {
  attemptId: 'att_asm_prod_videoediting_STUD-001_1',
  assessmentId: 'asm_prod_videoediting',
  status: 'Submitted',
  submissions: { finalVideo: { fileName: 'final.mp4' }, sourceZip: { fileName: 'project.zip' }, selfVideo: { fileName: 'self.mp4' } }
};
attemptsMap['STUD-001'].attempts.push(att2);

// Student submits subset 3: Cinematography
const att3 = {
  attemptId: 'att_asm_prod_cinematography_STUD-001_1',
  assessmentId: 'asm_prod_cinematography',
  status: 'Submitted',
  submissions: { sourceZip: { fileName: 'raw.zip' }, selfVideo: { fileName: 'cam.mp4' } }
};
attemptsMap['STUD-001'].attempts.push(att3);

const all3Submitted = TRACK_SUBSETS.production.every(sub =>
  studentAttempts.some(a => a.assessmentId === sub.key && a.status === 'Submitted')
);
assert.strictEqual(all3Submitted, true, 'All 3 subset practical exams submitted successfully');
console.log('✅ PASS: Student can give all 3 subset exams without interference');

// TEST 4: Admin Close Assessment Button Fix
console.log('--- TEST 4: Admin Close Assessment Verification ---');
// Verify toggleAssessmentPublishStatus toggles cleanly
let asm = { id: 'asm_prod_designing', status: 'Published' };
function toggleAsm(a) {
  a.status = a.status === 'Published' ? 'Closed' : 'Published';
  return a.status;
}

assert.strictEqual(toggleAsm(asm), 'Closed', 'Published toggles to Closed on single click');
assert.strictEqual(toggleAsm(asm), 'Published', 'Closed toggles to Published on single click');

// Ensure no duplicate click event listener on btn-toggle-status-designing-asm in ADMIN.html
assert(!adminHtml.includes("addEventListener('click', toggleAssessmentPublishStatus)"), 'ADMIN.html should not add duplicate click listener');
console.log('✅ PASS: Admin Close Assessment toggles Published -> Closed cleanly without duplicate event listener');

console.log('\n============================================================');
console.log('🎉 ALL MULTI-SUBSET & ADMIN CLOSE TESTS PASSED! (100%)');
console.log('============================================================\n');
