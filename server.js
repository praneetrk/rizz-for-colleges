require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.zip': 'application/zip',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sanitizeKey(key) {
  return String(key || '').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

const server = http.createServer((req, res) => {
  // Common CORS headers
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };

  if (req.method === 'OPTIONS') {
    setCors();
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURI(parsedUrl.pathname);

  /* ─────────────────────────────────────────────────────────────
     HEALTH ENDPOINT
  ───────────────────────────────────────────────────────────── */
  if (pathname === '/api/health' && req.method === 'GET') {
    setCors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', serverTime: new Date().toISOString() }));
    return;
  }

  /* ─────────────────────────────────────────────────────────────
     JSON STORAGE HELPERS
  ───────────────────────────────────────────────────────────── */
  function readJsonFile(fileName, defaultVal) {
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!fs.existsSync(filePath)) return defaultVal;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function writeJsonFile(fileName, data) {
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(text ? JSON.parse(text) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     DATA SYNC API ROUTES (Pre-Test, Assessment, Workshop, Progress)
  ───────────────────────────────────────────────────────────── */
  if (pathname === '/api/sync/all' && req.method === 'GET') {
    setCors();
    const data = {
      pretestAttempts: readJsonFile('pretest_attempts.json', {}),
      assessmentAttempts: readJsonFile('assessment_attempts.json', {}),
      workshopCompletions: readJsonFile('workshop_completions.json', {}),
      workshopChoices: readJsonFile('workshop_choices.json', {}),
      progress: readJsonFile('progress_data.json', {}),
      examData: readJsonFile('exam_data.json', null),
      workshopData: readJsonFile('workshop_data.json', null),
      assessmentData: readJsonFile('assessment_data.json', null),
      serverTime: new Date().toISOString()
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // Pre-Test Attempts
  if (pathname === '/api/pretest/attempts') {
    setCors();
    if (req.method === 'GET') {
      const attempts = readJsonFile('pretest_attempts.json', {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, attempts }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        let attempts = readJsonFile('pretest_attempts.json', {});
        if (payload.attempts && typeof payload.attempts === 'object') {
          attempts = payload.attempts;
        }
        if (payload.studentId && payload.attempt) {
          attempts[payload.studentId] = payload.attempt;
        }
        writeJsonFile('pretest_attempts.json', attempts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, attempts }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Assessment Attempts
  if (pathname === '/api/assessment/attempts') {
    setCors();
    if (req.method === 'GET') {
      const attempts = readJsonFile('assessment_attempts.json', {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, attempts }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        let attempts = readJsonFile('assessment_attempts.json', {});
        if (payload.attemptsMap && typeof payload.attemptsMap === 'object') {
          attempts = payload.attemptsMap;
        }
        if (payload.studentId && payload.record) {
          attempts[payload.studentId] = payload.record;
        }
        writeJsonFile('assessment_attempts.json', attempts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, attempts }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Workshop Completions
  if (pathname === '/api/workshop/completions') {
    setCors();
    if (req.method === 'GET') {
      const completions = readJsonFile('workshop_completions.json', {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, completions }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        const completions = readJsonFile('workshop_completions.json', {});
        if (payload.completions && typeof payload.completions === 'object') {
          Object.assign(completions, payload.completions);
        }
        if (payload.topicId && payload.completion) {
          completions[payload.topicId] = payload.completion;
        }
        writeJsonFile('workshop_completions.json', completions);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, completions }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Workshop Choices
  if (pathname === '/api/workshop/choices') {
    setCors();
    if (req.method === 'GET') {
      const choices = readJsonFile('workshop_choices.json', {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, choices }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        const choices = readJsonFile('workshop_choices.json', {});
        if (payload.choices && typeof payload.choices === 'object') {
          Object.assign(choices, payload.choices);
        }
        if (payload.studentId && payload.choice) {
          choices[payload.studentId] = payload.choice;
        }
        writeJsonFile('workshop_choices.json', choices);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, choices }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Student Progress
  if (pathname.startsWith('/api/progress/')) {
    setCors();
    const userId = sanitizeKey(pathname.replace('/api/progress/', ''));
    if (req.method === 'GET') {
      const progressData = readJsonFile('progress_data.json', {});
      const prog = progressData[userId] || null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, progress: prog }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        const progressData = readJsonFile('progress_data.json', {});
        progressData[userId] = payload.progress || payload;
        writeJsonFile('progress_data.json', progressData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, progress: progressData[userId] }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Exam Data / Config
  if (pathname === '/api/exam-data') {
    setCors();
    if (req.method === 'GET') {
      const examData = readJsonFile('exam_data.json', null);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, examData }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        writeJsonFile('exam_data.json', payload.examData || payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Workshop Data / Syllabus
  if (pathname === '/api/workshop-data') {
    setCors();
    if (req.method === 'GET') {
      const workshopData = readJsonFile('workshop_data.json', null);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, workshopData }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        writeJsonFile('workshop_data.json', payload.workshopData || payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Assessment Data / Configs
  if (pathname === '/api/assessment-data') {
    setCors();
    if (req.method === 'GET') {
      const assessmentData = readJsonFile('assessment_data.json', null);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, assessmentData }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req).then(payload => {
        writeJsonFile('assessment_data.json', payload.assessmentData || payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }).catch(err => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }
  }

  // Reset Student
  if (pathname === '/api/reset-student' && req.method === 'POST') {
    setCors();
    parseJsonBody(req).then(payload => {
      const rawId = payload.studentId || '';
      const rawName = payload.studentName || '';
      const rawEmail = payload.email || '';

      const searchTerms = [rawId, rawName, rawEmail]
        .map(s => String(s || '').trim().toLowerCase())
        .filter(Boolean);

      if (!searchTerms.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing studentId or identifier' }));
        return;
      }

      function matchesStudent(key, record) {
        const kLower = String(key || '').trim().toLowerCase();
        if (searchTerms.includes(kLower)) return true;
        if (record && typeof record === 'object') {
          const rId = String(record.studentId || record.userId || '').trim().toLowerCase();
          const rName = String(record.studentName || record.name || '').trim().toLowerCase();
          const rEmail = String(record.email || '').trim().toLowerCase();
          if (rId && searchTerms.includes(rId)) return true;
          if (rName && searchTerms.includes(rName)) return true;
          if (rEmail && searchTerms.includes(rEmail)) return true;
          if (Array.isArray(record.attempts)) {
            for (let i = 0; i < record.attempts.length; i++) {
              const att = record.attempts[i];
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

      // 1. Remove from pretest attempts
      const pretest = readJsonFile('pretest_attempts.json', {});
      for (const k in pretest) {
        if (matchesStudent(k, pretest[k])) {
          delete pretest[k];
        }
      }
      writeJsonFile('pretest_attempts.json', pretest);

      // 2. Remove from assessment attempts and delete associated files
      const asm = readJsonFile('assessment_attempts.json', {});
      for (const k in asm) {
        if (matchesStudent(k, asm[k])) {
          const attemptsList = (asm[k] && asm[k].attempts) || [];
          attemptsList.forEach(att => {
            if (att && att.submissions) {
              ['finalPng', 'finalPdf', 'finalVideo', 'sourceZip', 'explanationVideo', 'selfVideo'].forEach(field => {
                if (att.submissions[field] && att.submissions[field].fileKey) {
                  const fKey = sanitizeKey(att.submissions[field].fileKey);
                  const fPath = path.join(UPLOADS_DIR, fKey);
                  const mPath = path.join(UPLOADS_DIR, fKey + '.meta.json');
                  try { if (fs.existsSync(fPath)) fs.unlinkSync(fPath); } catch (e) {}
                  try { if (fs.existsSync(mPath)) fs.unlinkSync(mPath); } catch (e) {}
                }
              });
            }
          });
          delete asm[k];
        }
      }
      writeJsonFile('assessment_attempts.json', asm);

      // 3. Remove workshop choice
      const choices = readJsonFile('workshop_choices.json', {});
      for (const k in choices) {
        if (matchesStudent(k, choices[k] || { studentId: k })) {
          delete choices[k];
        }
      }
      writeJsonFile('workshop_choices.json', choices);

      // 3b. Remove student workshop completions
      const completions = readJsonFile('workshop_completions.json', {});
      let completionsChanged = false;
      for (const k in completions) {
        if (matchesStudent(k, completions[k])) {
          delete completions[k];
          completionsChanged = true;
        }
      }
      if (completionsChanged) {
        writeJsonFile('workshop_completions.json', completions);
      }

      // 4. Reset progress
      const progress = readJsonFile('progress_data.json', {});
      for (const k in progress) {
        if (matchesStudent(k, progress[k])) {
          delete progress[k];
        }
      }
      const defaultResetProg = {
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
      const safePrimaryId = sanitizeKey(rawId || rawName || 'STUD-001');
      progress[safePrimaryId] = Object.assign({}, defaultResetProg);
      if (rawId && sanitizeKey(rawId) !== safePrimaryId) {
        progress[sanitizeKey(rawId)] = Object.assign({}, defaultResetProg);
      }
      writeJsonFile('progress_data.json', progress);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, studentId: rawId, searchTerms }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Reset failed: ' + err.message }));
    });
    return;
  }

  /* ─────────────────────────────────────────────────────────────
     API ROUTES: /api/upload, /api/files/:key, /api/files/check/:key
  ───────────────────────────────────────────────────────────── */
  if (pathname === '/api/upload' && req.method === 'POST') {
    setCors();
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', () => {
      try {
        const bodyText = Buffer.concat(bodyChunks).toString('utf8');
        const payload = JSON.parse(bodyText);
        const { key, name, type, size, data } = payload;
        if (!key || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing key or data' }));
          return;
        }

        const safeKey = sanitizeKey(key);
        const targetPath = path.join(UPLOADS_DIR, safeKey);
        const metaPath = path.join(UPLOADS_DIR, safeKey + '.meta.json');

        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(targetPath, buffer);
        fs.writeFileSync(metaPath, JSON.stringify({
          key: safeKey,
          name: name || 'file',
          type: type || 'application/octet-stream',
          size: size || buffer.length,
          uploadedAt: new Date().toISOString()
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          key: safeKey,
          url: `/api/files/${safeKey}`,
          size: buffer.length
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upload failed: ' + err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/files/check/') && req.method === 'GET') {
    setCors();
    const fileKey = sanitizeKey(pathname.replace('/api/files/check/', ''));
    const filePath = path.join(UPLOADS_DIR, fileKey);
    const exists = fs.existsSync(filePath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ exists, key: fileKey }));
    return;
  }

  if (pathname.startsWith('/api/files/') && req.method === 'GET') {
    setCors();
    const fileKey = sanitizeKey(pathname.replace('/api/files/', ''));
    const filePath = path.join(UPLOADS_DIR, fileKey);
    const metaPath = path.join(UPLOADS_DIR, fileKey + '.meta.json');

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    let meta = {};
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
    }

    const contentType = meta.type || MIME_TYPES[path.extname(meta.name || fileKey).toLowerCase()] || 'application/octet-stream';
    const fileName = meta.name || fileKey;

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  if (pathname.startsWith('/api/files/') && req.method === 'DELETE') {
    setCors();
    const fileKey = sanitizeKey(pathname.replace('/api/files/', ''));
    const filePath = path.join(UPLOADS_DIR, fileKey);
    const metaPath = path.join(UPLOADS_DIR, fileKey + '.meta.json');

    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    if (fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch (e) {}
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, key: fileKey }));
    return;
  }

  /* ─────────────────────────────────────────────────────────────
     STATIC FILE SERVING
  ───────────────────────────────────────────────────────────── */
  let reqPath = pathname;
  if (reqPath === '/') reqPath = '/index.html';
  
  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 RIZZ for Colleges Server running at http://localhost:${PORT}/`);
    console.log(`📁 Uploads Directory: ${UPLOADS_DIR}`);
    console.log(`🔒 Evaluation: Deterministic MCQ Pre-Test & Human Assessment`);
    console.log(`====================================================`);
  });
}

module.exports = {
  server,
  PORT,
  UPLOADS_DIR
};
