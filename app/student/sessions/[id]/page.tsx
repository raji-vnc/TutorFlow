"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Session = {
  id: string;
  topic: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  student_id: string;
};

type Debrief = {
  summary: string | null;
  homework: string | null;
  next_focus: string | null;
};

export default function StudentSessionDetails() {
  const params = useParams();
  const router = useRouter();

  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSessionDetails() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load the student's session
      const { data: sessionData, error: sessionError } =
        await supabase
          .from("sessions")
          .select(`
            id,
            topic,
            scheduled_at,
            status,
            notes,
            student_id
          `)
          .eq("id", sessionId)
          .eq("student_id", user.id)
          .single();

      if (sessionError || !sessionData) {
        setErrorMessage(
          sessionError?.message || "Session not found."
        );
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // Load AI debrief
      const { data: debriefData, error: debriefError } =
        await supabase
          .from("session_debriefs")
          .select(`
            summary,
            homework,
            next_focus
          `)
          .eq("session_id", sessionId)
          .single();

      if (debriefError) {
        console.log("Debrief not available:", debriefError.message);
      } else if (debriefData) {
        setDebrief(debriefData);
      }

      setLoading(false);
    }

    if (sessionId) {
      loadSessionDetails();
    }
  }, [sessionId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p>Loading session...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p className="text-red-600">
          {errorMessage || "Session not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">

        <button
          onClick={() => router.push("/student")}
          className="text-blue-600 font-medium mb-6"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-6">

          <h1 className="text-3xl font-bold">
            {session.topic}
          </h1>

          <p className="text-gray-700 mt-2">
            {new Date(
              session.scheduled_at
            ).toLocaleString()}
          </p>

          <div className="mt-4">
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium">
              {session.status === "ai_reviewed"
                ? "AI Reviewed"
                : "Completed"}
            </span>
          </div>

          {/* Tutor Notes */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">
              Tutor Session Notes
            </h2>

            <div className="bg-gray-50 border rounded-lg p-5 whitespace-pre-wrap text-gray-800">
              {session.notes || "No session notes available."}
            </div>
          </div>

          {/* AI Debrief */}
          {debrief && (
            <div className="mt-8">

              <h2 className="text-2xl font-bold mb-5">
                AI Session Review
              </h2>

              <div className="space-y-5">

                {/* Summary */}
                <div className="bg-blue-50 border rounded-xl p-5">
                  <h3 className="text-lg font-bold mb-2">
                    Summary
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-800">
                    {debrief.summary ||
                      "No summary available."}
                  </div>
                </div>

                {/* Homework */}
                <div className="bg-yellow-50 border rounded-xl p-5">
                  <h3 className="text-lg font-bold mb-2">
                    Homework
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-800">
                    {debrief.homework ||
                      "No homework assigned."}
                  </div>
                </div>

                {/* Next Focus */}
                <div className="bg-purple-50 border rounded-xl p-5">
                  <h3 className="text-lg font-bold mb-2">
                    Next Focus
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-800">
                    {debrief.next_focus ||
                      "No next focus available."}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}