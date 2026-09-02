# TutorFlow

TutorFlow is an AI-powered tutoring management platform designed to help private tutors manage students, schedule tutoring sessions, record live session notes, generate AI-powered learning plans, and track student progress.

The platform provides separate dashboards for tutors and students.

---

## Features

### Tutor Features

- Tutor authentication
- Create student accounts
- Manage student learning profiles
- Schedule tutoring sessions
- Prevent double-booking of tutoring sessions
- View upcoming and completed sessions
- Generate AI Pre-Session Plans
- Record live tutoring session notes
- Automatically save session notes
- Complete tutoring sessions
- Generate AI Post-Session Debriefs
- View student learning progress
- Generate AI-powered student progress summaries

### AI Pre-Session Plan

The AI generates a personalized session plan based on:

- Student subject
- Current learning level
- Learning goals
- Weak areas
- Previous session information

The generated plan includes:

- Learning objectives
- Structured lesson outline
- Practice questions

### AI Post-Session Debrief

After a tutoring session is completed, AI generates:

- Session summary
- Personalized homework
- Recommended next focus

The AI analysis is based on the tutor's live session notes and the student's learning profile.

### Student Features

Students can:

- Log in to their account
- View upcoming tutoring sessions
- View completed session history
- Open completed session details
- View AI session summaries
- View assigned homework
- View recommended next focus areas

### Student Progress Tracking

Tutors can view:

- Total sessions
- Completed sessions
- Upcoming sessions
- Completion rate

Tutors can also generate an AI-powered progress analysis based on completed tutoring sessions.

### Email Notifications

When a tutor schedules a new session, the system can send an email notification using Resend.

The email includes:

- Session topic
- Session date and time
- Student name
- Login instructions

> Note: During development/testing, Resend may restrict emails to the account owner's email address unless a sending domain is verified.

---

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Authentication
- Supabase PostgreSQL Database
- Google Gemini AI
- Resend Email API

---

## Project Structure

```text
app/
│
├── api/
│   ├── create-student/
│   ├── generate-debrief/
│   ├── generate-progress-summary/
│   ├── generate-session-plan/
│   └── send-session-email/
│
├── login/
│
├── student/
│   ├── sessions/
│   │   └── [id]/
│   └── page.tsx
│
├── tutor/
│   ├── students/
│   │   ├── new/
│   │   └── [id]/
│   ├── sessions/
│   │   ├── new/
│   │   └── [id]/
│   └── page.tsx
│
└── page.tsx

lib/
└── supabase.ts

Email Notifications

The project uses Resend for email notifications.

When a session is scheduled, an API route sends a notification email.


Authentication for tutor
Email:tutor@tutorflow.co
password:tutor@123

Athuentication for students
student@tutorflow.com
student@123

sam@tutorflow.com
sam@123




