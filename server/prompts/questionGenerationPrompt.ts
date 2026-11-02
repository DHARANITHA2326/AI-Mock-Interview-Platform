import { Type, Schema } from "@google/genai";

export const systemPrompt = `You are an elite, highly experienced Senior Technical Interviewer, Engineering Director, and HR Talent Acquisition Specialist.

Your task is to generate {count} strictly unique, professional interview questions for a candidate with {experienceLevel} experience applying for the role {role} at {company}.
Selected Round Type: {interviewType}
Selected Subject / Tech Stack: {subject}
Candidate Domain Skills: {skills}
Candidate Projects: {projects}
Target Difficulty: {difficulty}

CRITICAL ROUND SPECIFICITY RULES:
1. IF ROUND IS "HR" / "HR ROUND" / "BEHAVIORAL":
   - STRICT REQUIREMENT: You MUST generate ONLY basic, standard Human Resources (HR) questions!
   - ABSOLUTELY NO technical questions, NO programming syntax, NO framework internals, NO system architecture, and NO database queries!
   - Every question must be a classic, foundational HR question focusing on:
     * Self-introduction, background, and passion for work
     * Professional strengths and areas for improvement / weaknesses
     * Company motivation (why this company, interest in culture)
     * Teamwork, working with colleagues, and handling interpersonal disagreements (STAR method)
     * Managing stress, pressure, and competing tight deadlines
     * Handling unexpected changes, ambiguity, or project failures
     * Career aspirations and 3-5 year vision
     * Why should we hire you over other applicants?

2. IF ROUND IS "CODING TEST" / "CODING":
   - Every question MUST be a hands-on coding problem tailored to {subject} (or general data structures/algorithms if no subject specified)!
   - Must include:
     * Clear problem statement, input specification, and output specification
     * Constraints
     * Starter templates in python, javascript, java, cpp, and sql (where applicable)
     * Exactly 3 to 4 concrete Test Cases with "input" (stringified) and "expectedOutput" (stringified)

3. IF ROUND IS "TECHNICAL ROUND":
   - Questions MUST test deep domain knowledge strictly centered on the selected Subject ({subject}):
     * If subject is Java: Java language internals, JVM, collections, concurrency, OOP, Spring Boot, etc.
     * If subject is Python: Python core, GIL, generators, asyncio, data structures, typing, frameworks, etc.
     * If subject is SQL: SQL queries, joins, indexes, transactions, normalization, aggregations, query plans, etc.
     * If subject is React: React hooks, reconciliation, state management, render cycle, performance, etc.
     * If subject is Data Structures & Algorithms: Trees, graphs, dynamic programming, sorting, complexity analysis, etc.

4. IF ROUND IS "MIXED ROUND":
   - 60% questions on the selected subject/role, and 40% basic HR behavioral questions.

Output ONLY valid JSON adhering strictly to the schema.`;

export const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { 
            type: Type.STRING, 
            description: "A unique identifier (e.g., q1, q2, q3)." 
          },
          text: { 
            type: Type.STRING, 
            description: "The full question text or coding problem prompt." 
          },
          type: { 
            type: Type.STRING, 
            description: "One of: 'Technical', 'Behavioral', 'Coding', 'System Design'." 
          },
          difficulty: { 
            type: Type.STRING, 
            description: "One of: 'Easy', 'Medium', 'Hard'." 
          },
          category: { 
            type: Type.STRING, 
            description: "The specific topic or competency assessed." 
          },
          subject: {
            type: Type.STRING,
            description: "The subject or tech stack (e.g. Java, Python, SQL, HR Behavioral)."
          },
          functionName: {
            type: Type.STRING,
            description: "Target solution function name (e.g. twoSum, isPalindrome, maxProfit, climbStairs)."
          },
          codingTemplate: { 
            type: Type.STRING, 
            description: "Starter code template." 
          },
          expectedOutput: { 
            type: Type.STRING, 
            description: "Expected output description or sample result." 
          },
          testCases: {
            type: Type.ARRAY,
            description: "Concrete test cases for coding round questions.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                input: { type: Type.STRING, description: "Input parameters representation (e.g. '[2, 7, 11, 15], 9')" },
                expectedOutput: { type: Type.STRING, description: "Expected return value (e.g. '[0, 1]')" },
                description: { type: Type.STRING }
              },
              required: ["id", "input", "expectedOutput"]
            }
          }
        },
        required: ["id", "text", "type", "difficulty", "category"]
      },
      description: "List of generated interview questions."
    }
  },
  required: ["questions"]
};
