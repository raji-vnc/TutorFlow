"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  subject: string;
  current_level: string;
  learning_goals: string | null;
  weak_areas: string | null;
  profiles: {
    full_name: string;
  } | null;
};

type Session = {
  id: string;
  topic: string;
  scheduled_at: string;
  status: string;
};
type Debrief = {
  session_id: string;
  summary: string | null;
  homework: string | null;
  next_focus: string | null;
};

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const studentId = params.id as string;
const [sessions, setSessions] = useState<Session[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressSummary, setProgressSummary] = useState("");
const [generatingProgress, setGeneratingProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStudent() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("student_profiles")
        .select(`
          id,
          subject,
          current_level,
          learning_goals,
          weak_areas,
          profiles!student_profiles_id_fkey (
            full_name
          )
        `)
        .eq("id", studentId)
        .eq("tutor_id", user.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
      } else {
        setStudent(data as unknown as Student);
      }
const { data: sessionData, error: sessionError } =
  await supabase
    .from("sessions")
    .select(`
      id,
      topic,
      scheduled_at,
      status
    `)
    .eq("student_id", studentId)
    .eq("tutor_id", user.id)
    .order("scheduled_at", {
      ascending: false,
    });

if (sessionError) {
  setErrorMessage(sessionError.message);
} else {
  setSessions(sessionData || []);
}

const { data: savedProgress, error: progressError } =
  await supabase
    .from("student_progress_summaries")
    .select("progress_summary")
    .eq("student_id", studentId)
    .eq("tutor_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .single();

if (!progressError && savedProgress) {
  setProgressSummary(
    savedProgress.progress_summary
  );
}
      setLoading(false);
    }

    if (studentId) {
      loadStudent();
    }
  }, [studentId, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };
const totalSessions = sessions.length;

const completedSessions = sessions.filter(
  (session) =>
    session.status === "completed" ||
    session.status === "ai_reviewed"
);

const completedCount = completedSessions.length;

const upcomingCount = sessions.filter(
  (session) =>
    session.status === "scheduled" ||
    session.status === "in_progress"
).length;

const completionRate =
  totalSessions > 0
    ? Math.round(
        (completedCount / totalSessions) * 100
      )
    : 0;

