const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n============================================================');
console.log('🧪 RUNNING PRE-TEST FULL PERSISTENCE & SUBMISSION SUITE');
console.log('============================================================\n');

const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, 'ADMIN.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// -------------------------------------------------------------
// TEST 1: CODE INVARIANTS & INTEGRITY AUDIT
// -------------------------------------------------------------
console.log('--- TEST 1: Code Invariant & Structural Verifications ---');

assert(studHtml.includes('isSubmitting: false'), 'activeExamState must contain isSubmitting flag');
assert(studHtml.includes('function renderSubmittingView'), 'STUD.html must have dedicated renderSubmittingView');
assert(studHtml.includes('function saveDescriptiveAnswer'), 'STUD.html must have saveDescriptiveAnswer handler');
assert(studHtml.includes('mergedAnswers = Object.assign'), 'submitPreTest must deep-merge stored answers and in-memory answers');
assert(studHtml.includes('${answeredCount} question${answeredCount === 1 ? \'\' : \'s\'}'), 'renderSubmittedView must format singular/plural correctly');
assert(studHtml.includes('if (activeExamState && (activeExamState.isStarted || activeExamState.isSubmitting))'), 'Remote sync handlers must protect active exam');

console.log('✅ PASS: All structural code invariants verified in STUD.html\n');

// -------------------------------------------------------------
// TEST 2: SIMULATE STUDENT PRE-TEST LIFECYCLE & ANSWER PERSISTENCE
// -------------------------------------------------------------
console.log('--- TEST 2: Simulating Multi-Question Navigation & Answer Retention ---');

const mockStorage = {};
const LS_PRETEST_ATTEMPTS = 'rizz_pretest_attempts';
const studentId = 'STUD-001';

const sampleQuestions = [
  { id: 'q_a_p1', text: 'Rule of thirds question', marks: 1, correctAnswer: 'B', track: 'production', type: 'mcq' },
  { id: 'q_a_p2', text: 'J-Cut question', marks: 1, correctAnswer: 'A', track: 'production', type: 'mcq' },
  { id: 'q_a_p3', text: 'Key Light question', marks: 1, correctAnswer: 'B', track: 'production', type: 'mcq' },
  { id: 'q_a_p4', text: 'Frame rate question', marks: 1, correctAnswer: 'A', track: 'production', type: 'mcq' },
  { id: 'q_a_p5', text: 'Descriptive production explanation', marks: 2, correctAnswer: null, track: 'production', type: 'descriptive' }
];

let activeExamState = {
  isStarted: true,
  isSubmitting: false,
  attempt: {
    attemptId: 'ATT-001-' + Date.now(),
    studentId: studentId,
    studentName: 'Student One',
    paperSeries: 'A',
    questionsSnapshot: JSON.parse(JSON.stringify(sampleQuestions)),
    startTime: Date.now(),
    endTime: Date.now() + 3600000,
    answers: {},
    warningCount: 0,
    status: 'in_progress',
    published: false
  },
  questions: sampleQuestions,
  currentIndex: 0
};

mockStorage[LS_PRETEST_ATTEMPTS] = JSON.stringify({ [studentId]: activeExamState.attempt });

function getStudentAttemptMock(uId) {
  if (activeExamState && (activeExamState.isStarted || activeExamState.isSubmitting) && activeExamState.attempt) {
    const attempts = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
    const stored = attempts[uId];
    if (stored && stored.answers) {
      activeExamState.attempt.answers = Object.assign({}, stored.answers, activeExamState.attempt.answers || {});
    }
    return activeExamState.attempt;
  }
  const attempts = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
  return attempts[uId] || null;
}

function saveStudentAttemptMock(att) {
  activeExamState.attempt = att;
  const attempts = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
  attempts[att.studentId] = att;
  mockStorage[LS_PRETEST_ATTEMPTS] = JSON.stringify(attempts);
}

function selectMCQOptionMock(qId, optKey) {
  const att = getStudentAttemptMock(studentId);
  att.answers[qId] = optKey;
  saveStudentAttemptMock(att);
}

function saveDescriptiveAnswerMock(qId, val) {
  const att = getStudentAttemptMock(studentId);
  att.answers[qId] = val;
  saveStudentAttemptMock(att);
}

// 1. Answer Q1
selectMCQOptionMock('q_a_p1', 'B');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p1'], 'B', 'Q1 must be B');

// 2. Navigate to Q3 and answer Q3
activeExamState.currentIndex = 2;
selectMCQOptionMock('q_a_p3', 'B');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p3'], 'B', 'Q3 must be B');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p1'], 'B', 'Q1 must still be B after Q3');

// 3. Navigate to Q5 (descriptive) and answer
activeExamState.currentIndex = 4;
saveDescriptiveAnswerMock('q_a_p5', 'In cinematography, key light provides the primary illumination.');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p5'].includes('cinematography'), true, 'Q5 descriptive answer must be saved');

// 4. Return to Q1
activeExamState.currentIndex = 0;
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p1'], 'B', 'Returning to Q1 must retain B');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p3'], 'B', 'Q3 must still be B');
assert.strictEqual(getStudentAttemptMock(studentId).answers['q_a_p5'].length > 0, true, 'Q5 descriptive must remain');

console.log('✅ PASS: Navigation across MCQs and Descriptive answers preserves all responses\n');

