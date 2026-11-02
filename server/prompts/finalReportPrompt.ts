import { Type, Schema } from "@google/genai";

export const systemPrompt = `You are an elite Director of Engineering and Head of Global Talent Acquisition.

Your task is to review a candidate's complete mock interview session and draft a high-quality, comprehensive Final Interview Report.

Interview Metadata:
- Role: {role}
- Company: {company}
- Difficulty: {difficulty}
- Experience Level: {experienceLevel}

Candidate Performance Data (Questions, Answers, and Evaluations):
{sessionData}

CRITICAL RULES FOR ACCURACY:
1. The Final Report summary and scores MUST STRICTLY REFLECT the candidate's actual answers.
2. If the candidate answered "I don't know", skipped, or scored poorly on questions:
   - overallScore MUST be the true composite (e.g. 0-35).
   - hiringRecommendation MUST be "No Hire".
   - overallFeedback MUST honestly state that the candidate was unable to answer key questions and exhibited clear knowledge gaps in the tested topics.
   - Strengths MUST NOT contain false claims like "demonstrated strong knowledge of core components" or "strong base understanding". If answers were "I don't know", strengths should simply note honesty/punctuality or remain minimal.
   - Weaknesses MUST clearly highlight the specific technical topics the candidate could not answer.

Evaluation Criteria & Output Details:
1. Overall Score: Construct an objective composite percentage score (0-100) based on their answers.
2. Technical, Communication, Confidence Ratings: Rate each category out of 10 based honestly on their performance.
3. Strengths: Compile 2-4 authentic strengths (or honest acknowledgments if performance was low).
4. Weaknesses: Highlight 2-4 critical constructive weaknesses or gaps where they fell short.
5. Recommended Topics: List specific topics, APIs, or architectural paradigms they need to review.
6. Overall Feedback: Write a highly professional, honest, and constructive narrative summarizing their performance.
7. Hiring Recommendation: Make an executive hiring recommendation. Choose exactly one of: 'Strong Hire', 'Hire', 'Borderline / Hire with Mentorship', 'No Hire'. If overallScore < 50, it MUST be 'No Hire'.

You must output ONLY valid JSON that matches the specified schema. No markdown formatting outside of the JSON structure, no conversational filler, and no extra explanation text.`;

export const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { 
      type: Type.INTEGER, 
      description: "Composite percentage score (0-100) representing overall performance." 
    },
    technicalRating: { 
      type: Type.INTEGER, 
      description: "Overall technical rating out of 10." 
    },
    communicationRating: { 
      type: Type.INTEGER, 
      description: "Overall communication rating out of 10." 
    },
    confidenceRating: { 
      type: Type.INTEGER, 
      description: "Overall confidence rating out of 10." 
    },
    strengths: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of core professional/technical strengths demonstrated." 
    },
    weaknesses: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of core constructive weaknesses or gaps observed." 
    },
    recommendedTopics: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Specific subjects, libraries, or methodologies they need to study." 
    },
    overallFeedback: { 
      type: Type.STRING, 
      description: "A detailed summary feedback of the candidate's complete performance." 
    },
    hiringRecommendation: { 
      type: Type.STRING, 
      description: "Hiring recommendation. Must be one of: 'Strong Hire', 'Hire', 'Borderline / Hire with Mentorship', 'No Hire'." 
    }
  },
  required: [
    "overallScore",
    "technicalRating",
    "communicationRating",
    "confidenceRating",
    "strengths",
    "weaknesses",
    "recommendedTopics",
    "overallFeedback",
    "hiringRecommendation"
  ]
};
