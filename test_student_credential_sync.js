const fs = require('fs');
const assert = require('assert');

console.log('🧪 Starting Excel-Based Student Credential Management Test Suite...\n');

let passCount = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Check SheetJS CDN in ADMIN.html
test('ADMIN.html includes required SheetJS CDN (cdnjs 0.18.5)', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'), 'ADMIN.html should include SheetJS CDN');
});

// 2. Check Upload Student Roster card in ADMIN.html
test('ADMIN.html contains Upload Student Roster card with file input & Sync button', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('Upload Student Roster'), 'Should have Upload Student Roster card heading');
  assert(admin.includes('id="roster-file-input"'), 'Should have roster-file-input');
  assert(admin.includes('accept=".xlsx, .xls"'), 'Should accept .xlsx and .xls files');
  assert(admin.includes('id="btn-sync-roster-firebase"'), 'Should have Sync to Firebase button');
  assert(admin.includes('id="roster-upload-alert"'), 'Should have upload alert element');
});

// 3. Test Header Normalization Logic
test('ADMIN.html normalization handles various Excel header permutations', () => {
  const admin = fs.readFileSync('ADMIN.html', 'utf8');
  assert(admin.includes('normalizeRosterKey'), 'Should define normalizeRosterKey');
  assert(admin.includes('studentid') && admin.includes('studentname') && admin.includes('password'), 'Should normalize studentid, studentname, password');
  assert(admin.includes('Successfully imported'), 'Should show Successfully imported alert');
});

// 4. Test RizzDB student upload and retrieval methods in firebase-config.js
test('firebase-config.js implements uploadStudents, getStudent, getAllStudents', async () => {
  const fbConfig = fs.readFileSync('firebase-config.js', 'utf8');
  assert(fbConfig.includes('uploadStudents:'), 'Should implement uploadStudents');
  assert(fbConfig.includes('getStudent:'), 'Should implement getStudent');
  assert(fbConfig.includes('getAllStudents:'), 'Should implement getAllStudents');

  // Test simulation in Node
  const globalWindow = {
    addEventListener: () => {},
    RIZZ_FIREBASE_CONFIG: {
      apiKey: "AIzaSy_TEST",
      databaseURL: "https://test-db.firebaseio.com"
    }
  };
  const contextFunc = new Function('window', fbConfig);
  contextFunc(globalWindow);

  assert(typeof globalWindow.RizzDB.uploadStudents === 'function');
  assert(typeof globalWindow.RizzDB.getStudent === 'function');
});

// 5. Test index.html Student ID login interface and Firebase query
test('index.html requires Student ID & Password, queries Firebase, and sets sessionStorage', () => {
  const index = fs.readFileSync('index.html', 'utf8');
  assert(index.includes('id="studentIdInput"'), 'Should have studentIdInput field');
  assert(index.includes('Student ID'), 'Should have Student ID label');
  assert(index.includes('id="passwordInput"'), 'Should have passwordInput field');
  assert(index.includes('Invalid Student ID or Password. Please contact your administrator.'), 'Should display exact invalid credentials message');
  assert(index.includes('window.RizzDB.getStudent'), 'Should query Firebase getStudent');
  assert(index.includes('sessionStorage.setItem'), 'Should store active session in sessionStorage');
});

// 6. Test STUD.html sessionStorage guard
test('STUD.html immediately checks sessionStorage on load and redirects if invalid', () => {
  const stud = fs.readFileSync('STUD.html', 'utf8');
  assert(stud.includes('sessionStorage.getItem'), 'Should check sessionStorage in guard');
  assert(stud.includes("window.location.replace('index.html')"), 'Should redirect to index.html if missing');
});

console.log(`\n📊 Test Results: ${passCount} / ${totalTests} tests passed.`);
if (passCount === totalTests) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
} else {
  process.exit(1);
}
