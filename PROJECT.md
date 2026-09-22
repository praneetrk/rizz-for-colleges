file:///e%3A/RIZZ/RIZZ%20FOR%20COLLEGE/PROJECT.md {"mtime":1787980162290,"ctime":1787980162290,"size":0,"etag":"3giq3reno0","orphaned":false,"typeId":""}
# RIZZ FOR COLLEGES
# MASTER PROJECT SPECIFICATION

This is an ongoing project called "RIZZ for Colleges".

RIZZ for Colleges is a college/student platform with four user types:

1. Student
2. Mentor
3. Admin
4. Hiring Company

IMPORTANT DEVELOPMENT RULE:

This project must be developed incrementally.

DO NOT build the entire application in one go.

DO NOT randomly redesign architecture.

DO NOT replace working features when adding new features.

Build one feature at a time, test it, fix it, and only then move forward.

Before making major architectural changes, explain the proposed change first.

When modifying an existing file, preserve existing functionality unless explicitly asked to remove it.

==================================================
1. USER DATABASE
==================================================

The prototype user data will be maintained in Excel.

File:

students.xlsx

Required columns:

Name
Email
Phone
Password
User ID
Role
First Login

Allowed Role values:

Student
Mentor
Admin
Hiring

The initial password is assigned by the Admin.

The initial login page must NOT contain a Forgot Password option.

Password change will be available after login through Profile / Settings.

==================================================
2. ROLE-BASED LOGIN
==================================================

Login page:

index.html

User enters:

Email
Password

System verifies the account.

After successful authentication, determine the user's Role.

Routing:

Student → STUD.html
Mentor → MENTOR.html
Admin → ADMIN.html
Hiring → HIRING.html

Store the logged-in user's basic session information in localStorage as:

currentUser

The Student ID/User ID must be available to the console.

The login page must not display demo credentials.

There must be no demo account section visible on the final login page.

==================================================
3. STUDENT CONSOLE
==================================================

Student console:

STUD.html

Main sidebar tabs:

HOME
PRE-TEST
WORKSHOP
RESULTS
ASSESSMENTS
OPPORTUNITIES

Top-left:

RIZZ logo

Top-right:

Profile icon
Student name
Student User ID

Clicking Profile should open a dropdown.

The dropdown will eventually contain:

Profile Settings
Change Password
Logout

==================================================
4. STUDENT HOME
==================================================

Student lands on HOME after login.

Home contains:

Student name + greeting.

Progress/speedometer-style learning progress bar.

Initial progress:

0%

It starts empty.

Later it will be connected to actual workshop/syllabus completion.

There is:

TAKE PRE-TEST

Clicking it opens the Pre-Test tab.

==================================================
5. STUDENT ACCESS PROGRESSION
==================================================

Initial state:

HOME → unlocked
PRE-TEST → unlocked

WORKSHOP → locked
RESULTS → locked
ASSESSMENTS → locked
OPPORTUNITIES → locked

After Pre-Test submission:

WORKSHOP → unlocked
RESULTS → available as a result area, but marks remain hidden until Admin publishes

After Workshop completion by Mentor:

ASSESSMENTS → unlocked

After assessment/scoring:

Calculate the platform's unique RIZZ score.

If the student's score meets the required threshold:

OPPORTUNITIES → unlocked

Otherwise:

OPPORTUNITIES remains locked.

==================================================
6. PASSWORD MANAGEMENT
==================================================

No Forgot Password option on the initial login page.

Initial password is issued by Admin.

After login:

Profile
→ Settings
→ Change Password

Normal password change:

Current Password
→ New Password
→ Confirm New Password
→ Update

Later we may include a recovery flow for forgotten current password.

Do not implement password changing on the login page.

==================================================
7. STUDENT PRE-TEST
==================================================

Confirmed workflow:

Student
↓
Pre-Test tab
↓
START PRE-TEST
↓
Question Paper assigned
↓
Exam starts
↓
MCQ + Descriptive questions
↓
Timer starts
↓
Autosave
↓
Browser/tab monitoring
↓
Warning 1
↓
Warning 2
↓
Warning 3
↓
Warning 4
↓
Automatic submission

Student may also manually submit.

After submission:

Attempt becomes locked.

All answers are saved.

==================================================
8. QUESTION TYPES
==================================================

MCQ:

Four options.

Example:

Question
A
B
C
D

MCQs are automatically evaluated.

Descriptive questions:

Short written responses.

Descriptive answers are evaluated using AI.

The AI evaluation prompt will be supplied by the project owner later.

==================================================
9. QUESTION PAPER SERIES
==================================================

Question papers are controlled by Admin.

There must be multiple question-paper series.

Minimum:

Series A
Series B
Series C

Purpose:

Students with adjacent/front/back roll numbers should not receive the same question paper.

Default distribution can be:

A → B → C → A → B → C

Later possible options:

Random series
Manual assignment
Question randomization
MCQ option randomization

Question papers must NOT be hardcoded permanently into STUD.html.

==================================================
10. EXAM CONFIGURATION
==================================================

Admin should eventually control:

Exam ID
Exam name
Duration
Total marks
Passing score
Active/inactive status
Question-paper series
Availability

Student exam duration must not be permanently hardcoded.

==================================================
11. ANTI-TAB-SWITCHING
==================================================

During an active exam, monitor common browser-level events such as:

visibilitychange
blur/focus
tab switching
window losing focus
fullscreen exit if fullscreen is used

Warnings:

1
2
3
4

Fourth warning:

Automatically submit the exam.

Record when practical:

Warning count
Warning type
Reason
Timestamp

Important:

This is browser-level detection, not guaranteed professional exam proctoring.

==================================================
12. AUTOSAVE
==================================================

Student answers should be saved continuously during the exam.

Do not wait until final submission.

