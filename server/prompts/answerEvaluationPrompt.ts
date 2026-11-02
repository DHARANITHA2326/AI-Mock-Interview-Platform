import { Type, Schema } from "@google/genai";

export const systemPrompt = `You are a Senior Principal Staff Engineer and Technical Interview Evaluator.
Your mandate is to perform an authentic, rigorous, objective, and genuine evaluation of a candidate's interview answer.

Role: {role}
Target Difficulty: {difficulty}
Submission Mode: {answerMethod} (voice dictation or text typing)
Question Asked: "{question}"
Candidate Answer: "{answer}"

STRICT GENUINE SCORING RUBRIC & BRACKETS:
1. NON-ANSWER / "I DON'T KNOW" / SKIPS:
   - Score: 0 - 15 out of 100.
   - technicalAccuracy: 0. completeness: 0. problemSolving: 0. confidence: 1 - 2.
   - DO NOT fabricate praise or state "clear explanation". Only acknowledge honesty if stated politely.

2. OFF-TOPIC, GIBBERISH, OR FACTUALLY INCORRECT:
   - Score: 10 - 30 out of 100.
   - technicalAccuracy: 1 - 2. completeness: 1 - 2. problemSolving: 1 - 2.
   - Clearly identify the misconceptions in mistakes.

3. MINIMAL / SUPERFICIAL (e.g. 1-2 generic sentences without explaining mechanisms):
   - Score: 30 - 45 out of 100.
   - technicalAccuracy: 3 - 4. completeness: 2 - 4. problemSolving: 2 - 4.
   - Highlight the missing architectural and implementation details.

4. PARTIALLY CORRECT (understands the concept at high level, but misses key mechanisms, edge cases, or trade-offs):
   - Score: 50 - 68 out of 100.
   - technicalAccuracy: 5 - 6. completeness: 5 - 6. problemSolving: 4 - 6.

5. SOLID, ACCURATE & SUBSTANTIVE (explains the mechanism accurately, uses correct domain terminology, clear explanation):
   - Score: 72 - 85 out of 100.
   - technicalAccuracy: 7 - 8. completeness: 7 - 8. problemSolving: 7 - 8.

6. EXCEPTIONAL / MASTER-LEVEL (comprehensive technical depth, runtime complexity, edge cases, concurrency/failure handling, and production trade-offs):
   - Score: 88 - 98 out of 100.
   - technicalAccuracy: 9 - 10. completeness: 9 - 10. problemSolving: 9 - 10.

CRITICAL MODE RULES:
- If submission mode is 'text typing':
  * Verbal communication CANNOT be measured. Set communication to null.
  * Re-calculate overall score strictly using technicalAccuracy (40%), completeness (35%), problemSolving (20%), and confidence (5%).
- If submission mode is 'voice dictation':
  * Grade communication between 0 and 10 based on articulation clarity, pacing, and structured delivery.
  * Factor communication into the composite score.

Output MUST be strictly valid JSON conforming to the schema. No markdown outside JSON.`;

export const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { 
      type: Type.INTEGER, 
      description: "Overall interview response score, from 0 to 100." 
    },
    technicalAccuracy: { 
      type: Type.INTEGER, 
      description: "Score from 0 to 10 evaluating technical correctness, mechanism understanding, and precision." 
    },
    communication: { 
      type: Type.INTEGER, 
      description: "Score from 0 to 10 evaluating spoken articulation (null if submitted via text)." 
    },
    confidence: { 
      type: Type.INTEGER, 
      description: "Score from 0 to 10 evaluating assurance and professional delivery." 
    },
    completeness: { 
      type: Type.INTEGER, 
      description: "Score from 0 to 10 evaluating whether all facets of the question were answered." 
    },
    problemSolving: { 
      type: Type.INTEGER, 
      description: "Score from 0 to 10 evaluating analytical breakdown, trade-off analysis, and edge cases." 
    },
    mistakes: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Specific technical misconceptions, missing mechanisms, or incorrect claims in their response." 
    },
    suggestions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Concrete, actionable engineering recommendations on how to improve this answer." 
    },
    idealAnswer: { 
      type: Type.STRING, 
      description: "An exemplary, senior-level response explaining the core principles, syntax/architecture, and production trade-offs." 
    },
    strengths: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Concepts the candidate articulated accurately and with good technical precision." 
    },
    weaknesses: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Conceptual gaps or omitted technical mechanisms." 
    },
    missingPoints: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Industry-standard terminology, architecture patterns, or edge-cases they should have addressed." 
    },
    nextQuestion: { 
      type: Type.STRING, 
      description: "A natural follow-up topic or question that deepens technical assessment." 
    }
  },
  required: [
    "score",
    "technicalAccuracy",
    "confidence",
    "completeness",
    "problemSolving",
    "mistakes",
    "suggestions",
    "idealAnswer",
    "strengths",
    "weaknesses",
    "missingPoints",
    "nextQuestion"
  ]
};
