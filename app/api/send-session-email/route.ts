import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentId,
      topic,
      scheduledAt,
    } = body;

    if (!studentId || !topic || !scheduledAt) {
      return Response.json(
        {
          error: "Missing session information.",
        },
        {
          status: 400,
        }
      );
    }

    // Server-side Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get student email and name
    const {
      data: { user: student },
      error: studentError,
    } = await supabaseAdmin.auth.admin.getUserById(
      studentId
    );

    if (studentError || !student) {
      return Response.json(
        {
          error: "Student account not found.",
        },
        {
          status: 404,
        }
      );
    }

    const studentEmail = student.email;

    if (!studentEmail) {
      return Response.json(
        {
          error: "Student email not found.",
        },
        {
          status: 400,
        }
      );
    }

    // Get student name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    const studentName =
      profile?.full_name || "Student";

    const sessionDate = new Date(
      scheduledAt
    ).toLocaleString();

    // Send email
    const { error: emailError } =
      await resend.emails.send({
        from: "TutorFlow <onboarding@resend.dev>",
to: "vnraji46@gmail.com",        subject: `New Tutoring Session Scheduled: ${topic}`,
        html: `
          <h2>Hello ${studentName},</h2>

          <p>
            A new tutoring session has been scheduled for you.
          </p>

          <p>
            <strong>Topic:</strong> ${topic}
          </p>

          <p>
            <strong>Date & Time:</strong>
            ${sessionDate}
          </p>

          <p>
            Please login to TutorFlow to view
            your upcoming session.
          </p>

          <br />

          <p>
            Regards,<br />
            TutorFlow
          </p>
        `,
      });

if (emailError) {
  console.error(
    "Resend email error:",
    emailError
  );

  return Response.json(
    {
      error: emailError.message,
    },
    {
      status: 500,
    }
  );
}
    return Response.json({
      message:
        "Session notification email sent successfully.",
    });

  } catch (error) {
    console.error(
      "Send Session Email Error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send email.",
      },
      {
        status: 500,
      }
    );
  }
}