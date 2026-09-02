import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

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
    } = body;

    if (
      !studentName ||
      !subject ||
      !sessionTopic
    ) {
      return Response.json(
        {
          error:
            "Missing required student or session information.",
        },
        {
          status: 400,
        }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const prompt = `
You are an expert private tutor.

Create a personalized pre-session lesson plan.

STUDENT PROFILE:
Name: ${studentName}
Subject: ${subject}
Current Level: ${currentLevel || "Not specified"}
Learning Goals: ${learningGoals || "Not specified"}
Weak Areas: ${weakAreas || "Not specified"}

UPCOMING SESSION:
Topic: ${sessionTopic}

Generate the response using exactly this format:

OBJECTIVES:
Write 3 clear learning objectives.

LESSON_OUTLINE:
Create a step-by-step lesson outline suitable for the student's level.

PRACTICE_QUESTIONS:
Create 5 practice questions related to the session topic.
`;

    const result = await model.generateContent(prompt);

    const plan = result.response.text();

    return Response.json({
      plan,
    });

  } catch (error) {
    console.error("AI Plan Error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate AI plan.",
      },
      {
        status: 500,
      }
    );
  }
}