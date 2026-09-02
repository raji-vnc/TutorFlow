
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  status: string;
  topic: string;
  scheduled_at: string;
};

export default function TutorDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load students
      const { data: studentData, error: studentError } =
        await supabase
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
          .eq("tutor_id", user.id);

      if (studentError) {
        setErrorMessage(studentError.message);
      } else {
        setStudents(
          (studentData as unknown as Student[]) || []
        );
      }

      // Load sessions
      const { data: sessionData, error: sessionError } =
        await supabase
          .from("sessions")
          .select(`
            id,
            status,
            topic,
            scheduled_at
          `)
          .eq("tutor_id", user.id)
          .order("scheduled_at", {
            ascending: false,
          });

      if (sessionError) {
        setErrorMessage(sessionError.message);
      } else {
        setSessions(sessionData || []);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Dashboard statistics
  const scheduledCount = sessions.filter(
    (session) => session.status === "scheduled"
  ).length;

  const inProgressCount = sessions.filter(
    (session) => session.status === "in_progress"
  ).length;

  const completedCount = sessions.filter(
    (session) => session.status === "completed"
  ).length;

  const aiReviewedCount = sessions.filter(
    (session) => session.status === "ai_reviewed"
  ).length;

  return (
    <main className="min-h-screen bg-gray-700 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              TutorFlow
            </h1>

            <p className="text-gray-800">
              Tutor Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-800 text-sm">
              Total Students
            </p>

            <p className="text-3xl font-bold mt-2">
              {students.length}
            </p>
          </div>

          <div className="bg-gray-200 p-5 rounded-xl shadow">
            <p className="text-gray-900 text-sm">
              Scheduled
            </p>

            <p className="text-3xl font-bold mt-2">
              {scheduledCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-800 text-sm">
              In Progress
            </p>

            <p className="text-3xl font-bold mt-2">
              {inProgressCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-800 text-sm">
              Completed
            </p>

            <p className="text-3xl font-bold mt-2">
              {completedCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-800 text-sm">
              AI Reviewed
            </p>

            <p className="text-3xl font-bold mt-2">
              {aiReviewedCount}
            </p>
          </div>

        </div>

        {/* My Students */}
     <div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-2xl font-semibold">
      My Students
    </h2>

    <p className="text-gray-600">
      Manage your students and their learning progress.
    </p>
  </div>

  <button
    onClick={() => router.push("/tutor/students/new")}
    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
  >
    + Add Student
  </button>
</div>

        {loading && <p>Loading dashboard...</p>}

        {errorMessage && (
          <p className="text-red-500 mb-4">
            {errorMessage}
          </p>
        )}

        {!loading && students.length === 0 && (
          <div className="bg-white p-6 rounded-xl shadow">
            No students found.
          </div>
        )}

        {/* Student Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white p-6 rounded-xl shadow"
            >
              <h3 className="text-xl font-bold">
                {student.profiles?.full_name || "Student"}
              </h3>

              <p className="mt-2">
                <strong>Subject:</strong>{" "}
                {student.subject}
              </p>

              <p>
                <strong>Level:</strong>{" "}
                {student.current_level}
              </p>

              <p className="mt-2">
                <strong>Learning Goal:</strong>{" "}
                {student.learning_goals || "Not provided"}
              </p>

              <p className="mt-2">
                <strong>Weak Areas:</strong>{" "}
                {student.weak_areas || "Not provided"}
              </p>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() =>
                    router.push(
                      `/tutor/students/${student.id}`
                    )
                  }
                  className="bg-blue-600 text-gray-800 px-4 py-2 rounded-lg"
                >
                  View Student
                </button>

                <button
                  onClick={() =>
                    router.push(
                      `/tutor/sessions/new?student=${student.id}`
                    )
                  }
                  className="bg-green-600 text-gray-800 px-4 py-2 rounded-lg"
                >
                  Schedule Session
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}