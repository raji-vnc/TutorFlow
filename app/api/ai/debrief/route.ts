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
      sessionTopic,
      tutorNotes,
    } = body;

    // Validate required data
    if (!studentName || !sessionTopic || !tutorNotes) {
      return Response.json(
        {
          error: "Missing required session or student information.",
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
You are an AI assistant helping a private tutor prepare a post-session debrief.

Create a personalized tutoring debrief based ONLY on the student's profile and the tutor's session notes.

STUDENT PROFILE:
Name: ${studentName}
Subject: ${subject}
Current Level: ${currentLevel}
Learning Goals: ${learningGoals || "Not provided"}
Known Weak Areas: ${weakAreas || "Not provided"}

SESSION:
Topic: ${sessionTopic}

TUTOR'S LIVE NOTES:
${tutorNotes}

Return the response in this exact format:

SUMMARY:
Write a concise personalized summary of what the student learned and how they performed.

HOMEWORK:
Provide 3 to 5 specific practice tasks appropriate for the student's current level and weak areas.

NEXT_FOCUS:
Explain the most important topic or skill the tutor should focus on in the next session.

Important:
- Use the student's actual learning goals and weak areas.
- Base the analysis on the tutor's notes.
- Do not give generic tutoring advice.
- Keep the response practical and specific.
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();

    return Response.json({
      debrief: text,
    });
  }  catch (error) {
  console.error("AI Debrief Error:", error);

  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate AI debrief.",
    },
    {
      status: 500,
    }
  );
}
}