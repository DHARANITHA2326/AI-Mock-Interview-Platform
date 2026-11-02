import { Type, Schema } from "@google/genai";

/**
 * System Prompt Templates for different interview rounds
 */
export const SYSTEM_PROMPTS = {
  RESUME_ANALYSIS: `You are an expert technical recruiter and resume parser. Your job is to extract highly granular information from the provided resume text. Be objective and identify core technical skills, major projects, education, internship history, specific technologies, strengths, and realistic weak areas where the candidate needs improvement. Return the response strictly adhering to the JSON schema.`,
  
  QUESTION_GENERATION: `You are an elite interviewer for {interviewType} role at {company}. Your goal is to generate {count} highly relevant, realistic, and challenging interview questions for a candidate with {experienceLevel} experience. The questions must be tailored to their listed skills: {skills} and projects: {projects}.
Include a mix of technical, behavioral, and practical problem-solving questions. Generate exactly {count} questions.`,

  ADAPTIVE_FOLLOWUP: `You are an active interviewer. You just asked: "{lastQuestion}" and the candidate answered: "{candidateAnswer}". 
Based on the quality of their answer, generate a follow-up question.
- If their answer was strong, dive deeper, increase the technical depth, or present a challenging edge case.
- If their answer was weak, ask a clarifying question, simplify the concept, or guide them to explain their thought process.
Keep the follow-up challenging but realistic. Do not give away the solution.`,

  ANSWER_EVALUATION: `You are an expert interviewer evaluating a candidate's response for a {role} position with {difficulty} difficulty.
Question asked: "{question}"
Candidate's response: "{answer}"
Analyze the answer across:
1. Technical Accuracy (correctness of concepts, syntax, or architecture)
2. Communication (clarity, structure, articulation, STAR structure if applicable)
3. Completeness (did they answer all parts of the question?)
4. Problem Solving (logic, algorithmic thinking, structure)
5. Grammar & Professionalism

Provide a detailed evaluation, including score out of 100, out of 10 scores for individual metrics, candidate's key strengths in the answer, weaknesses, key missing points/keywords, mistake details, suggestions for improvement, a perfect exemplar ideal answer, and a highly context-aware adaptive next question.`,

  CAREER_ADVISOR: `You are an elite career development advisor and technical mentor. 
Based on the candidate's performance across recent mock interviews, generate a personalized career advancement roadmap.
Review their core strengths and weaknesses. Suggest actionable steps, specific projects to build, courses/topics to learn, and resume improvements.`,
};

/**
 * JSON Schema definitions for structured Gemini API outputs
 */
export const SCHEMAS = {
  RESUME_ANALYSIS: {
    type: Type.OBJECT,
    properties: {
      candidateName: { type: Type.STRING, description: "Extract only information present in the resume." },
      education: { type: Type.STRING, description: "Summary string of educational credentials present in the resume." },
      structuredEducation: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            degree: { type: Type.STRING },
            institution: { type: Type.STRING },
            year: { type: Type.STRING }
          },
          required: ["degree", "institution"]
        }
      },
      skills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of core skills identified."
      },
      technicalSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Technical skills, languages, tools."
      },
      softSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Soft skills, interpersonal qualities."
      },
      projects: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Extracted project names/descriptions as string items."
      },
      structuredProjects: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING }
          },
          required: ["title", "technologies", "description"]
        },
        description: "Structured project details for frontend grid."
      },
      internships: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Internship histories as string items."
      },
      structuredInternships: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            company: { type: Type.STRING },
            duration: { type: Type.STRING }
          },
          required: ["role", "company"]
        }
      },
      certifications: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Core professional strengths."
      },
      areasToImprove: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Realistic gaps to address."
      },
      missingSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Technical skills that are missing relative to industry demands."
      },
      recommendedJobRoles: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      // Backward Compatibility properties
      technologies: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      weakAreas: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      suggestedRoles: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: [
      "candidateName",
      "education",
      "structuredEducation",
      "skills",
      "technicalSkills",
      "softSkills",
      "projects",
      "structuredProjects",
      "internships",
      "structuredInternships",
      "certifications",
      "strengths",
      "areasToImprove",
      "missingSkills",
      "recommendedJobRoles",
      "technologies",
      "weakAreas",
      "suggestedRoles"
    ]
  } as Schema,

  QUESTION_GENERATION: {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique identifier (e.g., q1, q2)" },
            text: { type: Type.STRING, description: "The full question text." },
            type: { type: Type.STRING, description: "Type of question (e.g., Technical, Behavioral, System Design, Coding)" },
            difficulty: { type: Type.STRING, description: "Difficulty level (e.g., Easy, Medium, Hard)" },
            category: { type: Type.STRING, description: "Specific topic or skill category (e.g., React, Java, STAR Behavioral)" },
            codingTemplate: { type: Type.STRING, description: "Optional coding boilerplates/templates for coding round questions" },
            expectedOutput: { type: Type.STRING, description: "Optional expected output if this is a coding question" }
          },
          required: ["id", "text", "type", "difficulty", "category"]
        }
      }
    },
    required: ["questions"]
  } as Schema,

  ADAPTIVE_FOLLOWUP: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The adaptive follow-up question text." },
      type: { type: Type.STRING },
      difficulty: { type: Type.STRING, description: "Current adaptive difficulty level: Easy, Medium, or Hard" },
      category: { type: Type.STRING },
      conceptExplored: { type: Type.STRING, description: "The concept being drilled into." }
    },
    required: ["text", "type", "difficulty", "category", "conceptExplored"]
  } as Schema,

  ANSWER_EVALUATION: {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER, description: "Score from 0 to 100 based on accuracy and presentation." },
      technicalAccuracy: { type: Type.INTEGER, description: "Out of 10 score for correctness." },
      communication: { type: Type.INTEGER, description: "Out of 10 score for speech coherence, STAR structure, or explanation." },
      confidence: { type: Type.INTEGER, description: "Out of 10 score indicating overall response confidence." },
      completeness: { type: Type.INTEGER, description: "Out of 10 score for answering all parts of the question." },
      problemSolving: { type: Type.INTEGER, description: "Out of 10 score for logical structure or algorithm efficiency." },
      mistakes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific gaps, misconceptions, or errors." },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Constructive feedback to improve this response." },
      idealAnswer: { type: Type.STRING, description: "An exemplar professional level answer showing what should have been said." },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific strengths displayed by the candidate." },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific weaknesses or areas of concern in their answer." },
      missingPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Essential points, keywords, or arguments that were missing." },
      nextQuestion: { type: Type.STRING, description: "An adaptive next question based on their performance, role, and current state." }
    },
    required: ["score", "technicalAccuracy", "communication", "confidence", "completeness", "problemSolving", "mistakes", "suggestions", "idealAnswer", "strengths", "weaknesses", "missingPoints", "nextQuestion"]
  } as Schema,

  CAREER_ADVISOR: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Overall professional summary of performance." },
      strongTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      resumeImprovements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete tips to upgrade their resume." },
      improvementRoadmap: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phase: { type: Type.STRING, description: "e.g., Short Term (1-2 weeks), Medium Term (1 month)" },
            topic: { type: Type.STRING },
            actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["phase", "topic", "actionSteps"]
        }
      }
    },
    required: ["summary", "strongTopics", "weakTopics", "resumeImprovements", "improvementRoadmap"]
  } as Schema,
};
