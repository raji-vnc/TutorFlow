"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string;
};

type Session = {
  id: string;
  topic: string;
  scheduled_at: string;
  status: string;
};

type Homework = {
  session_id: string;
  homework: string | null;
  sessions: {
    topic: string;
    scheduled_at: string;
  } | null;
};

type ProgressSummary = {
  progress_summary: string;
  created_at: string;
};
export default function StudentDashboard() {
  const router = useRouter();
const [progressSummary, setProgressSummary] =
  useState<ProgressSummary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStudentDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load student profile
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

      if (profileError) {
        setErrorMessage(profileError.message);


        // Load student's homework from AI debriefs
const { data: homeworkData, error: homeworkError } =
  await supabase
    .from("session_debriefs")
    .select(`
      session_id,
      homework,
      sessions!inner (
        topic,
        scheduled_at,
        student_id
      )
    `)
    .eq("sessions.student_id", user.id)
    .not("homework", "is", null)
    .order("created_at", {
      ascending: false,
    });

if (homeworkError) {
  console.log(
    "Homework load error:",
    homeworkError.message
  );
} else {
  setHomeworkList(
    (homeworkData as unknown as Homework[]) || []
  );
}

const {
  data: progressData,
  error: progressError,
} = await supabase
  .from("student_progress_summaries")
  .select(`
    progress_summary,
    created_at
  `)
  .eq("student_id", user.id)
  .order("created_at", {
    ascending: false,
  })
  .limit(1)
  .single();

if (progressError) {
  console.log(
    "Progress summary not available:",
    progressError.message
  );
} else if (progressData) {
  setProgressSummary(progressData);
}
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load student's sessions
      const { data: sessionData, error: sessionError } =
        await supabase
          .from("sessions")
          .select(`
            id,
            topic,
            scheduled_at,
            status
          `)
          .eq("student_id", user.id)
          .order("scheduled_at", {
            ascending: true,
          });

      if (sessionError) {
        setErrorMessage(sessionError.message);
      } else {
        setSessions(sessionData || []);
      }

      setLoading(false);
    }

    loadStudentDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const upcomingSessions = sessions.filter(
    (session) =>
      session.status === "scheduled" ||
      session.status === "in_progress"
  );

  const completedSessions = sessions.filter(
    (session) =>
      session.status === "completed" ||
      session.status === "ai_reviewed"
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-400 p-8">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl text-gray-800 font-bold">
              Welcome, {profile?.full_name || "Student"}!
            </h1>

            <p className="text-gray-700 font-medium">
              Student Dashboard
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

        {/* Upcoming Sessions */}
        <div className="mb-10">
          <h2 className="text-2xl text-gray-800 font-bold mb-4">
            Upcoming Sessions
          </h2>

          {upcomingSessions.length === 0 ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <p className="text-gray-700">
                No upcoming sessions.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-6 rounded-xl shadow"
                >
                  <h3 className="text-xl text-gray-800 font-bold">
                    {session.topic}
                  </h3>

                  <p className="text-gray-700 mt-2">
                    {new Date(
                      session.scheduled_at
                    ).toLocaleString()}
                  </p>

                  <span className="inline-block mt-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {session.status === "in_progress"
                      ? "In Progress"
                      : "Scheduled"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Homework */}
<div className="mb-10">
  <h2 className="text-2xl text-gray-800 font-bold mb-4">
    Homework
  </h2>

  {homeworkList.length === 0 ? (
    <div className="bg-white p-6 rounded-xl shadow">
      <p className="text-gray-700">
        No homework assigned yet.
      </p>
    </div>
  ) : (
    <div className="grid md:grid-cols-2 text-gray-800 gap-6">
      {homeworkList.map((item) => (
        <div
          key={item.session_id}
          className="bg-yellow-50 border rounded-xl p-6"
        >
          <h3 className="text-xl text-gray-800 font-bold">
            {item.sessions?.topic || "Session Homework"}
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            {item.sessions?.scheduled_at
              ? new Date(
                  item.sessions.scheduled_at
                ).toLocaleDateString()
              : ""}
          </p>

          <div className="whitespace-pre-wrap text-gray-800 mt-4">
            {item.homework}
          </div>

          <button
            onClick={() =>
              router.push(
                `/student/sessions/${item.session_id}`
              )
            }
            className="mt-5 bg-blue-600 text-gray-800 px-4 py-2 rounded-lg"
          >
            View Session Details
          </button>
        </div>
      ))}
    </div>
  )}
</div>
{/* AI Progress Summary */}
<div className="mb-10">
  <h2 className="text-2xl text-gray-800 font-bold mb-4">
    My Learning Progress
  </h2>

  {!progressSummary ? (
    <div className="bg-white p-6 rounded-xl shadow">
      <p className="text-gray-700">
        Your progress summary is not available yet.
      </p>
    </div>
  ) : (
    <div className="bg-purple-50 border rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl text-gray-800 font-bold">
          AI Progress Summary
        </h3>

        <span className="text-sm text-gray-600">
          {new Date(
            progressSummary.created_at
          ).toLocaleDateString()}
        </span>
      </div>

      <div className="whitespace-pre-wrap text-gray-800">
        {progressSummary.progress_summary}
      </div>
    </div>
  )}
</div>

        {/* Session History */}
        <div>
          <h2 className="text-2xl text-gray-800 font-bold mb-4">
            Session History
          </h2>

          {completedSessions.length === 0 ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <p className="text-gray-700">
                No completed sessions yet.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 text-gray-800 gap-6">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-6 rounded-xl shadow"
                >
                  <h3 className="text-xl text-gray-800 font-bold">
                    {session.topic}
                  </h3>

                  <p className="text-gray-700 mt-2">
                    {new Date(
                      session.scheduled_at
                    ).toLocaleString()}
                  </p>

                  <span className="inline-block mt-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {session.status === "ai_reviewed"
                      ? "AI Reviewed"
                      : "Completed"}
                  </span>
<button
  onClick={() =>
    router.push(`/student/sessions/${session.id}`)
  }
  className="mt-5 bg-blue-600 text-white px-4 py-2 rounded-lg"
>
  View Details
</button>


                </div>
              ))}
            </div>

            
          )}
        </div>
        

      </div>
    </main>
  );
}