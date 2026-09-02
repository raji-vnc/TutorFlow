"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddStudentPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [weakAreas, setWeakAreas] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Get current tutor session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage(
          "Your session has expired. Please login again."
        );
        setLoading(false);
        return;
      }

      // Send student data to server API
      const response = await fetch(
        "/api/create-student",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            fullName,
            email,
            password,
            subject,
            currentLevel,
            learningGoals,
            weakAreas,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "Failed to create student account."
        );

        setLoading(false);
        return;
      }

      setSuccessMessage(
        "Student account created successfully!"
      );

      // Redirect after successful creation
      setTimeout(() => {
        router.push("/tutor");
        router.refresh();
      }, 1200);

    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      setLoading(false);
    }
  };

  return (
<main className="min-h-screen bg-gray-100 p-8 text-gray-900">      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.push("/tutor")}
          className="text-blue-600 font-medium mb-6"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8">

          <h1 className="text-3xl font-bold mb-2">
            Add New Student
          </h1>

          <p className="text-gray-800 mb-6">
            Create a new student account and learning profile.
          </p>

          {errorMessage && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-5">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-5">
              {successMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Full Name */}
            <div>
              <label className="block mb-2 font-medium">
                Student Full Name
              </label>

              <input
                type="text"
                placeholder="Enter student name"
                className="w-full border p-3 rounded-lg"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 font-medium">
                Email
              </label>

              <input
                type="email"
                placeholder="Enter student email"
                className="w-full border p-3 rounded-lg"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block mb-2 font-medium">
                Temporary Password
              </label>

              <input
                type="password"
                placeholder="Create temporary password"
                className="w-full border p-3 rounded-lg"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                minLength={6}
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block mb-2 font-medium">
                Subject
              </label>

              <input
                type="text"
                placeholder="Example: Mathematics"
                className="w-full border p-3 rounded-lg"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                required
              />
            </div>

            {/* Current Level */}
            <div>
              <label className="block mb-2 font-medium">
                Current Level
              </label>

              <input
                type="text"
                placeholder="Example: Beginner"
                className="w-full border p-3 rounded-lg"
                value={currentLevel}
                onChange={(e) =>
                  setCurrentLevel(e.target.value)
                }
                required
              />
            </div>

            {/* Learning Goals */}
            <div>
              <label className="block mb-2 font-medium">
                Learning Goals
              </label>

              <textarea
                placeholder="Enter student's learning goals"
                className="w-full border p-3 rounded-lg"
                rows={3}
                value={learningGoals}
                onChange={(e) =>
                  setLearningGoals(e.target.value)
                }
              />
            </div>

            {/* Weak Areas */}
            <div>
              <label className="block mb-2 font-medium">
                Weak Areas
              </label>

              <textarea
                placeholder="Enter student's weak areas"
                className="w-full border p-3 rounded-lg"
                rows={3}
                value={weakAreas}
                onChange={(e) =>
                  setWeakAreas(e.target.value)
                }
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-gray-800 p-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading
                ? "Creating Student..."
                : "Create Student Account"}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}