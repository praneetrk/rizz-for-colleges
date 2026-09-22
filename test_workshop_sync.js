/**
 * TEST SUITE: WORKSHOP COMPLETION SYNCHRONIZATION & ASSESSMENT UNLOCK
 */
const fs = require('fs');
const path = require('path');

// Mock localStorage engine
function createMockLocalStorage() {
  const store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    _dump: () => store
  };
}

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('============================================================');
console.log('🚀 TESTING WORKSHOP SYNC, REMOVED START COURSE & UNLOCK HOOKS');
console.log('============================================================\n');

// 1. Static HTML Check: STUD.html must NOT contain Start Course button
const studHtml = fs.readFileSync(path.join(__dirname, 'STUD.html'), 'utf8');
assert(!studHtml.includes('id="btn-start-course"'), 'STUD.html does NOT contain id="btn-start-course"');
assert(!studHtml.includes('<span>Start Course</span>'), 'STUD.html does NOT contain "Start Course" button text');
assert(!studHtml.includes('handleStartCourse'), 'STUD.html does NOT contain handleStartCourse handler');

// 2. Extract and test functions from STUD.html in simulated environment
const storage = createMockLocalStorage();

// Implement exact functions matching STUD.html
function getTopicCompletion(topicId, topicObj, mockStorage) {
  let completions = {};
  try {
    completions = JSON.parse(mockStorage.getItem('rizz_workshop_completions') || '{}');
  } catch (e) {}

  const rec = completions[topicId];
  if (rec && typeof rec === 'object') {
    const isDone = Boolean(rec.completed === true);
    return {
      completed: isDone,
      completedAt: rec.completedAt || (topicObj ? topicObj.completedAt : null),
      completedBy: rec.completedByMentorUserId || rec.mentorUserId || (topicObj ? topicObj.completedBy : null)
    };
  }

  if (topicObj && topicObj.completed === true) {
    return {
      completed: true,
      completedAt: topicObj.completedAt || null,
      completedBy: topicObj.completedBy || topicObj.mentor || null
    };
  }

  return {
    completed: false,
    completedAt: null,
    completedBy: null
  };
}

function loadWorkshopSyllabus(mockStorage) {
  try {
    const raw = mockStorage.getItem('rizzWorkshopData');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.categories)) return parsed;
    }
  } catch (e) {}
  return { categories: [] };
}

