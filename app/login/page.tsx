"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setErrorMessage("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("User profile not found.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

 if (profile.role === "tutor") {
  router.push("/tutor");
} else if (profile.role === "student") {
  router.push("/student");
} else {
  setErrorMessage("Invalid user role.");
  await supabase.auth.signOut();
}

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold text-center mb-6">
          TutorFlow
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Sign in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="block mb-1">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border p-3 rounded-lg"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div>
            <label className="block mb-1">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border p-3 rounded-lg"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          {errorMessage && (
            <p className="text-red-500 text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>
      </div>
    </main>
  );
}