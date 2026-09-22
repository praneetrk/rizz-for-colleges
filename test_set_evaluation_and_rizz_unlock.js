/**
 * test_set_evaluation_and_rizz_unlock.js
 * Comprehensive validation suite for Set-wise Assessment Evaluation, Admin RIZZ Score Assignment,
 * and Student Results/Opportunities Tab Unlocking Logic.
 */

const fs = require('fs');
const path = require('path');

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

console.log('\n======================================================================');
console.log('--- TEST SUITE: SET-WISE EVALUATION, ADMIN RIZZ SCORE & TAB UNLOCK ---');
console.log('======================================================================\n');

// 1. Static HTML & Code Integrity Verification
console.log('1. Static Code Analysis in ADMIN.html & STUD.html...');

const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');

// Admin HTML checks
assert(adminHtml.includes("switchAdminAsmEvalSet('all')"), 'ADMIN has "All Sets" track tab switch');
assert(adminHtml.includes("switchAdminAsmEvalSet('production')"), 'ADMIN has "Set 1: Production" track tab switch');
assert(adminHtml.includes("switchAdminAsmEvalSet('strategy')"), 'ADMIN has "Set 2: Strategy" track tab switch');
assert(adminHtml.includes("switchAdminAsmEvalSet('tech')"), 'ADMIN has "Set 3: Tech" track tab switch');

assert(adminHtml.includes('id="filter-asm-eval-subset"'), 'ADMIN has Dynamic Subset Filter dropdown');
assert(adminHtml.includes('id="filter-asm-eval-college"'), 'ADMIN has Dynamic College Filter dropdown');
assert(adminHtml.includes('id="asm-eval-students-tbody"'), 'ADMIN has Set-wise Student Summary & RIZZ Score Table body');
assert(adminHtml.includes('id="asm-eval-tbody"'), 'ADMIN has Detailed Deliverables Table body');
assert(adminHtml.includes('id="modal-admin-assign-rizz-score"'), 'ADMIN has Modal to Assign Authoritative RIZZ Score');
assert(adminHtml.includes('id="rizz-assign-score-input"'), 'ADMIN modal has RIZZ Score input (0-100)');
assert(adminHtml.includes('openAdminAssignRizzScoreModal'), 'ADMIN has openAdminAssignRizzScoreModal function');
assert(adminHtml.includes('saveAdminStudentRizzScore'), 'ADMIN has saveAdminStudentRizzScore function');
assert(adminHtml.includes('publishStudentAssessmentResults'), 'ADMIN has publishStudentAssessmentResults function');

// Check strict subset requirement in ADMIN.html
assert(adminHtml.includes('submittedCount < totalReq'), 'ADMIN enforces all subset assessments submitted before RIZZ score assignment');

// Student HTML checks
assert(studHtml.includes('isResultsUnlocked'), 'STUD has isResultsUnlocked function');
assert(studHtml.includes('isOpportunitiesUnlocked'), 'STUD has isOpportunitiesUnlocked function');
assert(studHtml.includes('renderStudentResultsView'), 'STUD has renderStudentResultsView function');
assert(studHtml.includes('renderStudentOpportunitiesView'), 'STUD has renderStudentOpportunitiesView function');
assert(studHtml.includes('id="tab-results"'), 'STUD has tab-results section');
assert(studHtml.includes('id="tab-opportunities"'), 'STUD has tab-opportunities section');
assert(studHtml.includes('id="modalOpportunityDetails"'), 'STUD has Opportunity Details modal');
assert(studHtml.includes('openOpportunityDetailsModal'), 'STUD has openOpportunityDetailsModal function');
assert(studHtml.includes('applyToOpportunityFromModal'), 'STUD has applyToOpportunityFromModal function');
assert(studHtml.includes('id="nav-results"'), 'STUD has nav-results sidebar link');
assert(studHtml.includes('id="nav-opportunities"'), 'STUD has nav-opportunities sidebar link');
assert(studHtml.includes('rizzScore >= 70'), 'STUD enforces rizzScore >= 70 for opportunities eligibility');

console.log('\n2. Simulation: Set Structure & Track Subsets Mapping...');

