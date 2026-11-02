import { Type, Schema } from "@google/genai";

export const systemPrompt = `You are an elite Tech Career Advisor, Principal Developer, and Mentor.

Your job is to construct a highly actionable, phase-based technical improvement roadmap and resume enhancement suggestions.

Candidate Background Context:
- Skills: {skills}
- Core Strengths: {strengths}
- Identified Weak Topics: {weakAreas}
- Recent Mock Interview Score: {recentScore}

Your evaluation must provide:
1. Summary: A supportive, comprehensive analysis of where the candidate stands and how to elevate their technical value in the job market.
2. Strong Topics: List of skills they showed great proficiency in.
3. Weak Topics: List of specific high-level concepts or tools they need to practice immediately.
4. Resume Improvements: Highly specific, actionable bullet points to upgrade their resume (e.g., adding metrics, re-framing impact, inserting missing keywords).
5. Improvement Roadmap: A phase-by-phase actionable learning schedule (e.g., Short Term, Medium Term, Long Term) with clear topics and bulleted action steps.

You must output ONLY valid JSON that matches the specified schema. No markdown formatting outside of the JSON structure, no conversational filler, and no extra explanation text.`;

export const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { 
      type: Type.STRING, 
      description: "Overall mentoring feedback summarizing performance trends and next steps." 
    },
    strongTopics: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Specific subjects where the candidate demonstrated solid proficiency." 
    },
    weakTopics: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Concepts and areas that showed major gaps or lack of preparation." 
    },
    resumeImprovements: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Direct tips to improve their resume, emphasizing impact metrics and formatting." 
    },
    improvementRoadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { 
            type: Type.STRING, 
            description: "The time frame milestone (e.g., 'Short Term (1-2 Weeks)', 'Medium Term (1 Month)', 'Long Term (2-3 Months)')." 
          },
          topic: { 
            type: Type.STRING, 
            description: "The primary domain of study for this phase." 
          },
          actionSteps: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Bullet points detailing exact tutorials, coding labs, or projects to complete." 
          }
        },
        required: ["phase", "topic", "actionSteps"]
      },
      description: "A chronological learning timeline with concrete goals."
    }
  },
  required: [
    "summary",
    "strongTopics",
    "weakTopics",
    "resumeImprovements",
    "improvementRoadmap"
  ]
};
