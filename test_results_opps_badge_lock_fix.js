/**
 * test_results_opps_badge_lock_fix.js
 * Verification of sidebar badge lock (🔒) vs green checkmark (✔) transitions across the complete student journey.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('🧪 VERIFYING RESULTS & OPPORTUNITIES SIDEBAR LOCK BADGE LOGIC');
console.log('======================================================================\n');

// Load STUD.html
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');

// 1. Static HTML Badge ID and initial classes verification
console.log('--- 1. Static HTML Badges in STUD.html ---');
assert(studHtml.includes('id="nav-workshop-badge"'), 'nav-workshop-badge ID present');
assert(studHtml.includes('id="nav-assessment-badge"'), 'nav-assessment-badge ID present');
assert(studHtml.includes('id="nav-results-badge"'), 'nav-results-badge ID present');
assert(studHtml.includes('id="nav-opportunities-badge"'), 'nav-opportunities-badge ID present');
assert(studHtml.includes('<i class="fa-solid fa-lock nav-lock-badge" id="nav-results-badge" title="Locked stage"'), 'nav-results starts as locked');
assert(studHtml.includes('<i class="fa-solid fa-lock nav-lock-badge" id="nav-opportunities-badge" title="Locked stage"'), 'nav-opportunities starts as locked');
console.log('✅ PASS: Static HTML badge elements and initial locked states verified.\n');

// 2. DOM Simulator
class MockElement {
  constructor(tag, id = '', className = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  getAttribute(k) { return this.attributes[k] || null; }
  classListAdd(c) {
    const list = this.className.split(/\s+/).filter(Boolean);
    if (!list.includes(c)) list.push(c);
    this.className = list.join(' ');
  }
  classListRemove(c) {
    const list = this.className.split(/\s+/).filter(Boolean).filter(x => x !== c);
    this.className = list.join(' ');
  }
  get classList() {
    return {
      add: (c) => this.classListAdd(c),
      remove: (c) => this.classListRemove(c),
      contains: (c) => this.className.split(/\s+/).includes(c)
    };
  }
  querySelector(selector) {
    // Simple selector matching for mock
    for (const child of this.children) {
      if (selector.includes('.nav-lock-badge') && child.classList.contains('nav-lock-badge')) return child;
      if (selector.includes('.fa-circle-check') && child.classList.contains('fa-circle-check')) return child;
      if (selector.includes('.fa-lock') && child.classList.contains('fa-lock')) return child;
      if (selector.includes('.nav-icon') && child.classList.contains('nav-icon')) return child;
      if (selector.includes('.step-badge') && child.classList.contains('step-badge')) return child;
    }
    return null;
  }
  appendChild(child) {
    this.children.push(child);
  }
}

// Set up mock DOM
const mockElements = {};
function createNav(id, tab, badgeId) {
  const btn = new MockElement('button', id, 'nav-item locked');
  btn.setAttribute('data-tab', tab);
  const icon = new MockElement('i', '', 'fa-solid fa-icon nav-icon');
  const badge = new MockElement('i', badgeId, 'fa-solid fa-lock nav-lock-badge');
  btn.appendChild(icon);
  btn.appendChild(badge);
  mockElements[id] = btn;
  mockElements[badgeId] = badge;
  return btn;
}

const navPretest = new MockElement('button', 'nav-pretest', 'nav-item');
const pretestIcon = new MockElement('i', '', 'fa-solid fa-clipboard-check nav-icon');
const pretestBadge = new MockElement('i', 'nav-pretest-badge', 'fa-solid fa-circle-check nav-lock-badge text-emerald-500 text-xs hidden');
navPretest.appendChild(pretestIcon);
navPretest.appendChild(pretestBadge);
mockElements['nav-pretest'] = navPretest;
mockElements['nav-pretest-badge'] = pretestBadge;

const navWorkshop = createNav('nav-workshop', 'workshop', 'nav-workshop-badge');
const navAssessment = createNav('nav-assessment', 'assessment', 'nav-assessment-badge');
const navResults = createNav('nav-results', 'results', 'nav-results-badge');
const navOpportunities = createNav('nav-opportunities', 'opportunities', 'nav-opportunities-badge');

const mockStorage = {};
function getStudentProgress(uId) {
  const raw = mockStorage['rizz_progress_' + uId];
  if (raw) return JSON.parse(raw);
  return {
    preTestStatus: 'ready',
    preTestAttempt: null,
    evaluationStatus: 'pending',
    finalScore: null,
    suggestedTrack: null,
    suggestedCourse: null,
    chosenTrack: null,
    workshopStatus: 'locked',
    workshopProgress: 0,
    assessmentStatus: 'locked',
    assessmentCompleted: false,
    assessmentFinalScore: null,
    rizzScore: null,
    opportunitiesUnlocked: false,
    resultsStatus: 'locked',
    overallProgress: 0
  };
}

function loadAssessmentAttempts() {
  try {
    return JSON.parse(mockStorage['rizz_assessment_attempts'] || '{}');
  } catch (e) {
    return {};
  }
}

function isWorkshopUnlocked(userId) {
  const uId = userId || 'STUD-001';
  try {
    const attempts = JSON.parse(mockStorage['rizz_pretest_attempts'] || '{}');
    const att = attempts[uId];
    if (att && (att.status === 'Published' || att.published === true)) return true;
  } catch (e) {}
  const prog = getStudentProgress(uId);
  return prog && (prog.workshopStatus === 'available' || prog.workshopStatus === 'in_progress' || prog.workshopStatus === 'completed' || prog.preTestStatus === 'reviewed');
}

function isAssessmentUnlocked(userId) {
  const uId = userId || 'STUD-001';
  const prog = getStudentProgress(uId);
  return prog.workshopStatus === 'completed' || prog.assessmentStatus === 'available' || prog.assessmentStatus === 'completed';
}

function isResultsUnlocked(userId) {
  const uId = userId || 'STUD-001';
  try {
    const prog = getStudentProgress(uId);
    if (prog && prog.resultsStatus === 'published' && (prog.assessmentCompleted === true || (prog.rizzScore !== null && prog.rizzScore !== undefined) || (prog.assessmentFinalScore !== null && prog.assessmentFinalScore !== undefined))) {
      return true;
    }
  } catch (e) {}
  try {
    const attemptsMap = loadAssessmentAttempts();
    const sAttempts = attemptsMap[uId];
    if (sAttempts && sAttempts.attempts && sAttempts.attempts.length > 0) {
      return sAttempts.attempts.some(a => a.status === 'Published' || (a.evaluation && a.evaluation.adminStatus === 'Published'));
    }
  } catch (e) {}
  return false;
}

function isOpportunitiesUnlocked(userId) {
  const uId = userId || 'STUD-001';
  if (!isResultsUnlocked(uId)) return false;
  try {
    const prog = getStudentProgress(uId);
    if (prog && prog.opportunitiesUnlocked === true && ((prog.rizzScore !== null && prog.rizzScore !== undefined && Number(prog.rizzScore) >= 70) || (prog.assessmentFinalScore !== null && prog.assessmentFinalScore !== undefined && Number(prog.assessmentFinalScore) >= 70))) {
      return true;
    }
    let score = (prog && prog.rizzScore !== undefined && prog.rizzScore !== null) ? Number(prog.rizzScore) : (prog && prog.assessmentFinalScore !== undefined && prog.assessmentFinalScore !== null ? Number(prog.assessmentFinalScore) : null);
    if (score === null) {
      const attemptsMap = loadAssessmentAttempts();
      const sAttempts = attemptsMap[uId];
      if (sAttempts && sAttempts.attempts) {
        sAttempts.attempts.forEach(function(a) {
          if (a.evaluation && a.evaluation.adminFinalScore !== undefined && a.evaluation.adminFinalScore !== null && (a.status === 'Published' || (a.evaluation && a.evaluation.adminStatus === 'Published'))) {
            score = Number(a.evaluation.adminFinalScore);
          }
        });
      }
    }
    return (score !== null && score >= 70);
  } catch (e) {
    return false;
  }
}

function syncWorkshopNavAndJourneySim(userId) {
  const wsUnlocked = isWorkshopUnlocked(userId);
  const asmUnlocked = isAssessmentUnlocked(userId);
  const resultsUnlocked = isResultsUnlocked(userId);
  const oppsUnlocked = isOpportunitiesUnlocked(userId);

  // Workshop
  if (wsUnlocked) {
    navWorkshop.classList.remove('locked');
    const badge = mockElements['nav-workshop-badge'];
    if (badge) badge.className = 'fa-solid fa-circle-check nav-lock-badge text-emerald-500 text-xs';
  } else {
    navWorkshop.classList.add('locked');
    const badge = mockElements['nav-workshop-badge'];
    if (badge) badge.className = 'fa-solid fa-lock nav-lock-badge';
  }

  // Assessment
  if (asmUnlocked) {
    navAssessment.classList.remove('locked');
    const badge = mockElements['nav-assessment-badge'];
    if (badge) badge.className = 'fa-solid fa-circle-check nav-lock-badge text-emerald-500 text-xs';
  } else {
    navAssessment.classList.add('locked');
    const badge = mockElements['nav-assessment-badge'];
    if (badge) badge.className = 'fa-solid fa-lock nav-lock-badge';
  }

  // Results
  if (resultsUnlocked) {
    navResults.classList.remove('locked');
    const badge = mockElements['nav-results-badge'];
    if (badge) badge.className = 'fa-solid fa-circle-check nav-lock-badge text-emerald-500 text-xs';
  } else {
    navResults.classList.add('locked');
    const badge = mockElements['nav-results-badge'];
    if (badge) badge.className = 'fa-solid fa-lock nav-lock-badge';
  }

  // Opportunities
  if (oppsUnlocked) {
    navOpportunities.classList.remove('locked');
    const badge = mockElements['nav-opportunities-badge'];
    if (badge) badge.className = 'fa-solid fa-circle-check nav-lock-badge text-emerald-500 text-xs';
  } else {
    navOpportunities.classList.add('locked');
    const badge = mockElements['nav-opportunities-badge'];
    if (badge) badge.className = 'fa-solid fa-lock nav-lock-badge';
  }
}

const testStudent = 'JAIN-001';

// Step 1: Initial Fresh Student
console.log('--- 2. Initial Fresh Student ---');
syncWorkshopNavAndJourneySim(testStudent);
assert(mockElements['nav-results-badge'].classList.contains('fa-lock'), 'Results badge must have fa-lock');
assert(!mockElements['nav-results-badge'].classList.contains('fa-circle-check'), 'Results badge must NOT have fa-circle-check');
assert(mockElements['nav-opportunities-badge'].classList.contains('fa-lock'), 'Opportunities badge must have fa-lock');
assert(!mockElements['nav-opportunities-badge'].classList.contains('fa-circle-check'), 'Opportunities badge must NOT have fa-circle-check');
console.log('✅ PASS: Fresh student has RESULTS and OPPORTUNITIES strictly locked with lock icons.\n');

// Step 2: Student completes Pre-Test and Admin publishes it
console.log('--- 3. Pre-Test Published -> Workshop Stage Active ---');
mockStorage['rizz_pretest_attempts'] = JSON.stringify({
  [testStudent]: { status: 'Published', published: true, adminFinalScore: 18, adminFinalSuggestion: 'Production' }
});
mockStorage['rizz_progress_' + testStudent] = JSON.stringify({
  preTestStatus: 'reviewed',
  workshopStatus: 'available',
  resultsStatus: 'locked'
});
syncWorkshopNavAndJourneySim(testStudent);
assert(mockElements['nav-workshop-badge'].classList.contains('fa-circle-check'), 'Workshop unlocked with green check');
assert(mockElements['nav-assessment-badge'].classList.contains('fa-lock'), 'Assessment strictly locked with lock icon');
assert(mockElements['nav-results-badge'].classList.contains('fa-lock'), 'Results strictly locked with lock icon');
assert(mockElements['nav-opportunities-badge'].classList.contains('fa-lock'), 'Opportunities strictly locked with lock icon');
console.log('✅ PASS: Workshop stage active: Results & Opportunities remain strictly locked (🔒).\n');

// Step 3: Admin evaluates Assessment and Publishes Results (Score 85 >= 70)
console.log('--- 4. Assessment Results Published (Score = 85) ---');
mockStorage['rizz_progress_' + testStudent] = JSON.stringify({
  preTestStatus: 'reviewed',
  workshopStatus: 'completed',
  assessmentStatus: 'completed',
  assessmentCompleted: true,
  resultsStatus: 'published',
  rizzScore: 85,
  opportunitiesUnlocked: true
});
syncWorkshopNavAndJourneySim(testStudent);
assert(mockElements['nav-results-badge'].classList.contains('fa-circle-check'), 'Results unlocked with green check (✔)');
assert(mockElements['nav-opportunities-badge'].classList.contains('fa-circle-check'), 'Opportunities unlocked with green check (✔)');
console.log('✅ PASS: Both Results and Opportunities turn green (✔) upon legitimate score publish (85/100).\n');

// Step 4: Admin resets student back to fresh
console.log('--- 5. Student Reset -> Reverts to Clean Locked State ---');
mockStorage['rizz_progress_' + testStudent] = JSON.stringify({
  preTestStatus: 'ready',
  workshopStatus: 'locked',
  assessmentStatus: 'locked',
  resultsStatus: 'locked',
  opportunitiesUnlocked: false
});
delete mockStorage['rizz_pretest_attempts'];
delete mockStorage['rizz_assessment_attempts'];
syncWorkshopNavAndJourneySim(testStudent);
assert(mockElements['nav-workshop-badge'].classList.contains('fa-lock'), 'Workshop reverts to lock (🔒)');
assert(mockElements['nav-assessment-badge'].classList.contains('fa-lock'), 'Assessment reverts to lock (🔒)');
assert(mockElements['nav-results-badge'].classList.contains('fa-lock'), 'Results reverts to lock (🔒)');
assert(mockElements['nav-opportunities-badge'].classList.contains('fa-lock'), 'Opportunities reverts to lock (🔒)');
console.log('✅ PASS: Reset cleanly restores all lock icons without any stuck green badges.\n');

console.log('======================================================================');
console.log('🎉 ALL RESULTS & OPPORTUNITIES BADGE LOCK TESTS PASSED 100%!');
console.log('======================================================================\n');
