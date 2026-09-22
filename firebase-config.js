/**
 * RIZZ for Colleges — Firebase Realtime Database Configuration & Synchronization SDK
 * 
 * Instructions:
 * Replace the placeholder values below with your Firebase Project Configuration.
 * You can find these in the Firebase Console -> Project Settings -> General -> Your apps -> SDK setup/config.
 */

window.RIZZ_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFRGo_7CJGZnrtan6jIqdiNOae8VoemEI",
  authDomain: "rizz-93967.firebaseapp.com",
  databaseURL: "https://rizz-93967-default-rtdb.firebaseio.com",
  projectId: "rizz-93967",
  storageBucket: "rizz-93967.firebasestorage.app",
  messagingSenderId: "408066324178",
  appId: "1:408066324178:web:90597749fa736a821f5f0b"
};

(function () {
  'use strict';

  let dbInstance = null;
  let isInitialized = false;
  const listeners = {};

  function isConfigured() {
    const cfg = window.RIZZ_FIREBASE_CONFIG || {};
    return Boolean(
      cfg.apiKey &&
      !String(cfg.apiKey).includes('YOUR_') &&
      cfg.databaseURL &&
      !String(cfg.databaseURL).includes('YOUR_')
    );
  }

  function initDb() {
    if (isInitialized && dbInstance) return dbInstance;
    if (typeof firebase === 'undefined') {
      console.warn('[RIZZ Firebase] Firebase SDK script not found on page.');
      return null;
    }

    const cfg = window.RIZZ_FIREBASE_CONFIG || {};
    if (!isConfigured()) {
      console.info('[RIZZ Firebase] Using fallback/local mode. To enable cross-device real-time sync, paste your Firebase config in firebase-config.js.');
      return null;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      dbInstance = firebase.database();
      isInitialized = true;
      console.log('🔥 [RIZZ Firebase] Connected to Realtime Database successfully:', cfg.databaseURL);
      return dbInstance;
    } catch (err) {
      console.error('[RIZZ Firebase] Error initializing Firebase:', err);
      return null;
    }
  }

  let storageInstance = null;
  function initStorage() {
    if (storageInstance) return storageInstance;
    if (typeof firebase === 'undefined' || typeof firebase.storage !== 'function') {
      return null;
    }
    const cfg = window.RIZZ_FIREBASE_CONFIG || {};
    if (!isConfigured()) return null;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      storageInstance = firebase.storage();
      return storageInstance;
    } catch (err) {
      console.warn('[RIZZ Firebase] Storage init error:', err);
      return null;
    }
  }

  // Safe ref helper
  function getRef(path) {
    const db = initDb();
    if (!db) return null;
    try {
      return db.ref(path);
    } catch (e) {
      console.warn('[RIZZ Firebase] Error getting ref for ' + path, e);
      return null;
    }
  }

  window.RizzDB = {
    isConfigured: isConfigured,
    init: initDb,
    getDb: initDb,

    /* ─────────────────────────────────────────────────────────────
       1. TEST SCHEDULE (/testSchedule)
    ───────────────────────────────────────────────────────────── */
    setSchedule: async function (scheduleData) {
      const ref = getRef('testSchedule');
      const payload = {
        timestamp: scheduleData.timestamp || (scheduleData.scheduledAt ? new Date(scheduleData.scheduledAt).getTime() : null),
        scheduledAt: scheduleData.scheduledAt || null,
        status: scheduleData.status || 'Published',
        examName: scheduleData.examName || 'RIZZ Foundation Pre-Test 2026',
        durationMinutes: scheduleData.durationMinutes || 60,
        totalMarks: scheduleData.totalMarks || 21,
        seriesCount: scheduleData.seriesCount || 3,
        updatedAt: new Date().toISOString()
      };

      if (ref) {
        try {
          await ref.set(payload);
          console.log('[RIZZ Firebase] Schedule updated in /testSchedule:', payload);
        } catch (e) {
          console.error('[RIZZ Firebase] Error saving to /testSchedule:', e);
        }
      }
      return payload;
    },

    getSchedule: async function () {
      const ref = getRef('testSchedule');
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val();
      } catch (e) {
        console.warn('[RIZZ Firebase] Error reading /testSchedule:', e);
        return null;
      }
    },

    onScheduleChange: function (callback) {
      const ref = getRef('testSchedule');
      if (!ref) return null;
      const listener = ref.on('value', function (snapshot) {
        const data = snapshot.val();
        if (typeof callback === 'function') {
          callback(data);
        }
      }, function (err) {
        console.warn('[RIZZ Firebase] /testSchedule listener error:', err);
      });
      return listener;
    },

    /* ─────────────────────────────────────────────────────────────
       2. SUBMISSIONS (/submissions and /pretestAttempts)
    ───────────────────────────────────────────────────────────── */
    pushSubmission: async function (submissionData) {
      if (!submissionData) return null;
      const studentId = submissionData.studentId || 'STUD-001';
      const cleanStudentId = String(studentId).replace(/[.#$\[\]\/]/g, '_');

      const payload = Object.assign({}, submissionData, {
        submittedAt: submissionData.submittedAt || new Date().toISOString(),
        submitTime: submissionData.submitTime || Date.now(),
        updatedAt: new Date().toISOString()
      });

      const db = initDb();
      if (db) {
        try {
          // 1. Push to /submissions list
          const submissionsRef = db.ref('submissions');
          const newSubRef = submissionsRef.push();
          payload.submissionKey = newSubRef.key;
          await newSubRef.set(payload);

          // 2. Also set in /pretestAttempts/{cleanStudentId} for fast indexing
          await db.ref('pretestAttempts/' + cleanStudentId).set(payload);

          console.log('✅ [RIZZ Firebase] Submission pushed to /submissions and /pretestAttempts for student:', studentId);
        } catch (e) {
          console.error('[RIZZ Firebase] Error pushing submission:', e);
        }
      }
      return payload;
    },

    savePreTestAttempt: async function (studentId, attemptData) {
      if (!studentId || !attemptData) return;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('pretestAttempts/' + cleanId);
      if (ref) {
        try {
          await ref.set(attemptData);
          console.log('[RIZZ Firebase] Pre-test attempt saved to /pretestAttempts/' + cleanId);
        } catch (e) {
          console.warn('[RIZZ Firebase] Error saving pretestAttempt:', e);
        }
      }
    },

    getPreTestAttempt: async function (studentId) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('pretestAttempts/' + cleanId);
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val();
      } catch (e) {
        console.warn('[RIZZ Firebase] Error fetching pretestAttempt for ' + cleanId, e);
        return null;
      }
    },

    onPreTestAttemptChange: function (studentId, callback) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('pretestAttempts/' + cleanId);
      if (!ref) return null;
      return ref.on('value', function (snapshot) {
        const val = snapshot.val();
        if (typeof callback === 'function') {
          callback(val);
        }
      }, function (err) {
        console.warn('[RIZZ Firebase] /pretestAttempts/' + cleanId + ' listener error:', err);
      });
    },

    onSubmissions: function (callback) {
      const db = initDb();
      if (!db) return null;

      // Listen on /submissions
      const subRef = db.ref('submissions');
      subRef.on('value', function (snapshot) {
        const val = snapshot.val() || {};
        if (typeof callback === 'function') {
          callback(val);
        }
      }, function (err) {
        console.warn('[RIZZ Firebase] /submissions listener error:', err);
      });

      // Also listen on /pretestAttempts
      const attRef = db.ref('pretestAttempts');
      attRef.on('value', function (snapshot) {
        const val = snapshot.val() || {};
        if (typeof callback === 'function') {
          callback(val, true);
        }
      });
    },

    getPretestAttempts: async function () {
      const ref = getRef('pretestAttempts');
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val() || {};
      } catch (e) {
        console.warn('[RIZZ Firebase] Error fetching pretestAttempts:', e);
        return null;
      }
    },

    /* ─────────────────────────────────────────────────────────────
       3. EXAM CONFIGURATION (/examData)
    ───────────────────────────────────────────────────────────── */
    saveExamData: async function (examData) {
      const ref = getRef('examData');
      if (ref) {
        try {
          await ref.set(examData);
          console.log('[RIZZ Firebase] Exam data saved to /examData');
        } catch (e) {
          console.error('[RIZZ Firebase] Error saving exam data:', e);
        }
      }
    },

    onExamDataChange: function (callback) {
      const ref = getRef('examData');
      if (!ref) return null;
      return ref.on('value', function (snapshot) {
        const data = snapshot.val();
        if (data && typeof callback === 'function') {
          callback(data);
        }
      });
    },

    /* ─────────────────────────────────────────────────────────────
       4. STUDENT PROGRESS (/progress/{studentId})
    ───────────────────────────────────────────────────────────── */
    saveProgress: async function (studentId, progress) {
      if (!studentId || !progress) return;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('progress/' + cleanId);
      if (ref) {
        try {
          await ref.set(progress);
          console.log('[RIZZ Firebase] Progress saved to /progress/' + cleanId);
        } catch (e) {
          console.warn('[RIZZ Firebase] Error saving progress:', e);
        }
      }
    },

    getProgress: async function (studentId) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('progress/' + cleanId);
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val();
      } catch (e) {
        console.warn('[RIZZ Firebase] Error fetching progress for ' + cleanId, e);
        return null;
      }
    },

    onProgressChange: function (studentId, callback) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('progress/' + cleanId);
      if (!ref) return null;
      return ref.on('value', function (snapshot) {
        const val = snapshot.val();
        if (typeof callback === 'function') {
          callback(val);
        }
      }, function (err) {
        console.warn('[RIZZ Firebase] /progress/' + cleanId + ' listener error:', err);
      });
    },

    /* ─────────────────────────────────────────────────────────────
       5. PRACTICAL ASSESSMENTS & WORKSHOPS
    ───────────────────────────────────────────────────────────── */
    saveAssessmentAttempt: async function (studentId, attemptRecord) {
      if (!studentId || !attemptRecord) return false;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('assessmentAttempts/' + cleanId);
      if (ref) {
        try {
          await ref.set(attemptRecord);
          console.log('[RIZZ Firebase] Assessment attempt saved to /assessmentAttempts/' + cleanId);
          return true;
        } catch (e) {
          console.warn('[RIZZ Firebase] Error saving assessment attempt:', e);
          return false;
        }
      }
      return false;
    },

    saveAssessmentAttempts: async function (attemptsMap) {
      if (!attemptsMap || typeof attemptsMap !== 'object') return false;
      const ref = getRef('assessmentAttempts');
      if (ref) {
        try {
          await ref.set(attemptsMap);
          console.log('[RIZZ Firebase] Full assessment attempts map saved to /assessmentAttempts');
          return true;
        } catch (e) {
          console.warn('[RIZZ Firebase] Error saving assessment attempts map:', e);
          return false;
        }
      }
      return false;
    },

    getAssessmentAttempt: async function (studentId) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('assessmentAttempts/' + cleanId);
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val();
      } catch (e) {
        console.warn('[RIZZ Firebase] Error reading assessment attempt:', e);
        return null;
      }
    },

    onAssessmentAttemptChange: function (studentId, callback) {
      if (!studentId) return null;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('assessmentAttempts/' + cleanId);
      if (!ref) return null;
      return ref.on('value', function (snapshot) {
        const val = snapshot.val();
        if (typeof callback === 'function') callback(val);
      });
    },

    onAssessmentAttemptsChange: function (callback) {
      const ref = getRef('assessmentAttempts');
      if (!ref) return null;
      return ref.on('value', function (snapshot) {
        const val = snapshot.val() || {};
        if (typeof callback === 'function') callback(val);
      });
    },

    uploadFile: async function (storagePath, blobOrFile, onProgress) {
      const storage = initStorage();
      if (!storage) return null;
      try {
        const storageRef = storage.ref(storagePath);
        const metadata = {
          contentType: (blobOrFile && blobOrFile.type) || 'application/octet-stream'
        };
        if (typeof onProgress === 'function') {
          const uploadTask = storageRef.put(blobOrFile, metadata);
          return new Promise(function (resolve, reject) {
            uploadTask.on('state_changed', function (snapshot) {
              var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            }, function (error) {
              console.warn('[RIZZ Firebase] Storage upload error:', error);
              reject(error);
            }, async function () {
              try {
                var downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                resolve({ downloadUrl: downloadUrl, storagePath: storagePath });
              } catch (err) {
                reject(err);
              }
            });
          });
        } else {
          const snapshot = await storageRef.put(blobOrFile, metadata);
          const downloadUrl = await snapshot.ref.getDownloadURL();
          return { downloadUrl: downloadUrl, storagePath: storagePath };
        }
      } catch (err) {
        console.warn('[RIZZ Firebase] Storage upload failed:', err);
        return null;
      }
    },

    getFileDownloadUrl: async function (storagePath) {
      const storage = initStorage();
      if (!storage) return null;
      try {
        const storageRef = storage.ref(storagePath);
        return await storageRef.getDownloadURL();
      } catch (err) {
        return null;
      }
    },

    saveWorkshopCompletion: async function (topicId, completionData) {
      if (!topicId || !completionData) return;
      const cleanId = String(topicId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('workshopCompletions/' + cleanId);
      if (ref) {
        try {
          await ref.set(completionData);
        } catch (e) { }
      }
    },

    saveWorkshopChoice: async function (studentId, choice) {
      if (!studentId || !choice) return;
      const cleanId = String(studentId).replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('workshopChoices/' + cleanId);
      if (ref) {
        try {
          await ref.set(choice);
        } catch (e) { }
      }
    },

    /* ─────────────────────────────────────────────────────────────
       6. STUDENT ROSTER & CREDENTIALS (/students/{studentId})
    ───────────────────────────────────────────────────────────── */
    uploadStudents: async function (studentsArray) {
      if (!Array.isArray(studentsArray) || !studentsArray.length) {
        return { success: false, count: 0, error: 'No student records to upload.' };
      }
      const db = initDb();
      let count = 0;
      const updates = {};
      const now = new Date().toISOString();

      studentsArray.forEach(function (s) {
        if (!s) return;
        const rawId = s.studentId || s.userId || s.id || '';
        const cleanId = String(rawId).trim().replace(/[.#$\[\]\/]/g, '_');
        if (!cleanId) return;

        const record = {
          studentId: cleanId,
          name: s.name || s.studentName || '',
          password: String(s.password || '').trim(),
          status: s.status || 'active',
          email: s.email || '',
          college: s.college || '',
          phone: s.phone || '',
          role: s.role || 'student',
          updatedAt: now
        };

        updates['students/' + cleanId] = record;
        count++;
      });

      if (db) {
        try {
          await db.ref().update(updates);
          console.log(`✅ [RIZZ Firebase] Successfully uploaded ${count} students to /students`);
          return { success: true, count: count };
        } catch (e) {
          console.error('[RIZZ Firebase] Error uploading students:', e);
          return { success: false, count: count, error: e.message };
        }
      }
      return { success: true, count: count, note: 'Local fallback mode' };
    },

    getStudent: async function (studentId) {
      if (!studentId) return null;
      const cleanId = String(studentId).trim().replace(/[.#$\[\]\/]/g, '_');
      const ref = getRef('students/' + cleanId);
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val();
      } catch (e) {
        console.warn('[RIZZ Firebase] Error fetching student record for ' + cleanId, e);
        return null;
      }
    },

    getAllStudents: async function () {
      const ref = getRef('students');
      if (!ref) return null;
      try {
        const snap = await ref.once('value');
        return snap.val() || {};
      } catch (e) {
        console.warn('[RIZZ Firebase] Error fetching all students:', e);
        return null;
      }
    },

    /* ─────────────────────────────────────────────────────────────
       7. STUDENT RESET OVERRIDE (/pretestAttempts, /submissions, /assessmentAttempts, /progress, /workshopChoices)
    ───────────────────────────────────────────────────────────── */
    resetStudent: async function (studentId, studentName, email) {
      const db = initDb();
      if (!db) return { success: true, note: 'Local fallback mode' };

      const cleanId = String(studentId || '').trim().replace(/[.#$\[\]\/]/g, '_');
      const searchTerms = [cleanId, studentId, studentName, email]
        .map(function (s) { return String(s || '').trim().toLowerCase(); })
        .filter(Boolean);

      try {
        // If name/email not provided, try to look up student from /students/{cleanId}
        if (cleanId && (!studentName || !email)) {
          const sSnap = await db.ref('students/' + cleanId).once('value');
          const sVal = sSnap.val();
          if (sVal) {
            if (sVal.name && !searchTerms.includes(sVal.name.toLowerCase())) searchTerms.push(sVal.name.toLowerCase());
            if (sVal.email && !searchTerms.includes(sVal.email.toLowerCase())) searchTerms.push(sVal.email.toLowerCase());
            if (sVal.studentId && !searchTerms.includes(sVal.studentId.toLowerCase())) searchTerms.push(sVal.studentId.toLowerCase());
          }
        }

        function matchesStudentRec(key, rec) {
          const kLower = String(key || '').trim().toLowerCase();
          if (searchTerms.includes(kLower)) return true;
          if (rec && typeof rec === 'object') {
            const rId = String(rec.studentId || rec.userId || '').trim().toLowerCase();
            const rName = String(rec.studentName || rec.name || '').trim().toLowerCase();
            const rEmail = String(rec.email || '').trim().toLowerCase();
            if (rId && searchTerms.includes(rId)) return true;
            if (rName && searchTerms.includes(rName)) return true;
            if (rEmail && searchTerms.includes(rEmail)) return true;
            if (Array.isArray(rec.attempts)) {
              for (let i = 0; i < rec.attempts.length; i++) {
                const att = rec.attempts[i];
                if (att && typeof att === 'object') {
                  const aId = String(att.studentId || att.userId || '').trim().toLowerCase();
                  const aName = String(att.studentName || att.name || '').trim().toLowerCase();
                  const aEmail = String(att.email || '').trim().toLowerCase();
                  if (aId && searchTerms.includes(aId)) return true;
                  if (aName && searchTerms.includes(aName)) return true;
                  if (aEmail && searchTerms.includes(aEmail)) return true;
                }
              }
            }
          }
          return false;
        }

        // 1. Remove from /pretestAttempts/{cleanId} and check all keys in /pretestAttempts
        if (cleanId) {
          await db.ref('pretestAttempts/' + cleanId).remove();
        }
        const pretestSnap = await db.ref('pretestAttempts').once('value');
        const pretestVal = pretestSnap.val() || {};
        for (const k in pretestVal) {
          if (matchesStudentRec(k, pretestVal[k])) {
            await db.ref('pretestAttempts/' + k).remove();
          }
        }

        // 2. Remove matching records from /submissions
        const subSnap = await db.ref('submissions').once('value');
        const subVal = subSnap.val() || {};
        for (const pushKey in subVal) {
          if (matchesStudentRec(pushKey, subVal[pushKey])) {
            await db.ref('submissions/' + pushKey).remove();
          }
        }

        // 3. Remove /assessmentAttempts/{cleanId} and any matching keys in /assessmentAttempts
        if (cleanId) {
          await db.ref('assessmentAttempts/' + cleanId).remove();
        }
        const asmSnap = await db.ref('assessmentAttempts').once('value');
        const asmVal = asmSnap.val() || {};
        for (const k in asmVal) {
          if (matchesStudentRec(k, asmVal[k])) {
            await db.ref('assessmentAttempts/' + k).remove();
          }
        }

        // 4. Reset /progress for cleanId and all matching keys
        const resetProg = {
          preTestStatus: 'ready',
          preTestAttempt: null,
          evaluationStatus: 'pending',
          finalScore: null,
          suggestedTrack: null,
          suggestedCourse: null,
          chosenTrack: null,
          selectedSet: null,
          workshopStatus: 'locked',
          workshopProgress: 0,
          assessmentStatus: 'locked',
          assessmentCompleted: false,
          assessmentFinalScore: null,
          rizzScore: null,
          opportunitiesUnlocked: false,
          resultsStatus: 'locked',
          overallProgress: 0,
          updatedAt: new Date().toISOString()
        };
        if (cleanId) {
          await db.ref('progress/' + cleanId).set(resetProg);
        }
        const progSnap = await db.ref('progress').once('value');
        const progVal = progSnap.val() || {};
        for (const k in progVal) {
          if (matchesStudentRec(k, progVal[k])) {
            await db.ref('progress/' + k).set(resetProg);
          }
        }

        // 5. Remove /workshopChoices for cleanId and matching keys
        if (cleanId) {
          await db.ref('workshopChoices/' + cleanId).remove();
        }
        const choiceSnap = await db.ref('workshopChoices').once('value');
        const choiceVal = choiceSnap.val() || {};
        for (const k in choiceVal) {
          if (matchesStudentRec(k, choiceVal[k])) {
            await db.ref('workshopChoices/' + k).remove();
          }
        }

        // 6. Remove /workshopCompletions for cleanId and matching keys
        if (cleanId) {
          await db.ref('workshopCompletions/' + cleanId).remove();
        }
        const compSnap = await db.ref('workshopCompletions').once('value');
        const compVal = compSnap.val() || {};
        for (const k in compVal) {
          if (matchesStudentRec(k, compVal[k])) {
            await db.ref('workshopCompletions/' + k).remove();
          }
        }

        console.log('✅ [RIZZ Firebase] Student records cleanly reset across Firebase for:', studentId);
        return { success: true };
      } catch (err) {
        console.error('[RIZZ Firebase] Error resetting student in Firebase:', err);
        return { success: false, error: err.message };
      }
    }
  };

  // Automatically initialize on load
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function () {
      initDb();
    });
  }
})();
