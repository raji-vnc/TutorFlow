"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
};

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = searchParams.get("student");

  const [student, setStudent] = useState<Student | null>(null);
  const [topic, setTopic] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStudent() {
      if (!studentId) {
        setErrorMessage("Student not selected.");
        setLoading(false);
        return;
      }

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
          profiles!student_profiles_id_fkey (
            full_name
          )
        `)
        .eq("id", studentId)
        .eq("tutor_id", user.id)
        .single();

      if (error || !data) {
        setErrorMessage(error?.message || "Student not found.");
        setLoading(false);
        return;
      }

      const profileData = data.profiles as unknown as {
        full_name: string;
      } | null;

      setStudent({
        id: data.id,
        full_name: profileData?.full_name || "Student",
      });

      setLoading(false);
    }

    loadStudent();
  }, [studentId, router]);

  const handleCreateSession = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMessage("");

    if (!studentId) {
      setErrorMessage("Student not selected.");
      return;
    }

    if (!topic.trim() || !scheduledAt) {
      setErrorMessage(
        "Please enter a topic and session date/time."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const sessionDate = new Date(scheduledAt);

    const { error } = await supabase
      .from("sessions")
      .insert({
        tutor_id: user.id,
        student_id: studentId,
        topic: topic.trim(),
        scheduled_at: sessionDate.toISOString(),
        status: "scheduled",
      });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/tutor/students/${studentId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() =>
            router.push(`/tutor/students/${studentId}`)
          }
          className="text-blue-600 mb-6"
        >
          ← Back to Student
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold mb-2">
            Schedule Session
          </h1>

          <p className="text-gray-800 mb-6">
            Create a new session for{" "}
            <strong>{student?.full_name}</strong>
          </p>

          {errorMessage && (
            <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-5">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleCreateSession}
            className="space-y-5"
          >
            <div>
              <label className="block mb-2 font-medium">
                Session Topic
              </label>

              <input
                type="text"
                placeholder="Example: Algebra Basics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Date & Time
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white p-3 rounded-lg"
            >
              {saving
                ? "Scheduling..."
                : "Schedule Session"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 p-8">
          <p>Loading...</p>
        </main>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}