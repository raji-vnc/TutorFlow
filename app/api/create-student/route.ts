import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      fullName,
      email,
      password,
      subject,
      currentLevel,
      learningGoals,
      weakAreas,
    } = body;

    if (
      !fullName ||
      !email ||
      !password ||
      !subject ||
      !currentLevel
    ) {
      return Response.json(
        {
          error: "Please fill in all required fields.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get tutor token
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        {
          error: "Unauthorized request. Please login again.",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.replace(
      "Bearer ",
      ""
    );

    // Verify currently logged-in user
    const {
      data: { user: tutor },
      error: tutorError,
    } = await supabaseAdmin.auth.getUser(token);

  if (tutorError || !tutor) {
  console.error(
    "Tutor authentication error:",
    tutorError
  );

  return Response.json(
    {
      error:
        tutorError?.message ||
        "Tutor authentication failed.",
    },
    {
      status: 401,
    }
  );
}

    // Verify that logged-in user is actually a tutor
    const {
      data: tutorProfile,
      error: tutorProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", tutor.id)
      .single();

    if (
      tutorProfileError ||
      !tutorProfile ||
      tutorProfile.role !== "tutor"
    ) {
      return Response.json(
        {
          error:
            "Only tutors can create student accounts.",
        },
        {
          status: 403,
        }
      );
    }

    // Create student authentication account
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return Response.json(
        {
          error:
            authError?.message ||
            "Failed to create student account.",
        },
        {
          status: 400,
        }
      );
    }

    const studentId = authData.user.id;

    // Create profile
    const { error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: studentId,
          full_name: fullName,
          role: "student",
        });

    if (profileError) {
      return Response.json(
        {
          error: profileError.message,
        },
        {
          status: 400,
        }
      );
    }

    // Create student learning profile
    const { error: studentProfileError } =
      await supabaseAdmin
        .from("student_profiles")
        .insert({
          id: studentId,
          tutor_id: tutor.id,
          subject,
          current_level: currentLevel,
          learning_goals:
            learningGoals || null,
          weak_areas:
            weakAreas || null,
        });

    if (studentProfileError) {
      return Response.json(
        {
          error:
            studentProfileError.message,
        },
        {
          status: 400,
        }
      );
    }

    return Response.json({
      message:
        "Student account created successfully.",
    });

  } catch (error) {
    console.error(
      "Create Student Error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create student.",
      },
      {
        status: 500,
      }
    );
  }
}