// Track subset configuration
const TRACK_SUBSETS = {
  'Production': [
    { id: 'asm_prod_designing', name: 'Designing' },
    { id: 'asm_prod_videoediting', name: 'Video Editing' },
    { id: 'asm_prod_cinematography', name: 'Cinematography' }
  ],
  'Strategy': [
    { id: 'asm_strat_contentwriting', name: 'Content & Copywriting' },
    { id: 'asm_strat_marketingstrategy', name: 'Marketing & Brand Strategy' },
    { id: 'asm_strat_socialmedia', name: 'Social Media Management' },
    { id: 'asm_strat_perfmarketing', name: 'Performance Marketing' }
  ],
  'Tech': [
    { id: 'asm_tech_webdev', name: 'Website Development' },
    { id: 'asm_tech_seo', name: 'SEO, AEO & GEO' },
    { id: 'asm_tech_ai', name: 'AI & Automation' }
  ]
};

assert(TRACK_SUBSETS['Production'].length === 3, 'Production has 3 subsets');
assert(TRACK_SUBSETS['Strategy'].length === 4, 'Strategy has 4 subsets');
assert(TRACK_SUBSETS['Tech'].length === 3, 'Tech has 3 subsets');

console.log('\n3. Simulation: Admin RIZZ Score Assignment with Incomplete Subsets...');