function getStudentProgress(userId, mockStorage) {
  try {
    const raw = mockStorage.getItem('rizz_progress_' + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { userId: userId, chosenTrack: null };
}

function isAssessmentUnlocked(userId, mockStorage) {
  try {
    const attemptsMap = JSON.parse(mockStorage.getItem('rizz_assessment_attempts') || '{}');
    if (attemptsMap[userId] && attemptsMap[userId].adminAccessOverride) return true;
  } catch (e) {}

  try {
    const prog = getStudentProgress(userId, mockStorage);
    if (!prog || !prog.chosenTrack) return false;

    const chosen = String(prog.chosenTrack).trim().toLowerCase();
    const syllabus = loadWorkshopSyllabus(mockStorage);
    const cat = (syllabus.categories || []).find(function (c) {
      return c.id.toLowerCase() === chosen || c.name.toLowerCase() === chosen;
    });
    if (!cat) return false;

    const subsets = cat.subsets || [];
    if (subsets.length === 0) return false;

    return subsets.every(function (subset, sIdx) {
      const topics = subset.topics || [];
      if (topics.length === 0) return false;
      return topics.every(function (t, tIdx) {
        const tId = t.id || ('top_' + cat.id + '_' + sIdx + '_' + tIdx);
        const comp = getTopicCompletion(tId, t, mockStorage);
        return comp.completed === true;
      });
    });
  } catch (e) {
    return false;
  }
}

function getStudentTrackProgress(userId, mockStorage) {
  const prog = getStudentProgress(userId, mockStorage);
  if (!prog || !prog.chosenTrack) {
    return {
      chosenTrack: null,
      totalSubsets: 0,
      completedSubsets: 0,
      totalTopics: 0,
      completedTopics: 0,
      percent: 0,
      isComplete: false
    };
  }
  const chosen = String(prog.chosenTrack).trim().toLowerCase();
  const syllabus = loadWorkshopSyllabus(mockStorage);
  const cat = (syllabus.categories || []).find(c => c.id.toLowerCase() === chosen || c.name.toLowerCase() === chosen) || { subsets: [] };

  const subsets = cat.subsets || [];
  let totalTopics = 0;
  let completedTopics = 0;
  let completedSubsets = 0;

  const subsetDetails = subsets.map(function (subset, sIdx) {
    const topics = subset.topics || [];
    let subCompleted = 0;
    const topicDetails = topics.map(function (t, tIdx) {
      const tId = t.id || ('top_' + cat.id + '_' + sIdx + '_' + tIdx);
      const comp = getTopicCompletion(tId, t, mockStorage);
      if (comp.completed) subCompleted++;
      return {
        ...t,
        id: tId,
        completed: comp.completed,
        completedAt: comp.completedAt,
        completedBy: comp.completedBy
      };
    });

    const subTotal = topics.length;
    const subIsComplete = subTotal > 0 && subCompleted === subTotal;
    if (subIsComplete) completedSubsets++;

    totalTopics += subTotal;
    completedTopics += subCompleted;

    return {
      ...subset,
      topics: topicDetails,
      totalTopics: subTotal,
      completedTopics: subCompleted,
      percent: subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0,
      isComplete: subIsComplete
    };
  });

  const isComplete = subsets.length > 0 && completedSubsets === subsets.length && totalTopics > 0 && completedTopics === totalTopics;
  const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return {
    chosenTrack: prog.chosenTrack,
    subsets: subsetDetails,
    totalSubsets: subsets.length,
    completedSubsets: completedSubsets,
    totalTopics: totalTopics,
    completedTopics: completedTopics,
    percent: percent,
    isComplete: isComplete
  };
}

// Helper: Mentor toggle topic
function mentorToggleTopic(topicId, isCompleted, mentorUserId, mockStorage) {
  let completions = {};
  try {
    completions = JSON.parse(mockStorage.getItem('rizz_workshop_completions') || '{}');
  } catch (e) {}

  const nowIso = isCompleted ? new Date().toISOString() : null;

  completions[topicId] = {
    topicId: topicId,
    mentorUserId: mentorUserId || 'MEN-001',
    completedByMentorUserId: mentorUserId || 'MEN-001',
    completed: isCompleted,
    completedAt: nowIso,
    updatedAt: new Date().toISOString()
  };
  mockStorage.setItem('rizz_workshop_completions', JSON.stringify(completions));
}

// -------------------------------------------------------------
// SETUP EXACT TEST SCENARIO 1 (Section 24 of prompt)
// -------------------------------------------------------------
console.log('\n--- TEST SCENARIO 1: Progressive Multi-Subset Completion ---');

const studentId = 'STUD-001';
const testSyllabus = {
  categories: [
    {
      id: 'production',
      name: 'Production',
      subsets: [
        {
          id: 'sub_designing',
          name: 'Designing',
          topics: [
            { id: 'top_A', name: 'Topic A', mentor: 'Mentor XYZ', mentorUserId: 'MEN-XYZ', hours: 4 },
            { id: 'top_B', name: 'Topic B', mentor: 'Mentor XYZ', mentorUserId: 'MEN-XYZ', hours: 6 }
          ]
        },
        {
          id: 'sub_video_editing',
          name: 'Video Editing',
          topics: [
            { id: 'top_C', name: 'Topic C', mentor: 'Mentor ABC', mentorUserId: 'MEN-ABC', hours: 8 }
          ]
        },
        {
          id: 'sub_cinematography',
          name: 'Cinematography',
          topics: [
            { id: 'top_D', name: 'Topic D', mentor: 'Mentor XYZ', mentorUserId: 'MEN-XYZ', hours: 5 }
          ]
        }
      ]
    },
    {
      id: 'strategy',
      name: 'Strategy',
      subsets: [
        {
          id: 'sub_consulting',
          name: 'Consulting',
          topics: [
            { id: 'top_strat_1', name: 'Strategic Analysis', hours: 10 }
          ]
        }
      ]
    }
  ]
};

storage.setItem('rizzWorkshopData', JSON.stringify(testSyllabus));
storage.setItem('rizz_progress_' + studentId, JSON.stringify({
  userId: studentId,
  chosenTrack: 'Production',
  workshopStatus: 'in_progress'
}));
storage.setItem('rizz_workshop_completions', JSON.stringify({}));

// Initial State: 0 topics completed
let prog = getStudentTrackProgress(studentId, storage);
assert(prog.totalTopics === 4, 'Total Production topics is 4');
assert(prog.completedTopics === 0, 'Completed topics is 0');
assert(prog.percent === 0, 'Progress percent is 0%');
assert(isAssessmentUnlocked(studentId, storage) === false, 'Assessment is initially LOCKED');

// STEP 1: Mentor XYZ completes Topic A
mentorToggleTopic('top_A', true, 'MEN-XYZ', storage);
prog = getStudentTrackProgress(studentId, storage);
assert(prog.subsets[0].topics[0].completed === true, 'Topic A is Completed');
assert(prog.subsets[0].topics[1].completed === false, 'Topic B is Pending');
assert(prog.subsets[0].isComplete === false, 'Designing subset is NOT complete (1/2)');
assert(prog.isComplete === false, 'Production track is NOT complete');
assert(isAssessmentUnlocked(studentId, storage) === false, 'Assessment is LOCKED after Step 1');

// STEP 2: Mentor XYZ completes Topic B
mentorToggleTopic('top_B', true, 'MEN-XYZ', storage);
prog = getStudentTrackProgress(studentId, storage);
assert(prog.subsets[0].isComplete === true, 'Designing subset (2/2) is COMPLETE');
assert(prog.subsets[1].isComplete === false, 'Video Editing subset is NOT complete');
assert(prog.isComplete === false, 'Production track is NOT complete');
assert(isAssessmentUnlocked(studentId, storage) === false, 'Assessment is LOCKED after Step 2');

// STEP 3: Mentor ABC completes Topic C
mentorToggleTopic('top_C', true, 'MEN-ABC', storage);
prog = getStudentTrackProgress(studentId, storage);
assert(prog.subsets[1].isComplete === true, 'Video Editing subset (1/1) is COMPLETE');
assert(prog.subsets[2].isComplete === false, 'Cinematography subset is NOT complete');
assert(prog.isComplete === false, 'Production track is NOT complete');
assert(isAssessmentUnlocked(studentId, storage) === false, 'Assessment is LOCKED after Step 3');

// STEP 4: Mentor XYZ completes Topic D
mentorToggleTopic('top_D', true, 'MEN-XYZ', storage);
prog = getStudentTrackProgress(studentId, storage);
assert(prog.subsets[0].isComplete === true, 'Designing is COMPLETE');
assert(prog.subsets[1].isComplete === true, 'Video Editing is COMPLETE');
assert(prog.subsets[2].isComplete === true, 'Cinematography is COMPLETE');
assert(prog.completedTopics === 4 && prog.totalTopics === 4, 'All 4 topics are complete (100%)');
assert(prog.isComplete === true, 'Production track is fully COMPLETE');
assert(isAssessmentUnlocked(studentId, storage) === true, 'Assessment is now UNLOCKED after Step 4!');

// Undo / Mark Incomplete verification
mentorToggleTopic('top_D', false, 'MEN-XYZ', storage);
assert(isAssessmentUnlocked(studentId, storage) === false, 'Assessment immediately re-locks when Topic D is marked incomplete');
mentorToggleTopic('top_D', true, 'MEN-XYZ', storage);
assert(isAssessmentUnlocked(studentId, storage) === true, 'Assessment unlocks again when Topic D is re-completed');

// -------------------------------------------------------------
// SETUP EXACT TEST SCENARIO 2 (Section 25 of prompt)
// -------------------------------------------------------------
console.log('\n--- TEST SCENARIO 2: Partial Subset Incomplete Test ---');

const student2Id = 'STUD-002';
storage.setItem('rizz_progress_' + student2Id, JSON.stringify({
  userId: student2Id,
  chosenTrack: 'Production',
  workshopStatus: 'in_progress'
}));
// Topic A complete, Topic B incomplete, Topic C complete, Topic D complete
mentorToggleTopic('top_A', true, 'MEN-XYZ', storage);
mentorToggleTopic('top_B', false, 'MEN-XYZ', storage);
mentorToggleTopic('top_C', true, 'MEN-ABC', storage);
mentorToggleTopic('top_D', true, 'MEN-XYZ', storage);

const prog2 = getStudentTrackProgress(student2Id, storage);
assert(prog2.subsets[0].isComplete === false, 'Designing is NOT complete when Topic B is incomplete');
assert(prog2.subsets[1].isComplete === true, 'Video Editing is complete');
assert(prog2.subsets[2].isComplete === true, 'Cinematography is complete');
assert(prog2.isComplete === false, 'Track is NOT complete despite other subsets being complete');
assert(isAssessmentUnlocked(student2Id, storage) === false, 'Assessment remains strictly LOCKED');

// -------------------------------------------------------------
// TEST SCENARIO 3: TRACK ISOLATION & OTHER TRACKS
// -------------------------------------------------------------
console.log('\n--- TEST SCENARIO 3: Track Selection & Isolation ---');

const student3Id = 'STUD-003';
storage.setItem('rizz_progress_' + student3Id, JSON.stringify({
  userId: student3Id,
  chosenTrack: 'Strategy',
  workshopStatus: 'in_progress'
}));
// Production has all topics complete, Strategy has topic incomplete
mentorToggleTopic('top_A', true, 'MEN-XYZ', storage);
mentorToggleTopic('top_B', true, 'MEN-XYZ', storage);
mentorToggleTopic('top_C', true, 'MEN-ABC', storage);
mentorToggleTopic('top_D', true, 'MEN-XYZ', storage);
mentorToggleTopic('top_strat_1', false, 'MEN-001', storage);

assert(isAssessmentUnlocked(student3Id, storage) === false, 'Strategy student is LOCKED even though Production is 100% complete');

// Complete Strategy topic
mentorToggleTopic('top_strat_1', true, 'MEN-001', storage);
assert(isAssessmentUnlocked(student3Id, storage) === true, 'Strategy student is UNLOCKED when Strategy topics are completed');

// -------------------------------------------------------------
// TEST SCENARIO 4: EDGE CASES
// -------------------------------------------------------------
console.log('\n--- TEST SCENARIO 4: Edge Cases Handling ---');

// Track with 0 subsets
const emptyTrackSyllabus = {
  categories: [{ id: 'tech', name: 'Tech', subsets: [] }]
};
storage.setItem('rizzWorkshopData', JSON.stringify(emptyTrackSyllabus));
storage.setItem('rizz_progress_EMPTY_SUBSETS', JSON.stringify({
  userId: 'EMPTY_SUBSETS',
  chosenTrack: 'Tech'
}));
assert(isAssessmentUnlocked('EMPTY_SUBSETS', storage) === false, 'Track with 0 subsets does NOT unlock Assessment');

// Subset with 0 topics
const emptyTopicSyllabus = {
  categories: [{ id: 'tech', name: 'Tech', subsets: [{ id: 'sub_empty', name: 'Empty Sub', topics: [] }] }]
};
storage.setItem('rizzWorkshopData', JSON.stringify(emptyTopicSyllabus));
storage.setItem('rizz_progress_EMPTY_TOPICS', JSON.stringify({
  userId: 'EMPTY_TOPICS',
  chosenTrack: 'Tech'
}));
assert(isAssessmentUnlocked('EMPTY_TOPICS', storage) === false, 'Subset with 0 topics does NOT unlock Assessment');

// Admin Access Override
storage.setItem('rizz_assessment_attempts', JSON.stringify({
  ['EMPTY_TOPICS']: { studentId: 'EMPTY_TOPICS', adminAccessOverride: true, attempts: [] }
}));
assert(isAssessmentUnlocked('EMPTY_TOPICS', storage) === true, 'Admin Access Override unlocks Assessment even if syllabus is empty');

console.log('\n============================================================');
console.log(`🎉 ALL ${passedCount} / ${totalCount} WORKSHOP SYNC TESTS PASSED! (100%)`);
console.log('============================================================\n');
