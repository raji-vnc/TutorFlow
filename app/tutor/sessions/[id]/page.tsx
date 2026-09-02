"use client";

import { useEffect, useRef, useState } from "react";
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

type SessionPlan = {
  objectives: string;
  lesson_outline: string;
  practice_questions: string;
};

type SessionDebrief = {
  summary: string;
  homework: string;
  next_focus: string;
};

type StudentProfile = {
  subject: string | null;
  current_level: string | null;
  learning_goals: string | null;
  weak_areas: string | null;
};

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const sessionId = params.id as string;

  const [session, setSession] =
    useState<Session | null>(null);

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] =
    useState(false);

  const [notesSaveStatus, setNotesSaveStatus] =
    useState<
      "saved" | "saving" | "unsaved" | "error"
    >("saved");

  const autosaveTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [debrief, setDebrief] = useState("");

  const [savedDebrief, setSavedDebrief] =
    useState<SessionDebrief | null>(null);

  const [generatingDebrief, setGeneratingDebrief] =
    useState(false);

  const [plan, setPlan] = useState("");

  const [savedPlan, setSavedPlan] =
    useState<SessionPlan | null>(null);

  const [generatingPlan, setGeneratingPlan] =
    useState(false);

  const [studentProfile, setStudentProfile] =
    useState<StudentProfile | null>(null);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id,
          topic,
          scheduled_at,
          status,
          notes,
          student_id,
          tutor_id
        `)
        .eq("id", sessionId)
        .eq("tutor_id", user.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSession(data);
        setNotes(data.notes || "");

        const {
          data: planData,
          error: planError,
        } = await supabase
          .from("session_plans")
          .select(`
            objectives,
            lesson_outline,
            practice_questions
          `)
          .eq("session_id", data.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (!planError && planData) {
          setSavedPlan(planData);
        }

        const {
          data: debriefData,
          error: debriefLoadError,
        } = await supabase
          .from("session_debriefs")
          .select(`
            summary,
            homework,
            next_focus
          `)
          .eq("session_id", data.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (
          !debriefLoadError &&
          debriefData
        ) {
          setSavedDebrief(debriefData);
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("student_profiles")
          .select(`
            subject,
            current_level,
            learning_goals,
            weak_areas
          `)
          .eq("id", data.student_id)
          .single();

        if (
          !profileError &&
          profileData
        ) {
          setStudentProfile(profileData);
        }
      }

      setLoading(false);
    }

    if (sessionId) {
      loadSession();
    }

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(
          autosaveTimer.current
        );
      }
    };
  }, [sessionId, router]);

  const startSession = async () => {
    if (!session) return;

    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "update_session_status",
        {
          session_id: session.id,
          new_status: "in_progress",
        }
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSession({
      ...session,
      status: "in_progress",
    });
  };

  // Save notes
  const saveNotes = async (
    notesToSave = notes
  ) => {
    if (!session) return;

    setSavingNotes(true);
    setNotesSaveStatus("saving");
    setErrorMessage("");

    const { error } = await supabase
      .from("sessions")
      .update({
        notes: notesToSave,
      })
      .eq("id", session.id)
      .eq("status", "in_progress");

    if (error) {
      setErrorMessage(error.message);
      setNotesSaveStatus("error");
    } else {
      setNotesSaveStatus("saved");

      setSession({
        ...session,
        notes: notesToSave,
      });
    }

    setSavingNotes(false);
  };

  // Debounced autosave
  const handleNotesChange = (
    e: React.ChangeEvent<
      HTMLTextAreaElement
    >
  ) => {
    const newNotes = e.target.value;

    setNotes(newNotes);
    setNotesSaveStatus("unsaved");

    if (autosaveTimer.current) {
      clearTimeout(
        autosaveTimer.current
      );
    }

    autosaveTimer.current =
      setTimeout(() => {
        saveNotes(newNotes);
      }, 1000);
  };

  const completeSession = async () => {
    if (!session) return;

    setErrorMessage("");

    // Stop pending autosave
    if (autosaveTimer.current) {
      clearTimeout(
        autosaveTimer.current
      );
    }

    // Save latest notes before completing
    setSavingNotes(true);
    setNotesSaveStatus("saving");

    const { error: notesError } =
      await supabase
        .from("sessions")
        .update({
          notes,
        })
        .eq("id", session.id)
        .eq("status", "in_progress");

    if (notesError) {
      setErrorMessage(
        notesError.message
      );
      setNotesSaveStatus("error");
      setSavingNotes(false);
      return;
    }

    setNotesSaveStatus("saved");

    const { error } =
      await supabase.rpc(
        "update_session_status",
        {
          session_id: session.id,
          new_status: "completed",
        }
      );

    setSavingNotes(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSession({
      ...session,
      status: "completed",
      notes,
    });
  };

  const generateDebrief = async () => {
    if (!session) return;

    setGeneratingDebrief(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/ai/debrief",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            studentName: "Student",

            subject:
              studentProfile?.subject ||
              "Not specified",

            currentLevel:
              studentProfile?.current_level ||
              "Not specified",

            learningGoals:
              studentProfile?.learning_goals ||
              "Not specified",

            weakAreas:
              studentProfile?.weak_areas ||
              "Not specified",

            sessionTopic:
              session.topic,

            tutorNotes:
              session.notes ||
              notes ||
              "Tutor completed the session.",
          }),
        }
      );

      const text =
        await response.text();

      let result;

      try {
        result = JSON.parse(text);
      } catch {
        setErrorMessage(
          `Server returned an invalid response. Status: ${response.status}`
        );
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            `AI request failed. Status: ${response.status}`
        );
        return;
      }

      setDebrief(result.debrief);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to AI service."
      );
    } finally {
      setGeneratingDebrief(false);
    }
  };

  const saveDebrief = async () => {
    if (!session || !debrief) return;

    setErrorMessage("");

    try {
      const summaryMatch =
        debrief.match(
          /SUMMARY:\s*([\s\S]*?)(?=HOMEWORK:|$)/i
        );

      const homeworkMatch =
        debrief.match(
          /HOMEWORK:\s*([\s\S]*?)(?=NEXT_FOCUS:|$)/i
        );

      const nextFocusMatch =
        debrief.match(
          /NEXT_FOCUS:\s*([\s\S]*)/i
        );

      const summary =
        summaryMatch?.[1]?.trim() ||
        "No summary generated.";

      const homework =
        homeworkMatch?.[1]?.trim() ||
        "No homework generated.";

      const nextFocus =
        nextFocusMatch?.[1]?.trim() ||
        "No next focus generated.";

      const {
        data: newDebrief,
        error: debriefError,
      } = await supabase
        .from("session_debriefs")
        .insert({
          session_id: session.id,
          summary,
          homework,
          next_focus: nextFocus,
        })
        .select()
        .single();

      if (debriefError) {
        setErrorMessage(
          "Debrief save error: " +
            debriefError.message
        );
        return;
      }

      const {
        error: statusError,
      } = await supabase.rpc(
        "update_session_status",
        {
          session_id: session.id,
          new_status: "ai_reviewed",
        }
      );

      if (statusError) {
        setErrorMessage(
          "Status update error: " +
            statusError.message
        );
        return;
      }

      setSavedDebrief(newDebrief);

      setSession({
        ...session,
        status: "ai_reviewed",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save AI debrief."
      );
    }
  };

  const generatePlan = async () => {
    if (!session) return;

    setGeneratingPlan(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/ai/plan",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            studentName: "Student",

            subject:
              studentProfile?.subject ||
              "Not specified",

            currentLevel:
              studentProfile?.current_level ||
              "Not specified",

            learningGoals:
              studentProfile?.learning_goals ||
              "Not specified",

            weakAreas:
              studentProfile?.weak_areas ||
              "Not specified",

            sessionTopic:
              session.topic,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "Failed to generate AI plan."
        );
        return;
      }

      setPlan(result.plan);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to AI service."
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const savePlan = async () => {
    if (!session || !plan) return;

    setErrorMessage("");

    try {
      const objectivesMatch =
        plan.match(
          /OBJECTIVES:\s*([\s\S]*?)(?=LESSON_OUTLINE:|$)/i
        );

      const lessonOutlineMatch =
        plan.match(
          /LESSON_OUTLINE:\s*([\s\S]*?)(?=PRACTICE_QUESTIONS:|$)/i
        );

      const practiceQuestionsMatch =
        plan.match(
          /PRACTICE_QUESTIONS:\s*([\s\S]*)/i
        );

      const objectives =
        objectivesMatch?.[1]?.trim() ||
        "No objectives generated.";

      const lesson_outline =
        lessonOutlineMatch?.[1]?.trim() ||
        "No lesson outline generated.";

      const practice_questions =
        practiceQuestionsMatch?.[1]?.trim() ||
        "No practice questions generated.";

      const {
        data: newPlan,
        error,
      } = await supabase
        .from("session_plans")
        .insert({
          session_id: session.id,
          objectives,
          lesson_outline,
          practice_questions,
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(
          "Plan save error: " +
            error.message
        );
        return;
      }

      setSavedPlan(newPlan);
      setPlan("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save AI plan."
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-800 p-8">
        <p>Loading session...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p>
          {errorMessage ||
            "Session not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-800 p-8">
      <div className="max-w-4xl text-gray-800 mx-auto">

        <button
          onClick={() =>
            router.push(
              `/tutor/students/${session.student_id}`
            )
          }
          className="text-blue-600 mb-6"
        >
          ← Back to Student
        </button>

        <div className="bg-white rounded-xl shadow p-6">

          <h1 className="text-3xl text-gray-800 font-bold">
            {session.topic}
          </h1>

          <p className="text-gray-600 mt-2">
            {new Date(
              session.scheduled_at
            ).toLocaleString()}
          </p>

          <div className="mt-4">
            <span className="bg-gray-400 px-4 py-2 rounded-full">
              Status: {session.status}
            </span>
          </div>

          {errorMessage && (
            <div className="bg-red-100 text-red-600 p-4 rounded-lg mt-5">
              {errorMessage}
            </div>
          )}

          {/* Scheduled */}
          {session.status ===
            "scheduled" && (
            <div className="mt-8">

              <button
                onClick={generatePlan}
                disabled={
                  generatingPlan
                }
                className="bg-blue-600 text-white px-5 py-3 rounded-lg mr-4 disabled:opacity-50"
              >
                {generatingPlan
                  ? "Generating AI Plan..."
                  : "Generate AI Plan"}
              </button>

              <button
                onClick={startSession}
                className="bg-green-600 text-white px-5 py-3 rounded-lg"
              >
                Start Session
              </button>

              {savedPlan && (
                <div className="mt-6 bg-blue-50 p-5 rounded-lg border">

                  <h2 className="text-xl font-bold mb-4">
                    Saved AI Pre-Session Plan
                  </h2>

                  <h3 className="font-bold">
                    Objectives
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.objectives
                    }
                  </div>

                  <h3 className="font-bold mt-4">
                    Lesson Outline
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.lesson_outline
                    }
                  </div>

                  <h3 className="font-bold mt-4">
                    Practice Questions
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.practice_questions
                    }
                  </div>

                </div>
              )}

              {plan && (
                <div className="mt-6 bg-white p-5 rounded-lg border">

                  <h2 className="text-xl font-bold mb-3">
                    AI Pre-Session Plan
                  </h2>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {plan}
                  </div>

                  <button
                    onClick={savePlan}
                    className="mt-5 bg-green-600 text-white px-5 py-3 rounded-lg"
                  >
                    Save AI Plan
                  </button>

                </div>
              )}

            </div>
          )}

          {/* In Progress */}
          {session.status ===
            "in_progress" && (
            <div className="mt-8">

              {savedPlan && (
                <div className="mb-6 bg-blue-50 p-5 rounded-lg border">

                  <h2 className="text-xl font-bold mb-4">
                    AI Pre-Session Plan
                  </h2>

                  <h3 className="font-bold">
                    Objectives
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.objectives
                    }
                  </div>

                  <h3 className="font-bold mt-4">
                    Lesson Outline
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.lesson_outline
                    }
                  </div>

                  <h3 className="font-bold mt-4">
                    Practice Questions
                  </h3>

                  <div className="whitespace-pre-wrap text-gray-700">
                    {
                      savedPlan.practice_questions
                    }
                  </div>

                </div>
              )}

              <h2 className="text-xl font-bold mb-3">
                Live Session Notes
              </h2>

              <textarea
                value={notes}
                onChange={
                  handleNotesChange
                }
                placeholder="Write live notes here..."
                rows={10}
                className="w-full border rounded-lg p-4"
              />

              {/* Autosave Status */}
              <div className="mt-2 text-sm">

                {notesSaveStatus ===
                  "unsaved" && (
                  <p className="text-orange-600">
                    ● Unsaved changes
                  </p>
                )}

                {notesSaveStatus ===
                  "saving" && (
                  <p className="text-blue-600">
                    ● Saving...
                  </p>
                )}

                {notesSaveStatus ===
                  "saved" && (
                  <p className="text-green-600">
                    ✓ Saved automatically
                  </p>
                )}

                {notesSaveStatus ===
                  "error" && (
                  <p className="text-red-600">
                    ● Failed to save notes
                  </p>
                )}

              </div>

              <div className="flex gap-4 mt-4">

                <button
                  onClick={() =>
                    saveNotes()
                  }
                  disabled={
                    savingNotes
                  }
                  className="bg-blue-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
                >
                  {savingNotes
                    ? "Saving..."
                    : "Save Notes"}
                </button>

                <button
                  onClick={
                    completeSession
                  }
                  disabled={
                    savingNotes
                  }
                  className="bg-purple-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
                >
                  Complete Session
                </button>

              </div>

            </div>
          )}

          {/* Completed */}
          {session.status ===
            "completed" && (
            <div className="mt-8 bg-yellow-50 p-5 rounded-lg">

              <h2 className="font-bold text-lg">
                Session Completed
              </h2>

              <p className="text-gray-600 mt-2">
                This session is locked and ready for AI review.
              </p>

              <button
                onClick={
                  generateDebrief
                }
                disabled={
                  generatingDebrief
                }
                className="mt-5 bg-purple-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
              >
                {generatingDebrief
                  ? "Generating AI Debrief..."
                  : "Generate AI Debrief"}
              </button>

              {debrief && (
                <div className="mt-6 bg-white p-5 rounded-lg border">

                  <h2 className="text-xltext-gray-800 font-bold mb-3">
                    AI Session Debrief
                  </h2>

                  <div className="whitespace-pre-wrap text-gray-800">
                    {debrief}
                  </div>

                  <button
                    onClick={
                      saveDebrief
                    }
                    className="mt-5 bg-green-600 text-gray-800 px-5 py-3 rounded-lg"
                  >
                    Save AI Review
                  </button>

                </div>
              )}

            </div>
          )}

          {/* AI Reviewed */}
          {session.status ===
            "ai_reviewed" &&
            savedDebrief && (
              <div className="mt-8 bg-purple-50 p-6 rounded-xl border">

                <h2 className="text-2xl text-gray-800 font-bold mb-5">
                  AI Session Review
                </h2>

                <h3 className="font-bold text-gray-800 text-lg">
                  Summary
                </h3>

                <div className="whitespace-pre-wrap text-gray-800 mt-2">
                  {
                    savedDebrief.summary
                  }
                </div>

                <h3 className="font-bold text-gray-800 text-lg mt-6">
                  Homework
                </h3>

                <div className="whitespace-pre-wrap text-gray-800 mt-2">
                  {
                    savedDebrief.homework
                  }
                </div>

                <h3 className="font-bold text-gray-800 text-lg mt-6">
                  Next Focus
                </h3>

                <div className="whitespace-pre-wrap text-gray-800 mt-2">
                  {
                    savedDebrief.next_focus
                  }
                </div>

              </div>
            )}

        </div>
      </div>
    </main>
  );
}