Attempt should store:

Attempt ID
Student ID
Student Name
Student Email
Exam ID
Question-paper Series
Start Time
End Time
Answers
Warning Count
Warning Events
MCQ Score
AI Descriptive Score
Provisional Score
Final Score
Finalisation Status
Publication Status

Once submitted, the attempt is locked.

==================================================
13. EVALUATION
==================================================

MCQs:

Automatic evaluation.

Descriptive:

AI evaluation.

AI generates:

Provisional marks.

Example:

MCQ:
24/30

AI descriptive:
12/20

Provisional:
36/50

IMPORTANT:

The student must never see provisional AI marks.

==================================================
14. ADMIN REVIEW
==================================================

Admin receives submitted attempts.

Admin should see:

Student
Student ID
Exam
Question-paper Series
MCQ score
AI descriptive score
Provisional score
Answers
AI evaluation/reasoning where appropriate

Admin can:

Review
Approve AI marks
Modify marks
Finalise marks
Publish result

Finalise and Publish are separate actions.

Student only sees the final score after Publish.

==================================================
15. STUDENT RESULTS
==================================================

Before Admin publishes:

Student sees:

"Your Pre-Test has been submitted and is currently under review."

No marks.

After Admin publishes:

Student sees final result.

Exact Results design will be implemented later.

==================================================
16. ADMIN REQUIREMENTS
==================================================

Admin will eventually control:

USER MANAGEMENT

Students
Mentors
Admins
Hiring Companies

EXAM MANAGEMENT

Create exam
Edit exam
Set timer
Set total marks
Set passing score
Upload question papers
Series A
Series B
Series C
Additional series
Activate/deactivate exam
Publish exam

QUESTION MANAGEMENT

MCQ
Descriptive
Correct answer
Marks
Rubric
Add
Edit
Delete

EVALUATION

Submitted attempts
AI evaluation
Review
Edit marks
Finalise
Publish

WORKSHOP MANAGEMENT

Workshop assignment
Progress
Completion
Student status

ASSESSMENTS

Create
Assign
Evaluate

OPPORTUNITIES

Eligibility
RIZZ score threshold
Hiring opportunities
Student matching

EXCEL

Import users
Export users
Reports

==================================================
17. MENTOR REQUIREMENTS
==================================================

Mentor console will eventually contain:

Dashboard
Assigned students
Workshop management
Workshop completion
Student progress
Feedback
Assessment-related actions

Mentor controls Workshop completion.

==================================================
18. HIRING REQUIREMENTS
==================================================

Hiring company console will eventually contain:

Company profile
Job posting
Eligible students
Candidate discovery
Student profiles
Applications
Shortlisting
Hiring status

==================================================
19. DESIGN SYSTEM
==================================================

Theme:

Pure white:
#FFFFFF

Dark Slate:
#0F172A

Primary:
Tailwind pink-500

Secondary:
Tailwind yellow-400

No dark mode.

No gradients.

No red colors.

No keyboard emojis.

Use FontAwesome icons through CDN.

Use Tailwind CSS through CDN during prototype development.

Use Vanilla JavaScript unless a framework is explicitly approved.

Design should be:

Clean
Modern
Professional
Minimal
College platform style
Responsive

==================================================
20. ARCHITECTURE DIRECTION
==================================================

Prototype:

HTML
CSS
JavaScript
Excel

Long-term production:

Frontend
+
Backend
+
Database

Excel should eventually be used mainly for:

Bulk import
Bulk export
Reporting

Do not design the final production authentication architecture around client-side Excel access.

Production passwords must not be stored as plain text.

Passwords should eventually be securely hashed server-side.

==================================================
21. DEVELOPMENT ORDER
==================================================

Preferred order:

1. Login
2. Role-based routing
3. Student Home
4. Student Pre-Test
5. Question-paper series
6. Timer
7. Autosave
8. Anti-tab warnings
9. Submission
10. Admin exam management
11. AI evaluation
12. Admin review/finalisation
13. Student Results
14. Mentor console
15. Workshop system
16. Assessments
17. RIZZ score
18. Hiring console
19. Opportunities
20. Final backend/database migration

The exact order can be adjusted when dependencies require it.

==================================================
22. WORKING STYLE
==================================================

Never build everything at once.

For each feature:

Plan
↓
Implement
↓
Run
↓
Test
↓
Fix
↓
Confirm
↓
Next feature

After each major implementation, provide:

What changed
Files changed
How to test
Expected result
Known limitations

Do not continue automatically to the next feature.

==================================================
23. FILE OUTPUT
==================================================

Whenever asked for a complete HTML file:

Return the ENTIRE file.

One single code block.

Do not split it.

Do not use:
"rest of code unchanged"
or
"continue from here".

Preserve existing functionality.

==================================================
24. CURRENT DEVELOPMENT STATE
==================================================

This project is being restarted from scratch.

The next task is:

BUILD THE BASE LOGIN SYSTEM.

First create:

index.html

It should:

- Have the RIZZ login design
- Read the user information from students.xlsx
- Accept email and password
- Determine Role
- Save currentUser
- Redirect:
  Student → STUD.html
  Mentor → MENTOR.html
  Admin → ADMIN.html
  Hiring → HIRING.html
- Have no Forgot Password option
- Have no demo credentials shown
- Have no visible Excel connection button

Do not build Student Pre-Test yet.

Do not build Admin yet.

Do not build Mentor yet.

Do not build Hiring yet.

==================================================
25. IMPORTANT SAFETY / SECURITY NOTE
==================================================

The Excel-based login is a development prototype.

For production deployment:

Do not expose passwords in frontend source.
Do not rely on a client-side Excel file as the final authentication store.
Use a backend and secure password hashing.

==================================================
END OF PROJECT SPECIFICATION