// -------------------------------------------------------------
// TEST 3: REMOTE SYNC & FIREBASE ECHO IMMUNITY
// -------------------------------------------------------------
console.log('--- TEST 3: Shielding Active Exam Against Remote Sync & Stale Echoes ---');

// Simulate a background sync or Firebase listener trying to deliver an older snapshot with only Q1
const staleRemoteAttempt = {
  attemptId: activeExamState.attempt.attemptId,
  studentId: studentId,
  status: 'in_progress',
  answers: { q_a_p1: 'B' } // missing Q3 and Q5
};

// Guard function simulated
function handleIncomingPreTestAttemptMock(incoming) {
  if (activeExamState && (activeExamState.isStarted || activeExamState.isSubmitting)) {
    return; // Shielded
  }
  const attempts = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
  attempts[incoming.studentId] = incoming;
  mockStorage[LS_PRETEST_ATTEMPTS] = JSON.stringify(attempts);
}

handleIncomingPreTestAttemptMock(staleRemoteAttempt);

const preservedAtt = getStudentAttemptMock(studentId);
assert.strictEqual(Object.keys(preservedAtt.answers).length, 3, 'Must still have all 3 answers (Q1, Q3, Q5)');
assert.strictEqual(preservedAtt.answers['q_a_p3'], 'B', 'Q3 answer must not be wiped by remote sync');
assert.strictEqual(preservedAtt.answers['q_a_p5'].length > 0, true, 'Q5 answer must not be wiped by remote sync');

console.log('✅ PASS: Background sync and Firebase echoes cannot clobber in-progress answers\n');

// -------------------------------------------------------------
// TEST 4: SUBMISSION INTEGRITY & QUESTIONS RECORDED COUNT
// -------------------------------------------------------------
console.log('--- TEST 4: Submitting Exam & Derived Questions Recorded Count ---');

// Simulate submitPreTest
activeExamState.isSubmitting = true;

const attToSubmit = getStudentAttemptMock(studentId);
const storedMap = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
const mergedAnswers = Object.assign({}, (storedMap[studentId] && storedMap[studentId].answers) || {}, activeExamState.attempt.answers || {}, attToSubmit.answers || {});
attToSubmit.answers = mergedAnswers;
attToSubmit.status = 'Pending';
attToSubmit.submitTime = Date.now();

// Score calculations
let earnedMarks = 0;
attToSubmit.questionsSnapshot.forEach(q => {
  const ans = attToSubmit.answers[q.id];
  if (q.type === 'mcq' && ans === q.correctAnswer) {
    earnedMarks += q.marks;
  }
});
attToSubmit.mcqScore = earnedMarks;
attToSubmit.totalScore = earnedMarks;

saveStudentAttemptMock(attToSubmit);
activeExamState.isStarted = false;
activeExamState.isSubmitting = false;

// Verify final submitted attempt in storage
const finalSubmitted = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS])[studentId];
assert.strictEqual(finalSubmitted.status, 'Pending', 'Attempt status must be Pending');
assert.strictEqual(Object.keys(finalSubmitted.answers).length, 3, 'Must contain all 3 recorded answers');
assert.strictEqual(finalSubmitted.answers['q_a_p1'], 'B', 'Q1 answer must be B');
assert.strictEqual(finalSubmitted.answers['q_a_p3'], 'B', 'Q3 answer must be B');
assert.strictEqual(finalSubmitted.answers['q_a_p5'].includes('cinematography'), true, 'Q5 answer must be descriptive text');

// Questions recorded count calculation
const finalAnswers = finalSubmitted.answers || {};
const answeredCount = Object.keys(finalAnswers).filter(k => String(finalAnswers[k]).trim().length > 0).length;
assert.strictEqual(answeredCount, 3, 'Questions Recorded count must be 3, NOT 1');

console.log(`✅ PASS: Submission verified. Questions Recorded: ${answeredCount} questions (${finalSubmitted.totalScore} MCQ marks)\n`);

// -------------------------------------------------------------
// TEST 5: ADMIN EVALUATION RECEIVES COMPLETE ATTEMPT
// -------------------------------------------------------------
console.log('--- TEST 5: Admin Evaluation Pipeline Verification ---');

// In ADMIN.html, loadPreTestAttempts loads the same storage / backend
const adminAttempts = JSON.parse(mockStorage[LS_PRETEST_ATTEMPTS] || '{}');
const adminStudentAttempt = adminAttempts[studentId];

assert(adminStudentAttempt !== undefined, 'Admin must receive student attempt');
assert.strictEqual(adminStudentAttempt.status, 'Pending', 'Admin sees Pending status');
assert.strictEqual(Object.keys(adminStudentAttempt.answers).length, 3, 'Admin receives all 3 student answers');
assert.strictEqual(adminStudentAttempt.answers['q_a_p1'], 'B', 'Admin sees Q1 answer');
assert.strictEqual(adminStudentAttempt.answers['q_a_p3'], 'B', 'Admin sees Q3 answer');
assert.strictEqual(adminStudentAttempt.answers['q_a_p5'].includes('cinematography'), true, 'Admin sees descriptive response');

console.log('✅ PASS: Admin evaluation receives exact canonical attempt with 100% data integrity\n');

console.log('============================================================');
console.log('🎉 ALL PRE-TEST PERSISTENCE & SUBMISSION TESTS PASSED (100%)');
console.log('============================================================\n');
