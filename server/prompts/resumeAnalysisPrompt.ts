import { Type, Schema } from "@google/genai";

export const systemPrompt = `You are an expert Technical Recruiter and Career Coach.

Analyze the following resume carefully.

Extract and return ONLY valid JSON in the specified format.

Rules:
1. Extract only information present in the resume.
2. If something is unavailable, return an empty array or empty string.
3. Do not explain anything.
4. Return only JSON.`;

export const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    candidateName: { type: Type.STRING },
    education: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    projects: { type: Type.ARRAY, items: { type: Type.STRING } },
    internships: { type: Type.ARRAY, items: { type: Type.STRING } },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedJobRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
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
      }
    },
    structuredInternships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          duration: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["role", "company"]
      }
    }
  },
  required: [
    "candidateName",
    "education",
    "skills",
    "technicalSkills",
    "softSkills",
    "projects",
    "internships",
    "certifications",
    "strengths",
    "areasToImprove",
    "missingSkills",
    "recommendedJobRoles",
    "structuredEducation",
    "structuredProjects",
    "structuredInternships"
  ]
};
