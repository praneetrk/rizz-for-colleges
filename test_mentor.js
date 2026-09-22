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

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

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
          if (res && res.exceptionDetails) {
            throw new Error('CDP Eval Exception: ' + JSON.stringify(res.exceptionDetails));
          }
          return res && res.result ? res.result.value : res;
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

async function runMentorTests() {
  console.log('=== STARTING MENTOR CONSOLE TEST SUITE ===\n');
  const page = await getCDPPage();
  const client = await createCDPClient(page.webSocketDebuggerUrl);
  const results = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: SECURITY GUARD & ROLE REDIRECTS
    // -------------------------------------------------------------
    console.log('--- TEST 1: Security Guard & Access Control ---');

    // 1A: No currentUser session -> redirect to index.html
    await client.send('Page.navigate', { url: 'http://localhost:8080/STUD.html' });
    await sleep(1000);
    await client.evaluate(`
      localStorage.removeItem('currentUser');
    `);
    await client.send('Page.navigate', { url: 'http://localhost:8080/MENTOR.html' });
    await sleep(1200);
    const urlAfterNoSession = await client.evaluate(`location.href`);
    console.log('URL after no session:', urlAfterNoSession);
    const test1APassed = urlAfterNoSession.includes('index.html');

    // 1B: Student role -> redirect to STUD.html
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1000);
    await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'JAIN-001',
        name: 'Praneet Student',
        role: 'Student'
      }));
    `);
    await client.send('Page.navigate', { url: 'http://localhost:8080/MENTOR.html' });
    await sleep(1200);
    const urlAfterStudentRole = await client.evaluate(`location.href`);
    console.log('URL after student role:', urlAfterStudentRole);
    const test1BPassed = urlAfterStudentRole.includes('STUD.html');

    // 1C: Admin role -> redirect to ADMIN.html
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1000);
    await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'ADMIN-001',
        name: 'Admin User',
        role: 'Admin'
      }));
    `);
    await client.send('Page.navigate', { url: 'http://localhost:8080/MENTOR.html' });
    await sleep(1200);
    const urlAfterAdminRole = await client.evaluate(`location.href`);
    console.log('URL after admin role:', urlAfterAdminRole);
    const test1CPassed = urlAfterAdminRole.includes('ADMIN.html');

    // 1D: Mentor role -> loads MENTOR.html successfully
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1000);
    await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'MEN-001',
        name: 'Rahul Sharma',
        email: 'rahul@mentor.com',
        role: 'Mentor',
        college: 'Jain'
      }));
    `);
    await client.send('Page.navigate', { url: 'http://localhost:8080/MENTOR.html' });
    await sleep(1200);
    const urlAfterMentorRole = await client.evaluate(`location.href`);
    console.log('URL after mentor role:', urlAfterMentorRole);
    const test1DPassed = urlAfterMentorRole.includes('MENTOR.html');

    const test1Passed = test1APassed && test1BPassed && test1CPassed && test1DPassed;
    results.push({ name: 'TEST 1: Security Guard & Role Routing', passed: test1Passed, details: { test1APassed, test1BPassed, test1CPassed, test1DPassed } });

    // -------------------------------------------------------------
    // SETUP SAMPLE MULTI-MENTOR DATA
    // -------------------------------------------------------------
    console.log('\n--- Setting up Multi-Mentor Sample Scenario ---');
    await client.evaluate(`
      (() => {
        const testWorkshopData = {
          categories: [
            {
              id: 'production',
              name: 'Production',
              description: 'Designing, video editing, cinematography, creative direction & production arts.',
              icon: 'fa-solid fa-pen-ruler',
              subsets: [
                {
                  id: 'sub_designing',
                  name: 'Designing',
                  description: 'Core graphic and visual branding concepts',
                  topics: [
                    {
                      id: 'top_vis_design',
                      name: 'Visual Design Principles',
                      description: 'Color theory, grids and visual harmony',
                      hours: '10',
                      date: '2026-09-10',
                      mentor: 'Rahul Sharma',
                      mentorUserId: 'MEN-001',
                      mentorEmail: 'rahul@mentor.com'
                    },
                    {
                      id: 'top_typography',
                      name: 'Typography & Layout',
                      description: 'Font hierarchy and editorial layouts',
                      hours: '8',
                      date: '2026-09-12',
                      mentor: 'Rahul Sharma',
                      mentorUserId: 'MEN-001',
                      mentorEmail: 'rahul@mentor.com'
                    },
                    {
                      id: 'top_creative_comp',
                      name: 'Creative Composition',
                      description: 'Framing, pacing, and visual storytelling',
                      hours: '12',
                      date: '2026-09-14',
                      mentor: 'Priya Patel',
                      mentorUserId: 'MEN-002',
                      mentorEmail: 'priya@mentor.com'
                    },
                    {
                      id: 'top_design_workflow',
                      name: 'Design Workflow',
                      description: 'Asset pipeline and client delivery',
                      hours: '6',
                      date: '2026-09-16',
                      mentor: 'Priya Patel',
                      mentorUserId: 'MEN-002',
                      mentorEmail: 'priya@mentor.com'
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
              mentor: 'Rahul Sharma',
              mentorUserId: 'MEN-001',
              mentorEmail: 'rahul@mentor.com',
              subsets: [
                {
                  id: 'sub_biz_analysis',
                  name: 'Business Analysis',
                  description: 'Consulting frameworks',
                  topics: [
                    {
                      id: 'top_market_sizing',
                      name: 'Market Sizing Frameworks',
                      description: 'Top-down and bottom-up estimation',
                      hours: '15',
                      date: '2026-09-20'
                      // Inherits Track assignment to MEN-001
                    }
                  ]
                },
                {
                  id: 'sub_mkt_strategy',
                  name: 'Marketing Strategy',
                  description: 'Growth and performance',
                  topics: [
                    {
                      id: 'top_growth_loops',
                      name: 'Growth Loops',
                      description: 'Viral mechanisms and retention',
                      hours: '10',
                      date: '2026-09-22',
                      // Explicitly overrides Track assignment to MEN-002!
                      mentor: 'Priya Patel',
                      mentorUserId: 'MEN-002',
                      mentorEmail: 'priya@mentor.com'
                    }
                  ]
                }
              ]
            },
            {
              id: 'tech',
              name: 'Tech',
              description: 'Full-stack engineering & cloud.',
              icon: 'fa-solid fa-microchip',
              subsets: []
            }
          ]
        };

        localStorage.setItem('rizzWorkshopData', JSON.stringify(testWorkshopData));
        localStorage.removeItem('rizz_workshop_completions');
        return 'Multi-mentor test data initialized';
      })()
    `);

    // -------------------------------------------------------------
    // TEST 2: MENTOR 1 (Rahul Sharma - MEN-001) VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Mentor 1 (MEN-001) Filtering, Progress, & No Topic Numbers ---');
    await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'MEN-001',
        name: 'Rahul Sharma',
        email: 'rahul@mentor.com',
        role: 'Mentor',
        college: 'Jain'
      }));
      location.reload();
    `);
    await sleep(1500);

    const mentor1HomeTest = await client.evaluate(`
      (() => {
        const greeting = document.getElementById('mentorGreetingName').textContent.trim();
        const assigned = document.getElementById('metricAssignedCount').textContent.trim();
        const completed = document.getElementById('metricCompletedCount').textContent.trim();
        const remaining = document.getElementById('metricRemainingCount').textContent.trim();
        const progPercent = document.getElementById('homeProgressPercent').textContent.trim();

        return { greeting, assigned, completed, remaining, progPercent };
      })()
    `);
    console.log('Mentor 1 Home Metrics:', mentor1HomeTest);

    // Switch to My Workshops and inspect visible topics
    const mentor1WorkshopsTest = await client.evaluate(`
      (() => {
        window.switchTab('workshops');
        const container = document.getElementById('myWorkshopsContainer');
        const text = container.textContent;

        const hasVisualDesign = text.includes('Visual Design Principles');
        const hasTypography = text.includes('Typography & Layout');
        const hasCreativeComp = text.includes('Creative Composition');
        const hasDesignWorkflow = text.includes('Design Workflow');
        const hasMarketSizing = text.includes('Market Sizing Frameworks');
        const hasGrowthLoops = text.includes('Growth Loops');

        // Check for absence of numeric topic labels like "Topic 1", "Topic 2", etc.
        const topicNumberRegex = /Topic\\s+[0-9]+/i;
        const containsTopicNumbers = topicNumberRegex.test(text);

        return {
          hasVisualDesign,
          hasTypography,
          hasCreativeComp,
          hasDesignWorkflow,
          hasMarketSizing,
          hasGrowthLoops,
          containsTopicNumbers,
          onlyAssignedVisible: hasVisualDesign && hasTypography && hasMarketSizing && !hasCreativeComp && !hasDesignWorkflow && !hasGrowthLoops
        };
      })()
    `);
    console.log('Mentor 1 Workshop Visibility Check:', mentor1WorkshopsTest);

    const test2Passed = mentor1HomeTest.greeting === 'Rahul Sharma' &&
                        mentor1HomeTest.assigned === '3' &&
                        mentor1HomeTest.completed === '0' &&
                        mentor1HomeTest.remaining === '3' &&
                        mentor1WorkshopsTest.onlyAssignedVisible === true &&
                        mentor1WorkshopsTest.containsTopicNumbers === false;
    results.push({ name: 'TEST 2: Mentor 1 Filtering & No Topic Numbers', passed: test2Passed, details: { mentor1HomeTest, mentor1WorkshopsTest } });

    // -------------------------------------------------------------
    // TEST 3: TOPIC COMPLETION, PERSISTENCE, & UNDO
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Topic Completion, Persistence, & Undo ---');

    // Mark Visual Design as completed
    const markCompleteTest = await client.evaluate(`
      (() => {
        window.toggleTopicCompletion('top_vis_design', true);
        const data = getMentorAssignedHierarchy();
        return {
          completed: data.totalCompleted,
          remaining: data.totalRemaining,
          percent: data.overallPercent
        };
      })()
    `);
    console.log('After completing 1 topic:', markCompleteTest);

    // Refresh page to check persistence
    await client.evaluate(`location.reload();`);
    await sleep(1500);

    const persistedTest = await client.evaluate(`
      (() => {
        const completed = document.getElementById('metricCompletedCount').textContent.trim();
        const percent = document.getElementById('homeProgressPercent').textContent.trim();
        window.switchTab('workshops');
        const visDesignRow = Array.from(document.querySelectorAll('.topic-item-row')).find(r => r.textContent.includes('Visual Design Principles'));
        const hasCompletedBadge = visDesignRow ? visDesignRow.textContent.includes('Completed') : false;
        const hasUndoBtn = visDesignRow ? visDesignRow.textContent.includes('Undo') : false;

        return { completed, percent, hasCompletedBadge, hasUndoBtn };
      })()
    `);
    console.log('After refresh (persistence check):', persistedTest);

    // Test Undo (Mark Incomplete)
    const undoTest = await client.evaluate(`
      (() => {
        window.toggleTopicCompletion('top_vis_design', false);
        const data = getMentorAssignedHierarchy();
        return {
          completed: data.totalCompleted,
          remaining: data.totalRemaining,
          percent: data.overallPercent
        };
      })()
    `);
    console.log('After undo (incomplete check):', undoTest);

    const test3Passed = markCompleteTest.completed === 1 &&
                        persistedTest.completed === '1' &&
                        persistedTest.hasCompletedBadge === true &&
                        undoTest.completed === 0;
    results.push({ name: 'TEST 3: Topic Completion, Persistence, & Undo', passed: test3Passed, details: { markCompleteTest, persistedTest, undoTest } });

    // -------------------------------------------------------------
    // TEST 4: MENTOR 2 (Priya Patel - MEN-002) VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Mentor 2 (MEN-002) Visibility & Override Inheritance ---');
    await client.evaluate(`
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'MEN-002',
        name: 'Priya Patel',
        email: 'priya@mentor.com',
        role: 'Mentor',
        college: 'CBALC'
      }));
      location.reload();
    `);
    await sleep(1500);

    const mentor2HomeTest = await client.evaluate(`
      (() => {
        const greeting = document.getElementById('mentorGreetingName').textContent.trim();
        const assigned = document.getElementById('metricAssignedCount').textContent.trim();
        const college = document.getElementById('mentorCollegeName').textContent.trim();

        return { greeting, assigned, college };
      })()
    `);
    console.log('Mentor 2 Home Metrics:', mentor2HomeTest);

    const mentor2WorkshopsTest = await client.evaluate(`
      (() => {
        window.switchTab('workshops');
        const container = document.getElementById('myWorkshopsContainer');
        const text = container.textContent;

        const hasVisualDesign = text.includes('Visual Design Principles');
        const hasTypography = text.includes('Typography & Layout');
        const hasCreativeComp = text.includes('Creative Composition');
        const hasDesignWorkflow = text.includes('Design Workflow');
        const hasMarketSizing = text.includes('Market Sizing Frameworks');
        const hasGrowthLoops = text.includes('Growth Loops');

        return {
          hasVisualDesign,
          hasTypography,
          hasCreativeComp,
          hasDesignWorkflow,
          hasMarketSizing,
          hasGrowthLoops,
          onlyAssignedVisible: !hasVisualDesign && !hasTypography && hasCreativeComp && hasDesignWorkflow && !hasMarketSizing && hasGrowthLoops
        };
      })()
    `);
    console.log('Mentor 2 Workshop Visibility Check:', mentor2WorkshopsTest);

    const test4Passed = mentor2HomeTest.greeting === 'Priya Patel' &&
                        mentor2HomeTest.assigned === '3' &&
                        mentor2HomeTest.college === 'CBALC' &&
                        mentor2WorkshopsTest.onlyAssignedVisible === true;
    results.push({ name: 'TEST 4: Mentor 2 Filtering & Override Isolation', passed: test4Passed, details: { mentor2HomeTest, mentor2WorkshopsTest } });

    // -------------------------------------------------------------
    // TEST 5: THEME TOGGLE, PROFILE MODAL, & LOGOUT
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Theme Toggle, Profile Modal, & Logout ---');

    const themeTest = await client.evaluate(`
      (() => {
        // Toggle to dark
        applyTheme('dark');
        const isDark1 = document.documentElement.classList.contains('dark');
        const themeSaved1 = localStorage.getItem('rizz_theme');

        // Toggle to light
        applyTheme('light');
        const isDark2 = document.documentElement.classList.contains('dark');
        const themeSaved2 = localStorage.getItem('rizz_theme');

        // Profile modal
        openProfileSettingsModal();
        const modal = document.getElementById('modalProfileSettings');
        const modalActive = modal && modal.classList.contains('active');
        closeModal('modalProfileSettings');

        return {
          isDark1, themeSaved1,
          isDark2, themeSaved2,
          modalActive
        };
      })()
    `);
    console.log('Theme & Modal Check:', themeTest);

    // Test Logout
    await client.evaluate(`
      handleLogout();
    `);
    await sleep(1200);
    const urlAfterLogout = await client.evaluate(`location.href`);
    const sessionCleared = await client.evaluate(`!localStorage.getItem('currentUser')`);
    console.log('URL after logout:', urlAfterLogout, 'Session cleared:', sessionCleared);

    const test5Passed = themeTest.isDark1 === true && themeTest.themeSaved1 === 'dark' &&
                        themeTest.isDark2 === false && themeTest.themeSaved2 === 'light' &&
                        themeTest.modalActive === true &&
                        urlAfterLogout.includes('index.html') && sessionCleared;
    results.push({ name: 'TEST 5: Theme, Modals, & Logout Flow', passed: test5Passed, details: { themeTest, urlAfterLogout, sessionCleared } });

  } catch (err) {
    console.error('Test error:', err);
    results.push({ name: 'TEST SUITE RUNNER', passed: false, error: err.message });
  } finally {
    client.close();
  }

  console.log('\n================== MENTOR TEST SUMMARY ==================');
  let allPass = true;
  results.forEach(r => {
    const status = r.passed ? 'PASSED [OK]' : 'FAILED [X]';
    if (!r.passed) allPass = false;
    console.log(status + ' - ' + r.name);
  });
  console.log('========================================================');
  console.log('Overall Status:', allPass ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED');
}

runMentorTests();