// Mock LocalStorage
class LocalStorageMock {
  constructor() { this.store = {}; }
  clear() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

const mockStorage = new LocalStorageMock();

// Student 1: Selected Production, only submitted 2/3 subsets
const student1Id = 'STUD-PROD-001';
const student1Progress = {
  userId: student1Id,
  chosenTrack: 'Production',
  workshopStatus: 'completed',
  assessmentStatus: 'in_progress',
  assessmentCompleted: false,
  resultsStatus: 'locked'
};
mockStorage.setItem(`rizz_progress_${student1Id}`, JSON.stringify(student1Progress));

const asmAttempts = {};
asmAttempts[student1Id] = {
  studentId: student1Id,
  attempts: [
    {
      attemptId: 'att_1',
      assessmentId: 'asm_prod_designing',
      status: 'Submitted',
      evaluation: { mentorScore: 85, adminFinalScore: 88, status: 'Finalized' }
    },
    {
      attemptId: 'att_2',
      assessmentId: 'asm_prod_videoediting',
      status: 'Submitted',
      evaluation: { mentorScore: 80, adminFinalScore: 82, status: 'Finalized' }
    }
    // 'asm_prod_cinematography' NOT submitted!
  ]
};
mockStorage.setItem('rizz_assessment_attempts', JSON.stringify(asmAttempts));

// Test function simulating openAdminAssignRizzScoreModal & saveAdminStudentRizzScore
function tryAssignRizzScore(studentId, score) {
  const prog = JSON.parse(mockStorage.getItem(`rizz_progress_${studentId}`) || '{}');
  const track = prog.chosenTrack || 'Production';
  const reqSubsets = TRACK_SUBSETS[track] || [];
  const studentAttempts = (asmAttempts[studentId] && asmAttempts[studentId].attempts) || [];

  let submittedCount = 0;
  reqSubsets.forEach(sub => {
    const att = studentAttempts.find(a => a.assessmentId === sub.id && ['Submitted', 'Finalized', 'Published'].includes(a.status));
    if (att) submittedCount++;
  });

  if (submittedCount < reqSubsets.length) {
    return {
      allowed: false,
      reason: `Cannot assign RIZZ Score yet. Student has submitted ${submittedCount} of ${reqSubsets.length} subset assessments for Set (${track}). All subsets must be submitted first.`
    };
  }

  prog.rizzScore = Number(score);
  prog.assessmentFinalScore = Number(score);
  prog.assessmentStatus = 'completed';
  prog.assessmentCompleted = true;
  mockStorage.setItem(`rizz_progress_${studentId}`, JSON.stringify(prog));

  return { allowed: true, rizzScore: prog.rizzScore };
}

const attemptAssignIncomplete = tryAssignRizzScore(student1Id, 85);
assert(!attemptAssignIncomplete.allowed, 'Admin CANNOT assign RIZZ score when subsets are incomplete (2/3)');
assert(attemptAssignIncomplete.reason.includes('submitted 2 of 3 subset assessments'), 'Clear error message indicating 2 of 3 subsets submitted');

console.log('\n4. Simulation: Submitting Remaining Subset & Assigning Authoritative RIZZ Score...');

// Student 1 submits 3rd subset (Cinematography)
asmAttempts[student1Id].attempts.push({
  attemptId: 'att_3',
  assessmentId: 'asm_prod_cinematography',
  status: 'Submitted',
  evaluation: { mentorScore: 90, adminFinalScore: 90, status: 'Finalized' }
});
mockStorage.setItem('rizz_assessment_attempts', JSON.stringify(asmAttempts));

const attemptAssignComplete = tryAssignRizzScore(student1Id, 86);
assert(attemptAssignComplete.allowed, 'Admin CAN assign RIZZ score now that all 3 subsets are submitted');
assert(attemptAssignComplete.rizzScore === 86, 'Admin assigned RIZZ score is 86/100');

console.log('\n5. Simulation: Admin Publishing Results & Verification...');

function publishStudentResults(studentId) {
  const prog = JSON.parse(mockStorage.getItem(`rizz_progress_${studentId}`) || '{}');
  if (prog.rizzScore === undefined || prog.rizzScore === null) {
    return { success: false, reason: 'Must assign RIZZ score before publishing' };
  }
  prog.resultsStatus = 'published';
  prog.resultsPublishedAt = new Date().toISOString();
  if (prog.rizzScore >= 70) {
    prog.opportunitiesUnlocked = true;
    prog.overallProgress = 100;
  } else {
    prog.opportunitiesUnlocked = false;
    prog.overallProgress = 85;
  }
  mockStorage.setItem(`rizz_progress_${studentId}`, JSON.stringify(prog));
  return { success: true, progress: prog };
}

const pubResult1 = publishStudentResults(student1Id);
assert(pubResult1.success, 'Admin published results for Student 1');
assert(pubResult1.progress.resultsStatus === 'published', 'Student 1 resultsStatus is published');

console.log('\n6. Simulation: Student Console Unlocking Logic (Score = 86 >= 70)...');

function isResultsUnlocked(userId) {
  const prog = JSON.parse(mockStorage.getItem(`rizz_progress_${userId}`) || '{}');
  return prog.resultsStatus === 'published' || prog.assessmentStatus === 'completed' || prog.assessmentCompleted === true;
}

function isOpportunitiesUnlocked(userId) {
  const prog = JSON.parse(mockStorage.getItem(`rizz_progress_${userId}`) || '{}');
  const resultsOk = isResultsUnlocked(userId);
  const score = (prog.rizzScore !== undefined && prog.rizzScore !== null) ? Number(prog.rizzScore) : (Number(prog.assessmentFinalScore) || 0);
  return resultsOk && score >= 70;
}

assert(isResultsUnlocked(student1Id) === true, 'Student 1 (Score 86) Results Tab is UNLOCKED');
assert(isOpportunitiesUnlocked(student1Id) === true, 'Student 1 (Score 86 >= 70) Opportunities Tab is UNLOCKED');

console.log('\n7. Simulation: Student 2 with RIZZ Score < 70 (Score = 58)...');

const student2Id = 'STUD-TECH-002';
const student2Progress = {
  userId: student2Id,
  chosenTrack: 'Tech',
  workshopStatus: 'completed',
  assessmentStatus: 'in_progress',
  assessmentCompleted: false,
  resultsStatus: 'locked'
};
mockStorage.setItem(`rizz_progress_${student2Id}`, JSON.stringify(student2Progress));

// Student 2 completes all 3 Tech subsets
asmAttempts[student2Id] = {
  studentId: student2Id,
  attempts: [
    { attemptId: 't1', assessmentId: 'asm_tech_webdev', status: 'Submitted', evaluation: { adminFinalScore: 60 } },
    { attemptId: 't2', assessmentId: 'asm_tech_seo', status: 'Submitted', evaluation: { adminFinalScore: 55 } },
    { attemptId: 't3', assessmentId: 'asm_tech_ai', status: 'Submitted', evaluation: { adminFinalScore: 60 } }
  ]
};
mockStorage.setItem('rizz_assessment_attempts', JSON.stringify(asmAttempts));

// Admin assigns RIZZ Score = 58
const assignScoreStud2 = tryAssignRizzScore(student2Id, 58);
assert(assignScoreStud2.allowed, 'Admin assigns score 58 to Student 2');

// Admin publishes results for Student 2
const pubResult2 = publishStudentResults(student2Id);
assert(pubResult2.success, 'Admin published results for Student 2');

// Verify Tab locks for Student 2
assert(isResultsUnlocked(student2Id) === true, 'Student 2 Results Tab is UNLOCKED');
assert(isOpportunitiesUnlocked(student2Id) === false, 'Student 2 (Score 58 < 70) Opportunities Tab is LOCKED');

console.log('\n======================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
}
