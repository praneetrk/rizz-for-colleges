const http = require('http');

async function getCDPPage() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
        if (!page) reject(new Error('No debuggable page found'));
        else resolve(page);
      });
    }).on('error', reject);
  });
}

function createCDPClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onopen = () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = msgId++;
            callbacks.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        async evaluate(expr) {
          const res = await this.send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
          });
          if (res.result.exceptionDetails) {
            throw new Error('CDP Eval Exception: ' + JSON.stringify(res.result.exceptionDetails));
          }
          return res.result.result.value;
        },
        close() {
          ws.close();
        }
      });
    };
    ws.onerror = reject;
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log('=== STARTING AUTOMATED TEST SUITE FOR RIZZ FOR COLLEGES ===\n');
  const page = await getCDPPage();
  console.log('Connecting to page:', page.title, page.url);
  const client = await createCDPClient(page.webSocketDebuggerUrl);

  const results = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: MCQ SELECTION & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Student Pre-Test MCQ Selection & Persistence ---');
    // Navigate to STUD.html
    await client.send('Page.navigate', { url: 'http://localhost:8080/STUD.html' });
    await sleep(1500);

    // Setup student session in localStorage
    const setupStudent = await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'JAIN-001',
        name: 'Praneet',
        email: 'praneet@college.edu',
        role: 'student',
        college: 'Jain'
      }));
      // Reset attempts for a clean test
      const attempts = {};
      localStorage.setItem('rizz_pretest_attempts', JSON.stringify(attempts));
      localStorage.removeItem('rizz_progress_JAIN-001');
      location.reload();
      'Student setup done';
    `);
    console.log('Setup student:', setupStudent);
    await sleep(1500);

    // Start pre-test
    const startRes = await client.evaluate(`
      (async () => {
        window.switchTab('pretest');
        await window.startPreTestExam();
        return 'Exam started: ' + (activeExamState && activeExamState.questions ? activeExamState.questions.length : 0) + ' questions';
      })()
    `);
    console.log(startRes);
    await sleep(500);

    // Question 1 MCQ selection tests
    const q1Tests = await client.evaluate(`
      (() => {
        const q = activeExamState.questions[0];
        if (q.type !== 'mcq') return { error: 'Q1 is not MCQ' };

        // Test clicking A
        window.selectMCQOption(q.id, 'A');
        const ansA = (getStudentAttempt('JAIN-001') || {}).answers[q.id];
        const cardA = document.querySelector('.option-card.selected .option-badge');
        const textA = cardA ? cardA.textContent.trim() : null;

        // Test clicking B
        window.selectMCQOption(q.id, 'B');
        const ansB = (getStudentAttempt('JAIN-001') || {}).answers[q.id];
        const cardB = document.querySelector('.option-card.selected .option-badge');
        const textB = cardB ? cardB.textContent.trim() : null;

        // Test clicking C
        window.selectMCQOption(q.id, 'C');
        const ansC = (getStudentAttempt('JAIN-001') || {}).answers[q.id];

        // Test clicking D
        window.selectMCQOption(q.id, 'D');
        const ansD = (getStudentAttempt('JAIN-001') || {}).answers[q.id];

        // Settle on B
        window.selectMCQOption(q.id, 'B');
        const ansFinal = (getStudentAttempt('JAIN-001') || {}).answers[q.id];

        // Go to next question
        window.goToNextQuestion();
        const q2 = activeExamState.questions[1];
        if (q2.type === 'mcq') {
          window.selectMCQOption(q2.id, 'A');
        }

        // Return to previous question
        window.goToPrevQuestion();
        const cardPrev = document.querySelector('.option-card.selected .option-badge');
        const cardPrevBadge = cardPrev ? cardPrev.textContent.trim() : null;
        const savedAnsPrev = (getStudentAttempt('JAIN-001') || {}).answers[q.id];

        return {
          ansA, textA,
          ansB, textB,
          ansC,
          ansD,
          ansFinal,
          persistedAfterNav: cardPrevBadge === 'B' && savedAnsPrev === 'B',
          cardPrevBadge,
          savedAnsPrev
        };
      })()
    `);
    console.log('Q1 MCQ Click & Nav Results:', q1Tests);

    const test1Passed = q1Tests.ansA === 'A' && q1Tests.textA === 'A' &&
                        q1Tests.ansB === 'B' && q1Tests.textB === 'B' &&
                        q1Tests.ansC === 'C' && q1Tests.ansD === 'D' &&
                        q1Tests.persistedAfterNav === true;
    results.push({ name: 'TEST 1: Pre-Test MCQ Selection & Persistence', passed: test1Passed, details: q1Tests });

    // Complete Pre-Test answers and submit
    console.log('\n--- Submitting Pre-Test ---');
    const submitResult = await client.evaluate(`
      (() => {
        const att = getStudentAttempt('JAIN-001');
        activeExamState.questions.forEach((q, idx) => {
          if (q.type === 'mcq') {
            att.answers[q.id] = (idx % 2 === 0) ? 'B' : 'A';
          } else {
            att.answers[q.id] = 'Comprehensive answer explaining the core design thinking, architecture, and business strategies.';
          }
        });
        saveStudentAttempt(att);
        submitPreTest(false);
        const submittedAtt = getStudentAttempt('JAIN-001');
        return { status: submittedAtt.status, mcqScore: submittedAtt.mcqScore, totalAnswered: Object.keys(submittedAtt.answers).length };
      })()
    `);
    console.log('Pre-Test Submission result:', submitResult);

    // -------------------------------------------------------------
    // TEST 2: ADMIN NAVIGATION & SIDEBAR STRUCTURE
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Admin Navigation & Sidebar Structure ---');
    await client.send('Page.navigate', { url: 'http://localhost:8080/ADMIN.html' });
    await sleep(1500);

    const adminNav = await client.evaluate(`
      (() => {
        const navItems = Array.from(document.querySelectorAll('.nav-section .nav-item')).map(el => {
          const text = el.querySelector('span') ? el.querySelector('span').textContent.trim() : el.textContent.trim();
          const page = el.getAttribute('data-page');
          return { text, page };
        });

        const hasHome = navItems.some(i => i.page === 'home');
        const hasWorkshops = navItems.some(i => i.page === 'workshops');
        const hasExam = navItems.some(i => i.page === 'exam-management');
        const hasEvaluationMain = navItems.some(i => i.page === 'evaluation');
        const hasStudentMgmt = navItems.some(i => i.page === 'student-management');

        // Verify Evaluation is NOT in exam-subnav
        const examSubnav = document.getElementById('exam-subnav');
        const evalInExamSubnav = examSubnav ? Array.from(examSubnav.querySelectorAll('.subnav-item')).some(i => i.getAttribute('data-page') === 'evaluation') : false;

        return {
          navItems,
          hasHome,
          hasWorkshops,
          hasExam,
          hasEvaluationMain,
          hasStudentMgmt,
          evalNotInSubnav: !evalInExamSubnav
        };
      })()
    `);
    console.log('Admin Sidebar Check:', adminNav);
    const test2Passed = adminNav.hasHome && adminNav.hasWorkshops && adminNav.hasExam &&
                        adminNav.hasEvaluationMain && adminNav.hasStudentMgmt && adminNav.evalNotInSubnav;
    results.push({ name: 'TEST 2: Admin Sidebar Navigation', passed: test2Passed, details: adminNav });

    // -------------------------------------------------------------
    // TEST 3 & 4: ADMIN EVALUATION PUBLISH & WORKSHOP SYLLABUS CONNECTION
    // -------------------------------------------------------------
    console.log('\n--- TEST 3 & 4: Admin Evaluation Publish & Workshop Syllabus Connection ---');
    const evalAndPublish = await client.evaluate(`
      (() => {
        // Switch to Evaluation
        window.activatePage('evaluation');
        // Finalize student JAIN-001
        const attempts = JSON.parse(localStorage.getItem('rizz_pretest_attempts') || '{}');
        const att = attempts['JAIN-001'];
        if (att) {
          att.status = 'Published';
          att.published = true;
          att.adminFinalSuggestion = 'Production';
          att.suggestedCourse = 'Production';
          attempts['JAIN-001'] = att;
          localStorage.setItem('rizz_pretest_attempts', JSON.stringify(attempts));
        }

        // Also ensure Admin Workshop has custom topic with Hours, Mentor, Date
        const wsKey = 'rizzWorkshopData';
        let wsData = JSON.parse(localStorage.getItem(wsKey) || 'null');
        if (!wsData || !wsData.categories) {
          wsData = {
            categories: [
              {
                id: 'production',
                name: 'Production',
                description: 'Designing, video editing, cinematography, creative direction & production arts.',
                icon: 'fa-solid fa-pen-ruler',
                subsets: [
                  {
                    name: 'Designing',
                    topics: [
                      {
                        name: 'Visual Identity & Branding',
                        hours: '15',
                        mentor: 'Rahul Sharma',
                        date: '2026-09-15',
                        description: 'Core principles of branding and visual identity.'
                      }
                    ]
                  }
                ]
              },
              {
                id: 'strategy',
                name: 'Strategy',
                description: 'Business analysis, consulting frameworks & strategic planning.',
                icon: 'fa-solid fa-chess',
                subsets: []
              },
              {
                id: 'tech',
                name: 'Tech',
                description: 'Full-stack engineering, cloud architecture & systems.',
                icon: 'fa-solid fa-microchip',
                subsets: []
              }
            ]
          };
          localStorage.setItem(wsKey, JSON.stringify(wsData));
        } else {
          // Add subset to production
          const prod = wsData.categories.find(c => c.id === 'production');
          if (prod) {
            prod.subsets = [
              {
                name: 'Designing',
                topics: [
                  {
                    name: 'Visual Identity & Branding',
                    hours: '15',
                    mentor: 'Rahul Sharma',
                    date: '2026-09-15',
                    description: 'Core principles of branding and visual identity.'
                  }
                ]
              }
            ];
            localStorage.setItem(wsKey, JSON.stringify(wsData));
          }
        }

        return {
          published: att ? att.status : null,
          wsProductionSubsets: wsData.categories.find(c => c.id === 'production').subsets.length
        };
      })()
    `);
    console.log('Eval & Workshop setup:', evalAndPublish);

    // -------------------------------------------------------------
    // TEST 5: STUDENT WORKSHOP UNLOCKED & 3 CARDS & SYLLABUS CONNECTION
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Student Workshop Unlocked & Course Selection ---');
    await client.send('Page.navigate', { url: 'http://localhost:8080/STUD.html' });
    await sleep(1500);

    const workshopTest = await client.evaluate(`
      (() => {
        // Verify unlocked
        const unlocked = isWorkshopUnlocked('JAIN-001');
        window.switchTab('workshop');

        // Check 3 cards
        const cards = Array.from(document.querySelectorAll('.workshop-track-card'));
        const cardTitles = cards.map(c => c.querySelector('h3') ? c.querySelector('h3').textContent.trim() : '');
        const prodCard = cards.find(c => (c.querySelector('h3') ? c.querySelector('h3').textContent.trim() : '') === 'Production');
        const prodIcon = prodCard ? prodCard.querySelector('i').className : '';

        // Inspect Production
        window.inspectWorkshopCategory('production');
        const syllabusText = document.getElementById('workshop-dynamic-container').textContent;
        const hasDesigning = syllabusText.includes('Designing');
        const hasTopic = syllabusText.includes('Visual Identity & Branding');
        const hasMentor = syllabusText.includes('Rahul Sharma');
        const hasHours = syllabusText.includes('15 hrs') || syllabusText.includes('15');

        // Inspect Strategy and Tech then back
        window.inspectWorkshopCategory('strategy');
        const hasStrategy = document.getElementById('workshop-dynamic-container').textContent.includes('Strategy');
        window.inspectWorkshopCategory('tech');
        const hasTech = document.getElementById('workshop-dynamic-container').textContent.includes('Tech');
        window.inspectWorkshopCategory('production');

        // Choose course
        window.promptCourseSelection('Production');
        const modal = document.getElementById('modalConfirmCourseSelection');
        const modalVisible = modal && modal.classList.contains('active');
        const modalWarning = modal ? modal.textContent.includes('Once selected, this choice cannot be changed unless an Admin resets') : false;

        // Commit selection
        window.commitCourseSelection();

        // Verify focused view
        const chosenProg = getStudentProgress('JAIN-001');
        const startBtn = document.getElementById('btn-start-course');
        const chooseBtn = document.querySelector('button[onclick*=\"promptCourseSelection\"]');

        // Check Home tab reflection
        window.switchTab('home');
        const journeyStep2 = document.querySelector('.journey-step-card:nth-child(2)');
        const step2Text = journeyStep2 ? journeyStep2.textContent : '';

        return {
          unlocked,
          cardCount: cards.length,
          cardTitles,
          prodIcon,
          hasDesigning,
          hasTopic,
          hasMentor,
          hasHours,
          hasStrategy,
          hasTech,
          modalVisible,
          modalWarning,
          chosenTrack: chosenProg.chosenTrack,
          hasStartBtn: !!startBtn,
          noStartBtn: !startBtn,
          noChooseBtn: !chooseBtn,
          homeReflectsTrack: step2Text.includes('Production')
        };
      })()
    `);
    console.log('Student Workshop Test Result:', workshopTest);
    const test5Passed = workshopTest.unlocked &&
                        workshopTest.cardCount === 3 &&
                        workshopTest.cardTitles.includes('Production') &&
                        workshopTest.cardTitles.includes('Strategy') &&
                        workshopTest.cardTitles.includes('Tech') &&
                        workshopTest.prodIcon.includes('fa-pen-ruler') &&
                        workshopTest.hasDesigning &&
                        workshopTest.hasTopic &&
                        workshopTest.hasMentor &&
                        workshopTest.modalVisible &&
                        workshopTest.modalWarning &&
                        workshopTest.chosenTrack === 'Production' &&
                        workshopTest.noStartBtn &&
                        workshopTest.noChooseBtn &&
                        workshopTest.homeReflectsTrack;
    results.push({ name: 'TEST 5: Student Workshop & Course Selection', passed: test5Passed, details: workshopTest });

    // -------------------------------------------------------------
    // TEST 6: ADMIN STUDENT MANAGEMENT VIEW & RESET
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Admin Student Management View & Filter ---');
    await client.send('Page.navigate', { url: 'http://localhost:8080/ADMIN.html' });
    await sleep(1500);

    const studentMgmtTest = await client.evaluate(`
      (() => {
        window.activatePage('student-management');
        const rows = Array.from(document.querySelectorAll('#student-mgmt-tbody tr'));
        const studentRow = rows.find(r => r.textContent.includes('Praneet') || r.textContent.includes('JAIN-001'));
        const chosenSetCell = studentRow ? studentRow.children[2].textContent.trim() : '';

        // Test college filter options
        const collegeSelect = document.getElementById('student-mgmt-college-filter');
        const colleges = Array.from(collegeSelect.options).map(o => o.value);

        // Test Search
        const searchInput = document.getElementById('student-mgmt-search');
        searchInput.value = 'Praneet';
        filterAndRenderStudentRows();
        const filteredRows = Array.from(document.querySelectorAll('#student-mgmt-tbody tr'));

        return {
          totalRows: rows.length,
          foundStudent: !!studentRow,
          chosenSetCell,
          colleges,
          filteredCount: filteredRows.length
        };
      })()
    `);
    console.log('Admin Student Mgmt Result:', studentMgmtTest);
    const test6Passed = studentMgmtTest.foundStudent &&
                        studentMgmtTest.chosenSetCell.includes('Production') &&
                        studentMgmtTest.colleges.includes('Jain') &&
                        studentMgmtTest.filteredCount >= 1;
    results.push({ name: 'TEST 6: Admin Student Management Table & Filter', passed: test6Passed, details: studentMgmtTest });

    // -------------------------------------------------------------
    // TEST 7: ADMIN RESET WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Admin Student Reset Workflow ---');
    const resetTest = await client.evaluate(`
      (() => {
        // Open reset modal for Praneet
        window.openResetStudentModal('JAIN-001', 'Praneet');
        const modal = document.getElementById('modal-reset-student');
        const modalOpen = modal && modal.classList.contains('active');
        const modalDesc = modal ? modal.textContent : '';
        const mentionsIntactCredentials = modalDesc.includes('account details and login credentials will not be changed') || modalDesc.includes('login credentials');

        // Confirm reset
        window.executeStudentReset();

        // Check attempts and progress
        const attempts = JSON.parse(localStorage.getItem('rizz_pretest_attempts') || '{}');
        const attCleared = !attempts['JAIN-001'];
        const prog = JSON.parse(localStorage.getItem('rizz_progress_JAIN-001') || '{}');

        // Check row after reset
        const rows = Array.from(document.querySelectorAll('#student-mgmt-tbody tr'));
        const praneetRow = rows.find(r => r.textContent.includes('Praneet'));
        const resetChosenCell = praneetRow ? praneetRow.children[2].textContent.trim() : '';

        return {
          modalOpen,
          mentionsIntactCredentials,
          attCleared,
          progReset: prog.preTestStatus === 'ready' && prog.workshopStatus === 'locked' && prog.chosenTrack === null,
          resetChosenCell
        };
      })()
    `);
    console.log('Admin Reset Test Result:', resetTest);
    const test7Passed = resetTest.modalOpen &&
                        resetTest.mentionsIntactCredentials &&
                        resetTest.attCleared &&
                        resetTest.progReset &&
                        resetTest.resetChosenCell.includes('Not Chosen');
    results.push({ name: 'TEST 7: Admin Student Reset & State Clearing', passed: test7Passed, details: resetTest });

    // -------------------------------------------------------------
    // TEST 8: VERIFY RESET ON STUDENT CONSOLE & CREDENTIALS INTACT
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Verify Student Console After Reset & Credentials Intact ---');
    await client.send('Page.navigate', { url: 'http://localhost:8080/STUD.html' });
    await sleep(1500);

    const postResetStudent = await client.evaluate(`
      (() => {
        const unlockedAfterReset = isWorkshopUnlocked('JAIN-001');
        const prog = getStudentProgress('JAIN-001');
        const journeyStep1 = document.querySelector('.journey-step-card:nth-child(1)');
        const step1Badge = journeyStep1 ? journeyStep1.querySelector('.step-badge').textContent.trim() : '';
        const journeyStep2 = document.querySelector('.journey-step-card:nth-child(2)');
        const step2Badge = journeyStep2 ? journeyStep2.querySelector('.step-badge').textContent.trim() : '';

        // Check user credentials in session
        const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');

        return {
          unlockedAfterReset,
          chosenTrack: prog.chosenTrack,
          step1Badge,
          step2Badge,
          userEmail: cu.email,
          userId: cu.userId,
          userName: cu.name,
          userCollege: cu.college
        };
      })()
    `);
    console.log('Post Reset Student Console Result:', postResetStudent);
    const test8Passed = postResetStudent.unlockedAfterReset === false &&
                        postResetStudent.chosenTrack === null &&
                        postResetStudent.step2Badge === 'Locked' &&
                        postResetStudent.userEmail === 'praneet@college.edu' &&
                        postResetStudent.userId === 'JAIN-001';
    results.push({ name: 'TEST 8: Reset Student Verification & Credentials Intact', passed: test8Passed, details: postResetStudent });

  } catch (err) {
    console.error('Test execution error:', err);
    results.push({ name: 'TEST EXECUTION RUNNER', passed: false, error: err.message });
  } finally {
    client.close();
  }

  console.log('\n================== TEST SUMMARY ==================');
  let allPass = true;
  results.forEach(r => {
    const status = r.passed ? 'PASSED [OK]' : 'FAILED [X]';
    if (!r.passed) allPass = false;
    console.log(status + ' - ' + r.name);
  });
  console.log('==================================================');
  console.log('Overall Status:', allPass ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED');
}

runTests();
