import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentName,
      subject,
      currentLevel,
      learningGoals,
      weakAreas,
      completedSessions,
    } = body;

    if (!studentName || !subject || !completedSessions) {
      return Response.json(
        {
          error: "Missing required student progress information.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error: "Gemini API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const prompt = `
You are an AI assistant helping a private tutor analyze a student's learning progress.

Create a personalized student progress summary based ONLY on the student's profile and completed tutoring session information.

STUDENT PROFILE:

Name: ${studentName}
Subject: ${subject}
Current Level: ${currentLevel}
Learning Goals: ${learningGoals || "Not provided"}
Known Weak Areas: ${weakAreas || "Not provided"}

COMPLETED TUTORING SESSIONS:

${completedSessions}

Return the response in this exact format:

OVERALL_PROGRESS:
Write a concise summary of the student's learning progress across the completed sessions.

STRENGTHS:
List the concepts or learning behaviors where the student appears to be improving.

AREAS_TO_IMPROVE:
Identify concepts or skills that still need improvement.

RECOMMENDED_NEXT_STEPS:
Provide practical recommendations for the tutor's upcoming sessions.

Important:
- Base the analysis ONLY on the completed session information provided.
- Use the student's actual learning goals and weak areas.
- Do not invent progress that is not supported by the session data.
- Keep the analysis practical and specific.
- Focus on patterns across sessions rather than describing only one session.
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();

    return Response.json({
      progressSummary: text,
    });
  } catch (error) {
    console.error("AI Progress Summary Error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate AI progress summary.",
      },
      {
        status: 500,
      }
    );
  }
}