const generateProgressSummary = async () => {
  if (!student) return;

  setGeneratingProgress(true);
  setErrorMessage("");

  try {
    // Get only completed sessions
    const completedSessionIds = completedSessions.map(
      (session) => session.id
    );

    if (completedSessionIds.length === 0) {
      setErrorMessage(
        "No completed sessions available for progress analysis."
      );
      return;
    }

    // Get AI debriefs for completed sessions
    const { data: debriefData, error: debriefError } =
      await supabase
        .from("session_debriefs")
        .select(`
          session_id,
          summary,
          homework,
          next_focus
        `)
        .in("session_id", completedSessionIds);

    if (debriefError) {
      setErrorMessage(debriefError.message);
      return;
    }

    if (!debriefData || debriefData.length === 0) {
      setErrorMessage(
        "No AI debrief data found for completed sessions."
      );
      return;
    }

    // Format session history for AI
    const completedSessionData = completedSessions
      .map((session) => {
        const debrief = debriefData.find(
          (item) => item.session_id === session.id
        );

        if (!debrief) return null;

        return `
SESSION TOPIC: ${session.topic}
DATE: ${new Date(
          session.scheduled_at
        ).toLocaleDateString()}

SUMMARY:
${debrief.summary || "Not available"}

HOMEWORK:
${debrief.homework || "Not available"}

NEXT FOCUS:
${debrief.next_focus || "Not available"}
        `;
      })
      .filter(Boolean)
      .join("\n\n-------------------\n\n");

    const response = await fetch("/api/ai/progress", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        studentName:
          student.profiles?.full_name || "Student",

        subject: student.subject,

        currentLevel: student.current_level,

        learningGoals:
          student.learning_goals || "Not specified",

        weakAreas:
          student.weak_areas || "Not specified",

        completedSessions: completedSessionData,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setErrorMessage(
        result.error ||
          "Failed to generate AI progress summary."
      );
      return;
    }

const generatedSummary =
  result.progressSummary || "";

setProgressSummary(generatedSummary);

// Get current tutor
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  setErrorMessage(
    "You must be logged in to save the progress summary."
  );
  return;
}

// Save progress summary to database
const { error: saveError } = await supabase
  .from("student_progress_summaries")
  .insert({
    student_id: student.id,
    tutor_id: user.id,
    progress_summary: generatedSummary,
  });

if (saveError) {
  setErrorMessage(
    `Progress summary save error: ${saveError.message}`
  );
}
  } catch (error) {
    console.error(
      "AI Progress Summary Error:",
      error
    );

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Unable to generate AI progress summary."
    );

  } finally {
    setGeneratingProgress(false);
  }
};

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p>Loading student...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push("/tutor")}
              className="text-blue-600 mb-3"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl text-gray-800 font-bold">
              {student?.profiles?.full_name || "Student"}
            </h1>

            <p className="text-gray-800">
              Student Profile
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-gray-800 px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}

        {student && (
          <>
            {/* Profile Details */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h2 className="text-xl text-gray-800 font-bold mb-5">
                Learning Profile
              </h2>

              <div className="grid md:grid-cols-2 gap-6">

                <div>
                  <p className="text-gray-800 text-sm">
                    Subject
                  </p>

                  <p className="font-semibold text-gray-800">
                    {student.subject}
                  </p>
                </div>

                <div>
                  <p className="text-gray-800 text-sm">
                    Current Level
                  </p>

                  <p className="font-semibold text-gray-800">
                    {student.current_level}
                  </p>
                </div>

                <div>
                  <p className="text-gray-800 text-sm">
                    Learning Goals
                  </p>

                  <p className="font-semibold text-gray-800">
                    {student.learning_goals || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-800 text-sm">
                    Weak Areas
                  </p>

                  <p className="font-semibold text-gray-800">
                    {student.weak_areas || "Not provided"}
                  </p>
                </div>

              </div>
            </div>


{/* Student Progress */}
<div className="mb-6">

  <h2 className="text-2xl text-gray-800 font-bold mb-4">
    Student Progress
  </h2>

  <div className="grid md:grid-cols-4 gap-4">

    {/* Total Sessions */}
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-800 text-sm">
        Total Sessions
      </p>

      <p className="text-3xl font-bold text-gray-800 mt-2">
        {totalSessions}
      </p>
    </div>

    {/* Completed */}
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-800 text-sm">
        Completed
      </p>

      <p className="text-3xl font-bold text-gray-800 mt-2">
        {completedCount}
      </p>
    </div>

    {/* Upcoming */}
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-800 text-sm">
        Upcoming
      </p>

      <p className="text-3xl font-bold text-gray-800 mt-2">
        {upcomingCount}
      </p>
    </div>

    {/* Completion Rate */}
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-800 text-sm">
        Completion Rate
      </p>

      <p className="text-3xl font-bold text-gray-800 mt-2">
        {completionRate}%
      </p>
    </div>

  </div>

</div>
            {/* Sessions List */}

<div className="bg-white rounded-xl shadow p-6 mb-6">

  <div className="flex justify-between items-center mb-5">

    <div>
      <h2 className="text-xltext-gray-800 font-bold">
        Sessions
      </h2>

      <p className="text-gray-600">
        Upcoming and past tutoring sessions.
      </p>
    </div>

    <button
      onClick={() =>
        router.push(
          `/tutor/sessions/new?student=${studentId}`
        )
      }
      className="bg-green-600 text-gray-800 px-4 py-2 rounded-lg"
    >
      + New Session
    </button>

  </div>

  {sessions.length === 0 ? (

    <p className="text-gray-800">
      No sessions scheduled yet.
    </p>

  ) : (

    <div className="space-y-4">

      {sessions.map((session) => (

        <div
          key={session.id}
          className="border rounded-lg p-4 text-gray-800 flex justify-between items-center"
        >

          <div>

            <h3 className="font-semibold text-gray-800 text-lg">
              {session.topic}
            </h3>

            <p className="text-gray-800 text-sm">

              {new Date(
                session.scheduled_at
              ).toLocaleString()}

            </p>

          </div>

         <div className="text-right space-y-2">

  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-sm">
    {session.status}
  </span>

  <br />

  <button
    onClick={() =>
      router.push(`/tutor/sessions/${session.id}`)
    }
    className="bg-blue-600 text-gray-800 px-4 py-2 rounded-lg text-sm"
  >
    Open Session
  </button>

</div>

        </div>

      ))}

    </div>

  )}

</div>

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-6">

             <div className="bg-white rounded-xl shadow p-6">
  <h2 className="text- text-gray-800 font-bold mb-2">
    AI Progress Summary
  </h2>

  <p className="text-gray-700 mb-5">
    Generate an AI analysis based on the student's
    completed tutoring sessions.
  </p>

  <button
    onClick={generateProgressSummary}
    disabled={generatingProgress}
    className="bg-purple-600 text-gray-800 px-4 py-2 rounded-lg disabled:opacity-50"
  >
    {generatingProgress
      ? "Generating Progress Summary..."
      : "Generate AI Progress Summary"}
  </button>

  {progressSummary && (
    <div className="mt-6 bg-purple-50 border rounded-lg p-5">
      <h3 className="text-lg text-gray-800 font-bold mb-3">
        Student Progress Analysis
      </h3>

      <div className="whitespace-pre-wrap text-gray-800">
        {progressSummary}
      </div>
    </div>
  )}
</div>

            

            </div>
          </>
        )}

      </div>
    </main>
  );
}