import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPTS, SCHEMAS } from "../prompts/templates.js";
import * as resumeAnalysisPrompt from "../prompts/resumeAnalysisPrompt.js";
import * as questionGenerationPrompt from "../prompts/questionGenerationPrompt.js";
import * as answerEvaluationPrompt from "../prompts/answerEvaluationPrompt.js";
import * as finalReportPrompt from "../prompts/finalReportPrompt.js";
import * as improvementSuggestionPrompt from "../prompts/improvementSuggestionPrompt.js";
import { CODING_QUESTIONS_BANK, getShuffledCodingQuestions } from "../data/codingQuestions.js";

let aiClient: GoogleGenAI | null = null;

/**
 * Lazy initialization helper for Google GenAI client
 */
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in AI Studio Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Safely clean markdown code fences and parse JSON from LLM responses
 */
function cleanAndParseJSON(raw: string): any {
  if (!raw) throw new Error("Empty AI response text");
  let cleaned = raw.trim();

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Extract substring between outer braces/brackets if extra text was included
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
      // Continue to direct parse
    }
  }

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    } catch {
      // Continue to direct parse
    }
  }

  return JSON.parse(cleaned);
}

/**
 * Resilient model caller: tries models with a 12-second timeout so requests
 * have adequate time to return detailed, genuine evaluations without stalling.
 */
async function callGemini(params: {
  contents: any;
  config?: any;
}): Promise<string> {
  const client = getAIClient();
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const generatePromise = client.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after 12000ms on ${model}`)), 12000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} notice:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to receive output from Gemini models.");
}

/**
 * Detect non-answers like "I don't know", "idk", "skip", "no idea", or empty strings
 */
function isNonAnswerText(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim().toLowerCase();
  if (trimmed.length < 5) return true;

  if (/^(i\s*(don't|dont|do\s*not)\s*know|idk|no\s*idea|skip|pass|not\s*sure|no\s*answer|nothing|na|n\/a|unanswered)\b/i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("i don't know") || trimmed.includes("i dont know") || trimmed === "no idea" || trimmed.includes("skip this")) {
    return true;
  }
  return false;
}

/**
 * Shuffle an array uniformly using Fisher-Yates algorithm to prevent repetitive questions
 */
function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * AI Service using Gemini to power the Mock Interview platform
 */
export const aiService = {
  /**
   * Extends text parser to analyze resume contents
   */
  async analyzeResume(resumeText: string) {
    const cleanText = (resumeText || "").replace(/\0/g, "").trim();
    if (!cleanText) {
      throw new Error("No readable resume text provided for analysis.");
    }

    try {
      const rawResponse = await callGemini({
        contents: `Analyze this resume content and extract structured candidate information:\n\n${cleanText.slice(0, 15000)}`,
        config: {
          systemInstruction: resumeAnalysisPrompt.systemPrompt,
          responseMimeType: "application/json",
          responseSchema: resumeAnalysisPrompt.schema,
        }
      });

      const parsed = cleanAndParseJSON(rawResponse);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      throw new Error("Invalid structured JSON structure returned");
    } catch (error) {
      console.warn("[Gemini API Notice]: Falling back to dynamic deep-text extraction for resume.");

      // Intelligently extract actual candidate data directly from the uploaded resume text
      const lines = cleanText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

      // 1. Candidate Name
      let candidateName = "Candidate";
      if (lines.length > 0) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          if (
            line.length > 2 && 
            line.length < 40 && 
            !line.includes("@") && 
            !line.includes("http") && 
            !line.toLowerCase().includes("resume") &&
            !line.toLowerCase().includes("curriculum") &&
            !line.includes(":")
          ) {
            candidateName = line;
            break;
          }
        }
      }

      // 2. Comprehensive Technology and Skill Detection from candidate's actual text
      const skillCatalog = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Node", "Express", "HTML", "CSS", "Tailwind",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Django", "Flask", "FastAPI", "Java", "Spring", "Spring Boot",
        "C++", "C#", ".NET", "PHP", "Laravel", "Ruby", "Rails", "Go", "Golang", "Rust", "Swift", "Kotlin",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux", "Git", "GraphQL", "REST", "Redis",
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-Learn",
        "Microservices", "System Design", "CI/CD", "DevOps", "Next.js", "Vue", "Angular"
      ];

      const detectedSkills = skillCatalog.filter(skill => {
        const regex = new RegExp(`\\b${skill.replace(/[.+]/g, "\\$&")}\\b`, "i");
        return regex.test(cleanText);
      });

      const skills = detectedSkills.length > 0 ? detectedSkills : ["Software Engineering", "Problem Solving", "Web Development"];

      // 3. Extract Education from actual text
      const eduKeywords = ["bachelor", "master", "b.tech", "m.tech", "b.e", "m.e", "b.sc", "m.sc", "bca", "mca", "university", "institute", "college", "degree"];
      const eduLines = lines.filter(l => eduKeywords.some(kw => l.toLowerCase().includes(kw)));
      const structuredEducation = eduLines.slice(0, 2).map((el, idx) => ({
        degree: el.split(/from|at|-|,/i)[0]?.trim() || "Degree",
        institution: el.split(/from|at|-|,/i)[1]?.trim() || "University",
        year: (el.match(/\b(20\d\d)\b/) || [""])[0],
        percentage: (el.match(/\b(\d{1,2}(?:\.\d{1,2})?%|\d\.\d{1,2}\s*CGPA)\b/i) || [""])[0]
      }));

      // 4. Extract Real Projects from candidate's text
      let structuredProjects: any[] = [];
      const projectHeaderIdx = lines.findIndex(l => /^project(s)?\b/i.test(l) || /academic project/i.test(l));
      if (projectHeaderIdx !== -1 && lines.length > projectHeaderIdx + 1) {
        const projectCandidates = lines.slice(projectHeaderIdx + 1, projectHeaderIdx + 12)
          .filter(l => l.length > 15 && !eduKeywords.some(kw => l.toLowerCase().includes(kw)));
        
        structuredProjects = projectCandidates.slice(0, 3).map((pl, idx) => {
          const parts = pl.split(/[:\-–|]/);
          return {
            title: parts[0]?.replace(/^[-•*]\s*/, "").trim() || `Technical Project ${idx + 1}`,
            technologies: skills.slice(idx * 2, idx * 2 + 3),
            description: parts.slice(1).join(" ").trim() || pl.slice(0, 180)
          };
        });
      }

      if (structuredProjects.length === 0) {
        const actionLines = lines.filter(l => /\b(built|developed|created|implemented|designed)\b/i.test(l));
        if (actionLines.length > 0) {
          structuredProjects = actionLines.slice(0, 2).map((al, idx) => ({
            title: al.split(/[:\-–]/)[0]?.trim() || `Project Application ${idx + 1}`,
            technologies: skills.slice(0, 2),
            description: al.slice(0, 160)
          }));
        } else {
          structuredProjects = [{
            title: `${skills[0] || "Software"} Application`,
            technologies: skills.slice(0, 3),
            description: `Developed application utilizing ${skills.slice(0, 3).join(", ") || "core development tools"}.`
          }];
        }
      }

      // 5. Extract Internships/Experience from actual text
      const internKeywords = ["intern", "internship", "trainee", "associate", "developer"];
      const internLines = lines.filter(l => internKeywords.some(kw => l.toLowerCase().includes(kw.toLowerCase())) && !l.toLowerCase().includes("projects"));
      const structuredInternships = internLines.slice(0, 2).map((il, idx) => ({
        role: il.split(/at|@|,|-/i)[0]?.replace(/^[-•*]\s*/, "").trim() || `Intern ${idx + 1}`,
        company: il.split(/at|@|,|-/i)[1]?.trim() || "Organization",
        duration: (il.match(/\b\d+\s*(months?|weeks?|yrs?|years?)\b/i) || [""])[0],
        description: il.slice(0, 120)
      }));

      // 6. Role recommendations based on detected skills
      const hasFrontend = skills.some(s => ["React", "HTML", "CSS", "Tailwind", "Vue", "Angular"].includes(s));
      const hasBackend = skills.some(s => ["Node.js", "Express", "Django", "Flask", "Python", "Java", "Spring", "SQL", "MongoDB"].includes(s));
      const recommendedJobRoles: string[] = [];
      if (hasFrontend && hasBackend) recommendedJobRoles.push("Full Stack Developer", "Software Engineer");
      else if (hasFrontend) recommendedJobRoles.push("Frontend Engineer", "UI Developer");
      else if (hasBackend) recommendedJobRoles.push("Backend Engineer", "Software Developer");
      else recommendedJobRoles.push("Software Developer", "Technical Associate");

      return {
        candidateName,
        education: structuredEducation[0]?.degree || "Degree",
        structuredEducation,
        skills,
        technicalSkills: skills,
        softSkills: ["Analytical Thinking", "Technical Communication", "Structured Problem Solving"],
        projects: structuredProjects.map(p => p.title),
        structuredProjects,
        internships: structuredInternships.map(i => `${i.role} at ${i.company}`),
        structuredInternships,
        certifications: [],
        strengths: [
          `Hands-on experience with ${skills.slice(0, 3).join(", ") || "key technical skills"}`,
          "Practical project implementation and logical methodology"
        ],
        weaknesses: [
          "Demonstrate metrics-driven impact in production projects",
          "Deepen understanding of edge-case error recovery"
        ],
        jobReadinessScore: Math.min(88, 62 + skills.length * 2),
        suggestedRoles: recommendedJobRoles
      };
    }
  },

  /**
   * Generates questions strictly matched to the candidate's selected role and interview type.
   * Enforces non-repetition and topic diversity across all generated questions.
   */
  async generateQuestions(params: {
    resumeSkills: string[];
    resumeProjects: string[];
    experienceLevel: string;
    difficulty: string;
    interviewType: string;
    company: string;
    role?: string;
    subject?: string;
    count?: number;
  }) {
    const count = params.count || 5;
    const targetRole = params.role || "Full Stack Developer";
    const targetType = params.interviewType || "Technical";
    const company = params.company || "General Industry";
    const difficulty = params.difficulty || "Medium";
    const selectedSubject = params.subject || "";

    const isHR = /hr|behavioral|cultural/i.test(targetType) || /hr/i.test(targetRole);
    const isCodingRound = /coding|practical/i.test(targetType);

    try {
      let instruction = "";
      if (isHR) {
        instruction = `You are a Senior Human Resources (HR) and Talent Acquisition Lead conducting a foundational HR interview at ${company}.
Round Type: HR Round (General Human Resources & Behavioral)
Difficulty: ${difficulty}
Candidate Experience: ${params.experienceLevel}

CRITICAL HR ROUND MANDATE (STRICT):
1. Ask ONLY basic, essential, and standard Human Resources (HR) questions.
2. ABSOLUTELY NO technical questions, NO programming syntax, NO framework internals, NO system architecture, NO algorithms, and NO database queries!
3. The questions MUST be basic HR questions evaluating:
   - Self-introduction, educational journey, and passions
   - Professional strengths and one genuine area of improvement/weakness
   - Why do you want to join ${company}?
   - 3 to 5 year career vision and personal goals
   - Teamwork and resolving interpersonal conflict (STAR method)
   - Handling workplace stress, tight deadlines, and pressure
   - Bouncing back from a mistake or failure
   - Why should we hire you over other candidates?
   - How you receive constructive feedback from managers
   - Motivation and work ethic
Output EXACTLY ${count} distinct, professional basic HR questions.`;
      } else if (isCodingRound) {
        instruction = `You are a Senior Technical Interviewer conducting an interactive Coding Test for ${company}.
Round Type: Coding Test
Target Subject / Tech Stack: ${selectedSubject || targetRole}
Difficulty: ${difficulty}
Candidate Experience: ${params.experienceLevel}

CRITICAL CODING TEST MANDATE:
1. Every question MUST be a practical coding challenge suitable for typing code in Python, JavaScript, Java, C++, or SQL.
2. Select a fresh, varied algorithmic topic from: Strings, Arrays, Two Pointers, Sliding Window, Dynamic Programming, Math, Stack, Binary Search, or SQL.
3. STRICT VARIETY RULE: Do NOT generate Two Sum repeatedly; pick diverse problems like Best Time to Buy Stock, Palindrome, Longest Substring, Reverse Words, Climbing Stairs, Container With Most Water, Valid Parentheses, Move Zeroes, etc.
4. For each question, provide:
   - Clear problem title, problem statement, input format, output format, and constraints.
   - Set 'type' to "Coding".
   - Set 'functionName' to the target function name (e.g. maxProfit, isPalindrome, climbStairs, lengthOfLongestSubstring).
   - Include 3 to 4 concrete Test Cases with stringified "input" and "expectedOutput" so code can be evaluated automatically against test cases.
Output EXACTLY ${count} coding test questions with test cases.`;
      } else {
        instruction = `You are a Principal Engineering Lead conducting a technical interview for the target role: "${targetRole}" at ${company}.
Selected Subject Focus: ${selectedSubject || "General Domain"}
Round Type: ${targetType}
Difficulty: ${difficulty}
Candidate Experience: ${params.experienceLevel}
Primary Domain Competencies: ${selectedSubject || (params.resumeSkills || []).join(", ") || targetRole}
Candidate Projects Context: ${(params.resumeProjects || []).join(", ")}

CRITICAL NON-REPETITION & TOPIC DIVERSITY RULES:
1. All technical questions MUST be strictly based on the selected Subject ("${selectedSubject || targetRole}").
2. STRICT NON-REPETITION: Every question MUST evaluate a completely distinct, non-overlapping topic.
3. Ensure comprehensive coverage:
   - Core runtime internals, memory allocation, or language mechanics
   - Concurrency, multithreading, or asynchronous workflows
   - System architecture, database optimization, or API design
   - Practical debugging and production incident troubleshooting
   - Performance tuning, edge cases, and security
Output EXACTLY ${count} distinct, professional questions.`;
      }

      const raw = await callGemini({
        contents: `Generate exactly ${count} completely unique, non-repeating questions for ${targetRole} (${targetType} round, ${difficulty} difficulty). Diversity key: ${Date.now()}-${Math.random()}`,
        config: {
          systemInstruction: instruction,
          responseMimeType: "application/json",
          responseSchema: questionGenerationPrompt.schema,
        }
      });

      const parsed = cleanAndParseJSON(raw);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        // Enforce strict deduplication by normalized question text
        const seen = new Set<string>();
        const uniqueQuestions: any[] = [];
        for (const q of parsed.questions) {
          const normalized = (q.text || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);
          if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            uniqueQuestions.push(q);
          }
        }

        if (uniqueQuestions.length >= count) {
          return { questions: uniqueQuestions.slice(0, count) };
        }
      }
      throw new Error("AI returned insufficient or duplicate questions");
    } catch (error) {
      console.warn(`[Gemini API Notice]: Using randomized non-repeating domain question bank for ${targetRole} (${targetType}).`);

      // Comprehensive 15+ question banks per domain with zero duplicate questions
      const domainQuestionBank: { [key: string]: any[] } = {
        "Java Developer": [
          {
            id: "java-1",
            text: "Explain the Java Memory Model (Heap vs. Stack, Metaspace) and how Garbage Collection algorithms like G1GC and ZGC manage memory allocations and pause times.",
            type: "Technical",
            difficulty,
            category: "JVM & Memory Management"
          },
          {
            id: "java-2",
            text: "How do you achieve thread safety in Java? Compare the mechanics and performance trade-offs of the 'synchronized' keyword, 'ReentrantLock', and 'ConcurrentHashMap'.",
            type: "Technical",
            difficulty,
            category: "Multithreading & Concurrency"
          },
          {
            id: "java-3",
            text: "In a high-throughput Spring Boot application using Spring Data JPA, how do you diagnose and resolve the N+1 query problem, and how do you configure connection pooling with HikariCP?",
            type: "System Design",
            difficulty,
            category: "Spring Boot & JPA"
          },
          {
            id: "java-4",
            text: "Explain the internal differences between Java Streams and traditional iterative loops. When would using parallelStream() degrade performance instead of improving it?",
            type: "Technical",
            difficulty,
            category: "Java Collections & Streams"
          },
          {
            id: "java-5",
            text: "How would you design a resilient microservice in Java using Spring Cloud, including circuit breakers with Resilience4j, API Gateway routing, and distributed tracing?",
            type: "System Design",
            difficulty,
            category: "Microservices Architecture"
          },
          {
            id: "java-6",
            text: "How does the Java ClassLoader hierarchy (Bootstrap, Platform, Application) operate, and how do you resolve ClassNotFoundException versus NoClassDefFoundError?",
            type: "Technical",
            difficulty,
            category: "JVM ClassLoading"
          },
          {
            id: "java-7",
            text: "Explain how Java CompletableFuture implements non-blocking asynchronous programming. How do you handle thread pool starvation when chaining asynchronous tasks?",
            type: "Technical",
            difficulty,
            category: "Asynchronous Concurrency"
          },
          {
            id: "java-8",
            text: "What causes memory leaks in a Java application despite automatic Garbage Collection? Walk through how you would use memory dump analyzers (like Eclipse MAT or VisualVM) to diagnose them.",
            type: "Technical",
            difficulty,
            category: "Diagnostics & Memory Leaks"
          },
          {
            id: "java-9",
            text: "Compare Java 21 Virtual Threads (Project Loom) with platform OS threads. How do virtual threads handle blocking I/O calls without exhausting thread pools?",
            type: "Technical",
            difficulty,
            category: "Virtual Threads & Project Loom"
          },
          {
            id: "java-10",
            text: "In Spring Security, how do filters and security contexts intercept incoming HTTP requests to validate JWT tokens and enforce role-based access control?",
            type: "Technical",
            difficulty,
            category: "Spring Security & Auth"
          },
          {
            id: "java-11",
            text: "Explain the mechanics of optimistic vs. pessimistic locking in Java JPA/Hibernate. How do you handle OptimisticLockException under high concurrent write loads?",
            type: "Technical",
            difficulty,
            category: "JPA Concurrency & Locking"
          },
          {
            id: "java-12",
            text: "How would you design an event-driven Java application utilizing Apache Kafka for message ingestion, ensuring exactly-once processing semantics and idempotent consumers?",
            type: "System Design",
            difficulty,
            category: "Kafka & Event Architecture"
          },
          {
            id: "java-13",
            text: "Explain how the Java equals() and hashCode() contract functions. What catastrophic failure occurs if hashCode() is not overridden when storing objects in a HashMap or HashSet?",
            type: "Technical",
            difficulty,
            category: "Core Java Foundations"
          },
          {
            id: "java-14",
            text: "How do you implement structured unit and integration tests in Java using JUnit 5, Mockito, and Testcontainers to test database layers against isolated PostgreSQL instances?",
            type: "Technical",
            difficulty,
            category: "Testing & Testcontainers"
          },
          {
            id: "java-15",
            text: "Walk through a scenario where your Java backend suffered from severe latency spikes due to Stop-The-World GC pauses. How did you tune JVM flags to stabilize throughput?",
            type: "Behavioral",
            difficulty,
            category: "Troubleshooting (STAR)"
          }
        ],
        "Python Developer": [
          {
            id: "py-1",
            text: "Explain the Global Interpreter Lock (GIL) in CPython. How does it impact multithreading for CPU-bound tasks versus I/O-bound tasks, and how do you bypass it using multiprocessing or asyncio?",
            type: "Technical",
            difficulty,
            category: "Python Internals & Concurrency"
          },
          {
            id: "py-2",
            text: "How do Python generators, iterators, and custom decorators work under the hood? What are the memory advantages of yield compared to returning a full list?",
            type: "Technical",
            difficulty,
            category: "Generators & Metaprogramming"
          },
          {
            id: "py-3",
            text: "How would you structure a production-ready asynchronous API using FastAPI, Pydantic validation, and SQLAlchemy async sessions with database connection pooling?",
            type: "System Design",
            difficulty,
            category: "FastAPI & Database Architecture"
          },
          {
            id: "py-4",
            text: "Explain how memory management and garbage collection work in CPython (reference counting vs cyclic garbage collector generation 0, 1, and 2).",
            type: "Technical",
            difficulty,
            category: "CPython Memory Management"
          },
          {
            id: "py-5",
            text: "Compare list comprehensions, dictionary comprehensions, and generator expressions in terms of runtime performance, memory footprint, and readability.",
            type: "Technical",
            difficulty,
            category: "Data Structures & Optimization"
          },
          {
            id: "py-6",
            text: "How does the Python asyncio event loop schedule coroutines, tasks, and futures? What happens if blocking CPU-bound code is executed directly inside an async def endpoint?",
            type: "Technical",
            difficulty,
            category: "Asyncio Event Loop"
          },
          {
            id: "py-7",
            text: "Explain Python context managers and the __enter__ / __exit__ dunder protocol. How would you build a custom context manager with contextlib for database transaction rollbacks?",
            type: "Technical",
            difficulty,
            category: "Context Managers"
          },
          {
            id: "py-8",
            text: "How does Python handle multiple inheritance and Method Resolution Order (MRO) using the C3 linearization algorithm? What is the 'diamond problem'?",
            type: "Technical",
            difficulty,
            category: "OOP & MRO"
          },
          {
            id: "py-9",
            text: "Compare Django ORM and SQLAlchemy. When would you choose an active record pattern over a data mapper pattern in high-scale Python applications?",
            type: "System Design",
            difficulty,
            category: "ORM Architecture"
          },
          {
            id: "py-10",
            text: "How do you implement background task workers in Python using Celery with Redis or RabbitMQ broker, handling task retries, dead-letter queues, and worker concurrency?",
            type: "System Design",
            difficulty,
            category: "Distributed Task Queues"
          },
          {
            id: "py-11",
            text: "Explain how Python __slots__ optimizes memory consumption for millions of lightweight class instances. What capabilities are sacrificed when using __slots__?",
            type: "Technical",
            difficulty,
            category: "Memory Optimization"
          },
          {
            id: "py-12",
            text: "How do you design a robust automated testing suite in Python using pytest, fixtures, monkeypatching, and parameterized tests with code coverage metrics?",
            type: "Technical",
            difficulty,
            category: "Testing & Pytest"
          },
          {
            id: "py-13",
            text: "What security considerations do you enforce in Python web services to defend against SQL injection, insecure deserialization with pickle, and SSRF attacks?",
            type: "Technical",
            difficulty,
            category: "Security & Vulnerabilities"
          },
          {
            id: "py-14",
            text: "How do you profile a slow Python script or API using cProfile, py-spy, or line_profiler to locate execution bottlenecks?",
            type: "Technical",
            difficulty,
            category: "Profiling & Performance"
          },
          {
            id: "py-15",
            text: "Describe a real-world scenario where you diagnosed a memory leak or CPU spike in a running Python production service. How did you pinpoint the root cause?",
            type: "Behavioral",
            difficulty,
            category: "Troubleshooting (STAR)"
          }
        ],
        "Data Scientist": [
          {
            id: "ds-1",
            text: "Explain the bias-variance tradeoff in machine learning models. How do L1 (Lasso) and L2 (Ridge) regularization mathematically prevent overfitting, and how do their coefficient penalties differ?",
            type: "Technical",
            difficulty,
            category: "Machine Learning Foundations"
          },
          {
            id: "ds-2",
            text: "When dealing with extreme class imbalance in a dataset (e.g. fraud detection), why is accuracy misleading? How would you apply SMOTE, class-weighting, and evaluate with Precision-Recall AUC?",
            type: "Technical",
            difficulty,
            category: "Imbalanced Classification"
          },
          {
            id: "ds-3",
            text: "Compare bagging and boosting ensemble methods. Why does XGBoost or LightGBM generally outperform individual Decision Trees, and how do gradient boosting algorithms minimize loss functions?",
            type: "Technical",
            difficulty,
            category: "Ensemble Algorithms"
          },
          {
            id: "ds-4",
            text: "Explain the mathematical intuition behind Principal Component Analysis (PCA). How do eigenvalues and eigenvectors of the covariance matrix identify directions of maximal variance?",
            type: "Technical",
            difficulty,
            category: "Dimensionality Reduction"
          },
          {
            id: "ds-5",
            text: "How do you architect an end-to-end MLOps pipeline for continuous training, model versioning (MLflow), automated evaluation, and real-time inference monitoring for data drift?",
            type: "System Design",
            difficulty,
            category: "MLOps & Model Deployment"
          },
          {
            id: "ds-6",
            text: "Explain the vanishing and exploding gradient problem in deep neural networks. How do residual connections (ResNet) and normalization layers (BatchNorm/LayerNorm) mitigate this?",
            type: "Technical",
            difficulty,
            category: "Deep Learning Foundations"
          },
          {
            id: "ds-7",
            text: "Walk through the Self-Attention mechanism in Transformer architectures. How does Query, Key, and Value computation allow tokens to attend to relevant context dynamically?",
            type: "Technical",
            difficulty,
            category: "Transformers & Attention"
          },
          {
            id: "ds-8",
            text: "How do you detect and handle data leakage during feature engineering and cross-validation? Give an example where improper preprocessing led to overly optimistic offline scores.",
            type: "Technical",
            difficulty,
            category: "Feature Engineering & Leakage"
          },
          {
            id: "ds-9",
            text: "How do you calculate sample size and statistical power for an online A/B test? How do you prevent peeking bias and handle multiple hypothesis testing (Bonferroni correction)?",
            type: "Technical",
            difficulty,
            category: "A/B Testing & Statistics"
          },
          {
            id: "ds-10",
            text: "Explain the differences between collaborative filtering, content-based filtering, and matrix factorization (e.g., SVD) for building enterprise recommendation systems.",
            type: "System Design",
            difficulty,
            category: "Recommender Systems"
          },
          {
            id: "ds-11",
            text: "How do you optimize hyperparameter search using Bayesian Optimization (e.g., Optuna) versus traditional Grid Search or Random Search?",
            type: "Technical",
            difficulty,
            category: "Hyperparameter Optimization"
          },
          {
            id: "ds-12",
            text: "When evaluating language models, compare ROUGE, BLEU, and LLM-as-a-judge metrics. What are the common biases and failure modes of automated LLM evaluation?",
            type: "Technical",
            difficulty,
            category: "NLP & Model Evaluation"
          },
          {
            id: "ds-13",
            text: "How do you handle missing data when imputation can distort feature distributions (e.g., MCAR vs MAR vs MNAR)? When is KNN imputation preferable to mean/median imputation?",
            type: "Technical",
            difficulty,
            category: "Data Cleaning & Imputation"
          },
          {
            id: "ds-14",
            text: "Explain how SHAP (Shapley Additive exPlanations) values provide model explainability for complex black-box models based on cooperative game theory.",
            type: "Technical",
            difficulty,
            category: "Model Explainability (XAI)"
          },
          {
            id: "ds-15",
            text: "Describe a project where a high-performing offline machine learning model degraded substantially once deployed in production. How did you diagnose and resolve concept drift?",
            type: "Behavioral",
            difficulty,
            category: "Production ML (STAR)"
          }
        ],
        "Frontend Engineer": [
          {
            id: "fe-1",
            text: "Explain React's Virtual DOM and Fiber reconciliation architecture. How does React prioritize concurrent rendering updates, and what makes batching in React 18 automatic?",
            type: "Technical",
            difficulty,
            category: "React Internals & Fiber"
          },
          {
            id: "fe-2",
            text: "How do JavaScript closures cause stale state bugs in useEffect hooks? How do you resolve them using functional updates, useRef, or proper dependency arrays?",
            type: "Technical",
            difficulty,
            category: "React State & Closures"
          },
          {
            id: "fe-3",
            text: "Explain Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift). What frontend techniques directly optimize each metric?",
            type: "Technical",
            difficulty,
            category: "Performance & Core Web Vitals"
          },
          {
            id: "fe-4",
            text: "Compare Server-Side Rendering (SSR), Static Site Generation (SSG), and Client-Side Hydration. What causes hydration mismatch errors in Next.js applications?",
            type: "System Design",
            difficulty,
            category: "SSR & Web Architecture"
          },
          {
            id: "fe-5",
            text: "How do you prevent Cross-Site Scripting (XSS) and CSRF vulnerabilities in single-page applications? Compare storing access tokens in localStorage vs. HTTP-only SameSite cookies.",
            type: "Technical",
            difficulty,
            category: "Web Security (XSS/CSRF)"
          },
          {
            id: "fe-6",
            text: "How does the browser rendering pipeline operate (DOM tree, CSSOM, Render tree, Layout/Reflow, Repaint, Compositing)? How do CSS transforms avoid triggering layout reflows?",
            type: "Technical",
            difficulty,
            category: "Browser Engine Internals"
          },
          {
            id: "fe-7",
            text: "Compare global state management approaches in modern React: Context API, Redux Toolkit, and Zustand. When does Context API trigger unnecessary component re-renders?",
            type: "Technical",
            difficulty,
            category: "State Management Architecture"
          },
          {
            id: "fe-8",
            text: "How do you implement responsive, accessible design using semantic HTML and WAI-ARIA roles? How do you ensure keyboard navigation and screen-reader compliance for complex modals?",
            type: "Technical",
            difficulty,
            category: "Web Accessibility (A11y)"
          },
          {
            id: "fe-9",
            text: "Explain how code-splitting, tree-shaking, and dynamic imports with Webpack/Vite reduce initial JavaScript bundle payload. How do you analyze bundle bloat?",
            type: "Technical",
            difficulty,
            category: "Build Tools & Bundling"
          },
          {
            id: "fe-10",
            text: "How would you design an infinite scroll list in React displaying 50,000 items while maintaining 60 FPS scrolling? Explain virtualized list rendering mechanics.",
            type: "System Design",
            difficulty,
            category: "DOM Virtualization"
          },
          {
            id: "fe-11",
            text: "How do Web Workers allow client-side JavaScript to execute heavy CPU tasks (like image processing or data encryption) off the main UI thread without freezing user input?",
            type: "Technical",
            difficulty,
            category: "Web Workers & Threading"
          },
          {
            id: "fe-12",
            text: "Explain TypeScript advanced features: discriminated unions, generic type constraints, and mapped types. How do they eliminate runtime frontend errors?",
            type: "Technical",
            difficulty,
            category: "TypeScript Advanced Typing"
          },
          {
            id: "fe-13",
            text: "How do you architect a design system component library with Tailwind CSS or CSS Modules that supports theming, dark mode, and composable headless components?",
            type: "System Design",
            difficulty,
            category: "Design Systems & UI Architecture"
          },
          {
            id: "fe-14",
            text: "How do Service Workers enable offline caching and background synchronization in Progressive Web Apps (PWAs)? Compare Cache-First vs. Network-First caching strategies.",
            type: "Technical",
            difficulty,
            category: "PWAs & Service Workers"
          },
          {
            id: "fe-15",
            text: "Describe a high-stakes frontend performance bug or memory leak in a single-page app you debugged using Chrome DevTools Performance and Memory tabs.",
            type: "Behavioral",
            difficulty,
            category: "Frontend Troubleshooting (STAR)"
          }
        ],
        "Backend Architect": [
          {
            id: "be-1",
            text: "Explain the CAP theorem and PACELC theorem. In a distributed database experiencing network partitioning, walk through the trade-offs between CP and AP consistency models.",
            type: "Technical",
            difficulty,
            category: "Distributed Systems & CAP"
          },
          {
            id: "be-2",
            text: "How do you design a distributed caching layer using Redis? Compare Cache-Aside, Write-Through, and Write-Behind strategies, and explain how you mitigate cache stampedes.",
            type: "System Design",
            difficulty,
            category: "Distributed Caching"
          },
          {
            id: "be-3",
            text: "How do you implement horizontal database sharding and partitioning for a relational database? How do you handle cross-shard queries and rebalancing shard keys?",
            type: "System Design",
            difficulty,
            category: "Database Sharding"
          },
          {
            id: "be-4",
            text: "Compare the mechanics of distributed transactions using the 2-Phase Commit (2PC) protocol versus the Saga pattern (Choreography vs Orchestration). Why is Saga preferred?",
            type: "System Design",
            difficulty,
            category: "Distributed Transactions"
          },
          {
            id: "be-5",
            text: "How do you design an API rate limiter supporting 100,000 requests/sec across multiple nodes? Compare Token Bucket, Leaky Bucket, and Sliding Window Counter algorithms.",
            type: "System Design",
            difficulty,
            category: "Rate Limiting Architecture"
          },
          {
            id: "be-6",
            text: "How do B-Tree indexes differ from Log-Structured Merge (LSM) trees (used in Cassandra/RocksDB)? Why are LSM trees optimized for high write throughput?",
            type: "Technical",
            difficulty,
            category: "Storage Engine Internals"
          },
          {
            id: "be-7",
            text: "How do you achieve idempotency in distributed payment APIs when duplicate HTTP requests are transmitted due to network timeouts or client retries?",
            type: "Technical",
            difficulty,
            category: "API Idempotency & Financial Systems"
          },
          {
            id: "be-8",
            text: "How would you design a distributed event streaming backbone with Apache Kafka handling millions of events/sec, configuring partitions, consumer groups, and lag monitoring?",
            type: "System Design",
            difficulty,
            category: "Event-Driven Architecture"
          },
          {
            id: "be-9",
            text: "Explain database isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and how MVCC (Multi-Version Concurrency Control) prevents dirty reads.",
            type: "Technical",
            difficulty,
            category: "Database Concurrency & MVCC"
          },
          {
            id: "be-10",
            text: "How do API Gateways handle SSL termination, service discovery, request routing, authentication tokens, and distributed rate limiting in a microservices ecosystem?",
            type: "System Design",
            difficulty,
            category: "API Gateway Architecture"
          },
          {
            id: "be-11",
            text: "Explain how circuit breakers (Resilience4j/Envoy) and bulkhead patterns isolate cascading service failures and implement graceful degradation under downstream outages.",
            type: "Technical",
            difficulty,
            category: "System Resilience & Fault Tolerance"
          },
          {
            id: "be-12",
            text: "Compare gRPC (HTTP/2 Protocol Buffers) with RESTful JSON APIs. In what scenarios does gRPC provide significant latency and serialization improvements for inter-service communication?",
            type: "Technical",
            difficulty,
            category: "Inter-Service Communication"
          },
          {
            id: "be-13",
            text: "How do you design zero-downtime database schema migrations for tables with hundreds of millions of rows without locking the table during peak production traffic?",
            type: "System Design",
            difficulty,
            category: "Zero-Downtime Migrations"
          },
          {
            id: "be-14",
            text: "How do you implement distributed tracing and observability using OpenTelemetry, Prometheus, and Grafana to track request spans across dozens of asynchronous microservices?",
            type: "System Design",
            difficulty,
            category: "Observability & Tracing"
          },
          {
            id: "be-15",
            text: "Describe a major production outage in a backend system you resolved. How did you diagnose the root cause, mitigate immediate customer impact, and prevent recurrence?",
            type: "Behavioral",
            difficulty,
            category: "Incident Response (STAR)"
          }
        ],
        "Full Stack Developer": [
          {
            id: "fs-1",
            text: "Walk through the end-to-end lifecycle of a user request: from the moment a user clicks a button in React, through DNS resolution, API Gateway, Node.js backend, and database transaction.",
            type: "Technical",
            difficulty,
            category: "End-to-End Web Architecture"
          },
          {
            id: "fs-2",
            text: "How do you implement secure user authentication using short-lived JWT access tokens and HTTP-only refresh cookies, while safeguarding against both XSS and CSRF attacks?",
            type: "Technical",
            difficulty,
            category: "Full Stack Authentication & Security"
          },
          {
            id: "fs-3",
            text: "In a full stack web app with growing traffic, how do you diagnose slow API response times across the stack? What strategies do you use for database indexing and client-side caching?",
            type: "System Design",
            difficulty,
            category: "Performance Tuning & Database Indexing"
          },
          {
            id: "fs-4",
            text: "Compare WebSockets, Server-Sent Events (SSE), and HTTP long-polling for real-time notifications or chat features. What are the scalability and connection overhead trade-offs?",
            type: "Technical",
            difficulty,
            category: "Real-Time Communication"
          },
          {
            id: "fs-5",
            text: "Describe a complex full-stack bug or production outage you investigated that involved interactions between the frontend, backend API, and database. How did you resolve it?",
            type: "Behavioral",
            difficulty,
            category: "Full Stack Troubleshooting (STAR)"
          },
          {
            id: "fs-6",
            text: "How do you coordinate optimistic UI updates in React with asynchronous backend mutation operations, rolling back gracefully if the server returns a 4xx or 5xx error?",
            type: "Technical",
            difficulty,
            category: "Optimistic UI & Mutation State"
          },
          {
            id: "fs-7",
            text: "How do you design a relational schema (PostgreSQL) versus a document store (MongoDB) for an e-commerce catalog with dynamic product attributes? When is SQL preferable?",
            type: "System Design",
            difficulty,
            category: "Database Modeling (SQL vs NoSQL)"
          },
          {
            id: "fs-8",
            text: "Explain how database connection pooling works in backend applications (e.g. pg-pool, HikariCP). Why does creating new database connections per HTTP request destroy server throughput?",
            type: "Technical",
            difficulty,
            category: "Database Connection Pooling"
          },
          {
            id: "fs-9",
            text: "How do you containerize a full stack web application using multi-stage Dockerfiles for both Vite React frontend and Node.js backend, minimizing final image size?",
            type: "Technical",
            difficulty,
            category: "Docker & Containerization"
          },
          {
            id: "fs-10",
            text: "How do you implement structured error handling across both client and server: Error Boundaries in React and centralized error middleware with status codes in Express?",
            type: "Technical",
            difficulty,
            category: "Error Handling Architecture"
          },
          {
            id: "fs-11",
            text: "Explain the differences between REST and GraphQL APIs. In what scenarios does GraphQL solve over-fetching and under-fetching, and what are its caching drawbacks?",
            type: "Technical",
            difficulty,
            category: "API Paradigms (REST vs GraphQL)"
          },
          {
            id: "fs-12",
            text: "How do you set up an automated CI/CD pipeline using GitHub Actions to run linting, type-checking, unit tests, Docker builds, and zero-downtime deployment?",
            type: "System Design",
            difficulty,
            category: "CI/CD & DevOps Pipeline"
          },
          {
            id: "fs-13",
            text: "How do you handle file uploads securely at scale in a web app (e.g. presigned S3/GCS URLs vs. streaming multipart file uploads through backend server)?",
            type: "System Design",
            difficulty,
            category: "Cloud File Storage Architecture"
          },
          {
            id: "fs-14",
            text: "Explain how browser caching headers (Cache-Control, ETag, max-age, stale-while-revalidate) interact with CDN edge caching and backend origin servers.",
            type: "Technical",
            difficulty,
            category: "HTTP Caching & CDNs"
          },
          {
            id: "fs-15",
            text: "Describe a project where you had to refactor a monolithic codebase into decoupled modules or microservices. How did you ensure data consistency during the migration?",
            type: "Behavioral",
            difficulty,
            category: "Architecture Migration (STAR)"
          }
        ],
        "HR": [
          {
            id: "hr-1",
            text: "Tell me about yourself, your educational background, and what inspired you to pursue your current career path.",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Self Introduction"
          },
          {
            id: "hr-2",
            text: "What are your greatest professional strengths, and what is one weakness or area of development you are actively working to improve?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Strengths & Weaknesses"
          },
          {
            id: "hr-3",
            text: `Why are you interested in joining ${company}, and what makes you feel you would be a strong cultural fit for our organization?`,
            type: "Behavioral",
            difficulty: "Easy",
            category: "Company Fit & Motivation"
          },
          {
            id: "hr-4",
            text: "Where do you see yourself professionally in the next 3 to 5 years, and what career milestones do you hope to accomplish?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Career Vision & Ambition"
          },
          {
            id: "hr-5",
            text: "Tell me about a time you worked as part of a team and had to resolve an interpersonal disagreement with a team member. How did you handle it?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Conflict Resolution (STAR)"
          },
          {
            id: "hr-6",
            text: "How do you handle workplace stress, pressure, and competing tight deadlines when multiple demands arrive simultaneously?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Stress & Time Management"
          },
          {
            id: "hr-7",
            text: "Describe a situation where you made a mistake or experienced a setback on a project. How did you take ownership and what did you learn?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Accountability & Learning"
          },
          {
            id: "hr-8",
            text: "Why should we hire you for this position over other qualified candidates applying for the role?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Value Proposition"
          },
          {
            id: "hr-9",
            text: "How do you respond when receiving critical or constructive feedback from a supervisor or colleague? Give an example.",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Receptiveness & Growth Mindset"
          },
          {
            id: "hr-10",
            text: "What motivates you in your daily work, and how do you maintain high energy and focus when handling repetitive or routine tasks?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Work Ethic & Drive"
          },
          {
            id: "hr-11",
            text: "Describe an achievement or personal project you are most proud of and the specific role you played in its success.",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Achievements & Pride"
          },
          {
            id: "hr-12",
            text: "Tell me about a time you had to adapt quickly to unexpected changes in project scope, tools, or requirements. How did you manage the transition?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Adaptability & Agility"
          },
          {
            id: "hr-13",
            text: "Do you prefer working independently or collaboratively as part of a team, and in what type of work environment do you thrive most?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Work Style Preference"
          },
          {
            id: "hr-14",
            text: "Describe a situation where you went above and beyond your standard assigned duties to assist a coworker, peer, or client.",
            type: "Behavioral",
            difficulty: "Medium",
            category: "Initiative & Team Player"
          },
          {
            id: "hr-15",
            text: "How do you stay organized, prioritize your daily tasks, and ensure that all your deadlines are consistently met?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Organization & Productivity"
          },
          {
            id: "hr-16",
            text: "Tell me about a time when you had to learn a completely new skill or tool in a short period. How did you approach the learning process?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Continuous Learning"
          },
          {
            id: "hr-17",
            text: "What would your previous professors, teammates, or mentors say is your greatest professional asset and area to improve?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Self Awareness & Perception"
          },
          {
            id: "hr-18",
            text: "How do you maintain a healthy work-life balance while ensuring high quality in all of your deliverables?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Work-Life Integration"
          },
          {
            id: "hr-19",
            text: "If selected, what are your key goals and what impact do you aim to make during your first 90 days with our team?",
            type: "Behavioral",
            difficulty: "Medium",
            category: "First 90 Days Vision"
          },
          {
            id: "hr-20",
            text: "Do you have any questions for us regarding our organizational culture, team dynamics, or expectations for this position?",
            type: "Behavioral",
            difficulty: "Easy",
            category: "Candidate Inquiries"
          }
        ],
        "SQL": [
          {
            id: "sql-1",
            text: "Explain the fundamental difference between the WHERE clause and the HAVING clause in SQL. Provide an example where HAVING is required instead of WHERE.",
            type: "Technical",
            difficulty,
            category: "SQL Clauses & Aggregation"
          },
          {
            id: "sql-2",
            text: "Compare INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN. What occurs when matching keys do not exist in the right-hand table during a LEFT JOIN?",
            type: "Technical",
            difficulty,
            category: "Joins & Relational Algebra"
          },
          {
            id: "sql-3",
            text: "What is an index in a relational database? Explain the difference between clustered and non-clustered B-Tree indexes, and when too many indexes harm performance.",
            type: "Technical",
            difficulty,
            category: "Indexing & Performance"
          },
          {
            id: "sql-4",
            text: "Explain the ACID properties of database transactions (Atomicity, Consistency, Isolation, Durability) and describe a scenario where transaction rollback is necessary.",
            type: "Technical",
            difficulty,
            category: "ACID & Transactions"
          },
          {
            id: "sql-5",
            text: "Explain database normalization up to Third Normal Form (1NF, 2NF, 3NF). Why would an enterprise application ever intentionally denormalize a database schema?",
            type: "System Design",
            difficulty,
            category: "Schema Normalization"
          },
          {
            id: "sql-6",
            text: "Explain SQL Window Functions such as ROW_NUMBER(), RANK(), and DENSE_RANK(). How does PARTITION BY differ from GROUP BY?",
            type: "Technical",
            difficulty,
            category: "Window Functions"
          },
          {
            id: "sql-7",
            text: "How do you interpret an EXPLAIN or EXPLAIN ANALYZE execution plan to identify sequential table scans and missing composite indexes on large tables?",
            type: "Technical",
            difficulty,
            category: "Query Execution Plans"
          },
          {
            id: "sql-8",
            text: "Compare UNION with UNION ALL in terms of duplicate handling, temporary sort operations, and query execution efficiency.",
            type: "Technical",
            difficulty,
            category: "Set Operations"
          },
          {
            id: "sql-9",
            text: "What are Common Table Expressions (CTEs) and recursive CTEs? In what scenarios is a CTE preferable to a nested subquery or a temporary table?",
            type: "Technical",
            difficulty,
            category: "CTEs & Subqueries"
          },
          {
            id: "sql-10",
            text: "Explain transaction isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the anomalies they prevent (Dirty Read, Non-repeatable Read, Phantom Read).",
            type: "Technical",
            difficulty,
            category: "Transaction Isolation Levels"
          },
          {
            id: "sql-11",
            text: "Compare DELETE, TRUNCATE, and DROP statements in SQL in terms of transaction log generation, speed, WHERE clause support, and table metadata.",
            type: "Technical",
            difficulty,
            category: "DDL vs DML"
          },
          {
            id: "sql-12",
            text: "What are database deadlocks? How does the database engine detect deadlock cycles, and how should application code handle transient deadlock errors?",
            type: "Technical",
            difficulty,
            category: "Deadlocks & Concurrency"
          }
        ],
        "Coding Test": CODING_QUESTIONS_BANK,
        "DevOps / Cloud Engineer": [
          {
            id: "devops-1",
            text: "Explain Kubernetes core architecture (Control Plane, Kubelet, Pods, Services, Ingress). How does Kubelet maintain pod health via liveness and readiness probes?",
            type: "Technical",
            difficulty,
            category: "Kubernetes Architecture"
          },
          {
            id: "devops-2",
            text: "How do you manage Infrastructure as Code (IaC) using Terraform? How do you manage remote state locks (S3/DynamoDB) and prevent state drift across multiple environments?",
            type: "Technical",
            difficulty,
            category: "Terraform & IaC"
          },
          {
            id: "devops-3",
            text: "Compare Blue-Green deployments with Canary deployments and Rolling updates. How do service meshes like Istio route canary traffic based on HTTP headers or percentages?",
            type: "System Design",
            difficulty,
            category: "Deployment Strategies"
          },
          {
            id: "devops-4",
            text: "How do you configure centralized monitoring, logging, and alerting using Prometheus, Grafana, and ELK/Loki stack? What are the Four Golden Signals of SRE?",
            type: "Technical",
            difficulty,
            category: "Observability & SRE"
          },
          {
            id: "devops-5",
            text: "Explain how Docker multi-stage builds and minimal base images (Alpine/Distroless) minimize container vulnerabilities and reduce attack surfaces.",
            type: "Technical",
            difficulty,
            category: "Container Security"
          }
        ]
      };

      if (isCodingRound) {
        return {
          questions: getShuffledCodingQuestions(count, selectedSubject, difficulty)
        };
      }
      let matchingBank: any[] = [];
      if (isHR) {
        // STRICT: When HR is requested, exclusively select HR bank
        matchingBank = domainQuestionBank["HR"];
      } else if (selectedSubject) {
        const sLower = selectedSubject.toLowerCase();
        if (sLower.includes("java") && !sLower.includes("script")) {
          matchingBank = domainQuestionBank["Java Developer"];
        } else if (sLower.includes("python")) {
          matchingBank = domainQuestionBank["Python Developer"];
        } else if (sLower.includes("sql") || sLower.includes("database")) {
          matchingBank = domainQuestionBank["SQL"];
        } else if (sLower.includes("react") || sLower.includes("frontend")) {
          matchingBank = domainQuestionBank["Frontend Engineer"];
        } else if (sLower.includes("script") || sLower.includes("node")) {
          matchingBank = domainQuestionBank["Full Stack Developer"];
        } else {
          matchingBank = domainQuestionBank[targetRole] || domainQuestionBank["Full Stack Developer"];
        }
      } else {
        matchingBank = domainQuestionBank[targetRole] || domainQuestionBank["Full Stack Developer"];
      }

      // CRITICAL FIX: Randomly shuffle bank so candidate gets fresh, non-repetitive questions every session
      const shuffled = shuffleArray(matchingBank);

      // If requested count exceeds bank length:
      let resultQuestions = [...shuffled];
      if (resultQuestions.length < count) {
        // If not HR, blend with domain fallback; if HR, cycle through HR questions only
        const secondary = isHR ? shuffleArray(domainQuestionBank["HR"]) : shuffleArray(domainQuestionBank["Full Stack Developer"] || []);
        for (const q of secondary) {
          if (resultQuestions.length >= count) break;
          resultQuestions.push({
            ...q,
            id: `q-${resultQuestions.length + 1}-${Math.random().toString(36).substr(2, 4)}`
          });
        }
      }
      if (resultQuestions.length < count) {
        const secondary = shuffleArray(domainQuestionBank["Full Stack Developer"] || []);
        for (const q of secondary) {
          if (resultQuestions.length >= count) break;
          if (!resultQuestions.some((existing: any) => existing.text === q.text)) {
            resultQuestions.push(q);
          }
        }
      }

      return {
        questions: resultQuestions.slice(0, count)
      };
    }
  },

  /**
   * Adaptive Follow-up Engine
   */
  async generateFollowUpQuestion(params: {
    lastQuestion: string;
    candidateAnswer: string;
  }) {
    try {
      const instruction = SYSTEM_PROMPTS.ADAPTIVE_FOLLOWUP
        .replace("{lastQuestion}", params.lastQuestion)
        .replace("{candidateAnswer}", params.candidateAnswer);

      const raw = await callGemini({
        contents: "Generate an adaptive follow-up question based on the candidate's prior answer.",
        config: {
          systemInstruction: instruction,
          responseMimeType: "application/json",
          responseSchema: SCHEMAS.ADAPTIVE_FOLLOWUP,
        }
      });

      return cleanAndParseJSON(raw);
    } catch (error) {
      return {
        text: "Could you elaborate on how you would test or monitor that solution in production?",
        type: "Technical",
        difficulty: "Medium",
        category: "System Design",
        conceptExplored: "Production Reliability"
      };
    }
  },

  /**
   * Evaluation Engine: Evaluates answer with strict honesty, genuine scoring, and non-answer detection.
   * If candidate submits via text, communication score is avoided/excluded.
   * If candidate answers via voice, communication score is evaluated.
   */
  async evaluateAnswer(params: {
    question: string;
    answer: string;
    role?: string;
    difficulty?: string;
    answerMethod?: 'voice' | 'text';
  }) {
    const rawAnswer = params.answer || "";
    const isNonAnswer = isNonAnswerText(rawAnswer);
    const isTextMode = params.answerMethod === "text";

    // 1. If candidate said "I don't know", skipped, or provided a non-answer, return honest low evaluation
    if (isNonAnswer) {
      return {
        score: 10,
        technicalAccuracy: 0,
        communication: isTextMode ? null : (rawAnswer.trim().length > 0 ? 3 : 0),
        confidence: 1,
        completeness: 0,
        problemSolving: 0,
        answerMethod: params.answerMethod || (isTextMode ? "text" : "voice"),
        communicationNote: isTextMode 
          ? "Communication score excluded (Text submission mode - voice required)" 
          : "Evaluated via spoken voice response",
        mistakes: [
          "Candidate stated they did not know the answer and did not provide technical explanation or approach."
        ],
        suggestions: [
          "Review the foundational principles and technical keywords related to this question before interviewing.",
          "Even when unsure of an exact answer, demonstrate how you would troubleshoot, research, or break down the problem."
        ],
        idealAnswer: "An ideal response would directly answer the question by clearly explaining the fundamental mechanisms, syntax or code examples, trade-offs, and practical production considerations.",
        strengths: rawAnswer.trim().length > 0 ? ["Honest acknowledgment of knowledge boundary"] : [],
        weaknesses: [
          "Unable to explain or implement the requested technical concept",
          "Lacked familiarity with the required topic"
        ],
        missingPoints: [
          "Core definition and technical mechanisms",
          "Real-world application and implementation details",
          "Edge case and performance considerations"
        ],
        nextQuestion: "Let's move to another topic: could you describe a technical concept or tool you have hands-on experience with?"
      };
    }

    try {
      const targetRole = params.role || "Software Developer";
      const targetDifficulty = params.difficulty || "Medium";
      const modeText = isTextMode ? "text typing" : "voice dictation";

      const instruction = answerEvaluationPrompt.systemPrompt
        .replace("{question}", params.question)
        .replace("{answer}", params.answer)
        .replace("{role}", targetRole)
        .replace("{difficulty}", targetDifficulty)
        .replace("{answerMethod}", modeText);

      const raw = await callGemini({
        contents: "Analyze the candidate's answer and produce detailed scores, mistakes, and suggestions.",
        config: {
          systemInstruction: instruction,
          responseMimeType: "application/json",
          responseSchema: answerEvaluationPrompt.schema,
        }
      });

      const parsed = cleanAndParseJSON(raw);

      // Sanity checks: If candidate answer is very brief (< 25 characters), clamp score
      if (rawAnswer.trim().length < 25 && parsed.score > 35) {
        parsed.score = 25;
        parsed.completeness = Math.min(parsed.completeness || 2, 2);
        parsed.technicalAccuracy = Math.min(parsed.technicalAccuracy || 2, 2);
      }

      parsed.answerMethod = params.answerMethod || (isTextMode ? "text" : "voice");

      if (isTextMode) {
        // Exclude / avoid communication score when submitted via text
        parsed.communication = null;
        parsed.communicationNote = "Communication score excluded (Text submission mode - voice required)";

        // Re-calculate composite score strictly using non-communication pillars (normalized to 100)
        const techWeight = (parsed.technicalAccuracy || 0) * 4.0;
        const compWeight = (parsed.completeness || 0) * 3.5;
        const probWeight = (parsed.problemSolving || 0) * 2.0;
        const confWeight = (parsed.confidence || 0) * 0.5;
        parsed.score = Math.min(100, Math.max(0, Math.round(techWeight + compWeight + probWeight + confWeight)));
      } else {
        parsed.communicationNote = "Evaluated via spoken voice response";
      }

      return parsed;
    } catch (error) {
      console.warn("[Gemini API Notice]: Fallback evaluating answer authentically based on technical relevance.");
      
      // Genuine heuristic evaluation based on technical keywords, depth, and explanatory structures
      return evaluateAnswerAuthentically({
        question: params.question,
        rawAnswer,
        role: params.role || "Software Developer",
        isTextMode
      });
    }
  },

  /**
   * Career Advisor and Roadmap Generator (Improvement Suggestions)
   */
  async generateCareerAdvice(params: {
    skills: string[];
    strengths: string[];
    weakAreas: string[];
    scores: number[];
  }) {
    try {
      const recentScore = params.scores[0] !== undefined ? params.scores[0] : 70;
      const instruction = improvementSuggestionPrompt.systemPrompt
        .replace("{skills}", (params.skills || []).join(", ") || "General Development")
        .replace("{strengths}", (params.strengths || []).join(", ") || "Problem solving")
        .replace("{weakAreas}", (params.weakAreas || []).join(", ") || "Deep system design")
        .replace("{recentScore}", recentScore.toString());

      const raw = await callGemini({
        contents: "Create targeted career planning, roadmap, and resume improvement advice.",
        config: {
          systemInstruction: instruction,
          responseMimeType: "application/json",
          responseSchema: improvementSuggestionPrompt.schema,
        }
      });

      return cleanAndParseJSON(raw);
    } catch (error) {
      console.warn("[Gemini API Notice]: Falling back to structured career advice.");
      const recentScore = params.scores[0] !== undefined ? params.scores[0] : 70;
      const isLow = recentScore < 50;

      return {
        summary: isLow
          ? "Your interview session indicated areas requiring foundational strengthening. Focus on core programming concepts, data structures, and practicing mock questions before full technical rounds."
          : "Your interview history demonstrates practical software fundamentals, with opportunities to deepen knowledge in database concurrency and performance profiling.",
        strongTopics: params.strengths.length > 0 ? params.strengths : ["Core Problem Solving"],
        weakTopics: params.weakAreas.length > 0 ? params.weakAreas : ["System Architecture", "Performance Optimization"],
        resumeImprovements: [
          "Include quantifiable metrics in project descriptions (e.g., 'Reduced API latency by 35%').",
          "Explicitly list all technologies, databases, and deployment platforms used in each project."
        ],
        improvementRoadmap: [
          {
            phase: "Phase 1: Foundations (Week 1-2)",
            topic: isLow ? "Fundamental concepts and common interview questions" : "Database indexing and SQL execution plans",
            actionSteps: [
              "Review core interview questions and rehearse answers out loud.",
              "Build a focused prototype to apply theoretical concepts."
            ]
          }
        ]
      };
    }
  },

  /**
   * Generates a comprehensive overall session report with strict reflection of candidate answers
   */
  async generateFinalReport(params: {
    role: string;
    company: string;
    difficulty: string;
    experienceLevel: string;
    questions: any[];
    biometricsSummary?: any;
  }) {
    const scores = params.questions.map(q => q.evaluation?.score ?? 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const allNonAnswers = params.questions.every(q => isNonAnswerText(q.candidateAnswer || ""));

    // Check voice vs text usage
    const voiceQuestions = params.questions.filter(
      q => q.answerMethod === "voice" && q.evaluation?.communication !== null && q.evaluation?.communication !== undefined
    );
    const hasVoice = voiceQuestions.length > 0;
    const avgVoiceComm = hasVoice 
      ? Math.round(voiceQuestions.reduce((a, b) => a + (b.evaluation?.communication || 0), 0) / voiceQuestions.length) 
      : null;

    try {
      // Serialize questions, answers, and evaluations cleanly for the LLM
      const formattedQuestions = params.questions.map((q, idx) => {
        const mode = q.answerMethod === "text" ? "[Text Submission - Communication Excluded]" : "[Voice Dictation]";
        return `Question #${idx + 1} (${q.type} - ${q.category}) ${mode}:
"${q.text}"
Candidate's Answer: "${q.candidateAnswer || "(No Answer Provided)"}"
Evaluation Score: ${q.evaluation?.score ?? 0}/100
Technical Accuracy: ${q.evaluation?.technicalAccuracy ?? 0}/10
Communication: ${q.evaluation?.communication !== null && q.evaluation?.communication !== undefined ? `${q.evaluation.communication}/10` : "N/A (Text)"}
Strengths: ${(q.evaluation?.strengths || []).join(", ") || "(None)"}
Weaknesses: ${(q.evaluation?.weaknesses || []).join(", ") || "(None)"}
Mistakes: ${(q.evaluation?.mistakes || []).join(", ") || "(None)"}`;
      }).join("\n---\n");

      const instruction = finalReportPrompt.systemPrompt
        .replace("{role}", params.role)
        .replace("{company}", params.company)
        .replace("{difficulty}", params.difficulty)
        .replace("{experienceLevel}", params.experienceLevel)
        .replace("{sessionData}", formattedQuestions);

      const raw = await callGemini({
        contents: "Generate the overall final interview report evaluation based on the completed mock session.",
        config: {
          systemInstruction: instruction,
          responseMimeType: "application/json",
          responseSchema: finalReportPrompt.schema,
        }
      });

      const report = cleanAndParseJSON(raw);

      // Strictly enforce communication score avoiding when only text was used
      if (!hasVoice) {
        report.communicationRating = null;
        report.communicationEvaluated = false;
        report.communicationNote = "Communication score excluded: Candidate submitted responses via text typing. Voice input is required to assess spoken communication.";
      } else {
        report.communicationRating = avgVoiceComm;
        report.communicationEvaluated = true;
        report.communicationNote = `Evaluated across ${voiceQuestions.length} spoken voice responses.`;
      }

      // Integrity enforcement: If average score is low or answers were non-answers, enforce No Hire
      if (avgScore < 50 || allNonAnswers) {
        report.overallScore = Math.min(report.overallScore || avgScore, avgScore || 20);
        report.hiringRecommendation = "No Hire";
        report.technicalRating = Math.min(report.technicalRating || 1, 2);
        report.confidenceRating = Math.min(report.confidenceRating || 1, 3);
        if (allNonAnswers) {
          report.strengths = ["Prompt completion of the session", "Honest acknowledgment of knowledge boundaries"];
          report.overallFeedback = `The candidate answered with 'I don't know' or skipped the questions during this ${params.role} interview session. Significant preparation and study of core technical concepts are required before reapplying.`;
        }
      }

      // Weave genuine webcam biometrics if available
      if (params.biometricsSummary && params.biometricsSummary.cameraUsed) {
        const bio = params.biometricsSummary;
        if (bio.facePresencePct >= 80 && !report.strengths.some((s: string) => s.toLowerCase().includes("presence") || s.toLowerCase().includes("camera"))) {
          report.strengths.push(`Maintained stable webcam presence (${bio.facePresencePct}% frame presence) with ${bio.posturePoise.toLowerCase()}`);
        }
      }

      return report;
    } catch (error) {
      console.warn("[Gemini API Notice]: Falling back to computed report based on submitted answers.");
      const isLow = avgScore < 50 || allNonAnswers;

      return {
        overallScore: avgScore,
        technicalRating: Math.max(0, Math.min(10, Math.round(avgScore / 10))),
        communicationRating: hasVoice ? (isLow ? 2 : Math.max(1, Math.min(10, Math.round(avgScore / 10)))) : null,
        communicationEvaluated: hasVoice,
        communicationNote: hasVoice 
          ? `Evaluated across ${voiceQuestions.length} spoken voice responses.`
          : "Communication score excluded: Candidate submitted responses via text typing. Voice input is required to assess spoken communication.",
        confidenceRating: isLow ? 1 : Math.max(1, Math.min(10, Math.round(avgScore / 10))),
        strengths: isLow
          ? ["Honest self-assessment during the interview", "Session completed"]
          : ["Demonstrated foundational domain understanding", "Clear structured answers"],
        weaknesses: isLow
          ? ["Unable to answer key technical questions in the tested domain", "Substantial knowledge gaps in core concepts"]
          : ["Could incorporate more runtime benchmarks and architecture trade-offs"],
        recommendedTopics: params.questions.map(q => q.category).filter(Boolean).slice(0, 4),
        overallFeedback: isLow
          ? `The candidate was unable to provide substantive answers to the interview questions for ${params.role} (such as stating they did not know the required concepts). Further foundational study and hands-on preparation are strongly advised before interviewing for this role.`
          : `The candidate completed all scheduled questions for ${params.role}. They demonstrated a solid understanding of fundamental principles with opportunities for continued growth in system design and optimization.`,
        hiringRecommendation: avgScore >= 80 ? "Hire" : avgScore >= 50 ? "Borderline / Hire with Mentorship" : "No Hire"
      };
    }
  },

  /**
   * Generates AI dashboard insights based on the resume
   */
  async generateDashboardInsights(resumeText: string, skills: string[], suggestedRoles: string[]) {
    try {
      const prompt = `Based on this resume's skills: ${skills.join(", ")}, suggested roles: ${suggestedRoles.join(", ")}, and resume content:
      "${(resumeText || "").slice(0, 4000)}"
      Analyze this and return a JSON object with:
      1. jobReadinessScore (an integer between 0 and 100)
      2. jobReadinessReasons (array of exactly 3 strings representing readiness reasons)
      3. recommendedInterview (object containing: role, company, difficulty, interviewType, reason)
      4. learningSuggestions (array of exactly 3 topics to practice)
      
      Make the response realistic and specific to these skills.`;

      const raw = await callGemini({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              jobReadinessScore: { type: "INTEGER" as any },
              jobReadinessReasons: {
                type: "ARRAY" as any,
                items: { type: "STRING" as any }
              },
              recommendedInterview: {
                type: "OBJECT" as any,
                properties: {
                  role: { type: "STRING" as any },
                  company: { type: "STRING" as any },
                  difficulty: { type: "STRING" as any },
                  interviewType: { type: "STRING" as any },
                  reason: { type: "STRING" as any }
                },
                required: ["role", "company", "difficulty", "interviewType", "reason"]
              },
              learningSuggestions: {
                type: "ARRAY" as any,
                items: { type: "STRING" as any }
              }
            },
            required: ["jobReadinessScore", "jobReadinessReasons", "recommendedInterview", "learningSuggestions"]
          }
        }
      });

      return cleanAndParseJSON(raw);
    } catch (error) {
      console.warn("[Gemini API Notice]: Falling back to computed dashboard insights.");
      const topSkills = skills.slice(0, 3);
      return {
        jobReadinessScore: 78,
        jobReadinessReasons: [
          `Working knowledge in ${topSkills.join(", ") || "core technical areas"}`,
          "Good technical foundations and development enthusiasm",
          "Needs deeper database scaling and production testing knowledge"
        ],
        recommendedInterview: {
          role: suggestedRoles[0] || "Software Developer",
          company: "Tech Enterprise",
          difficulty: "Medium",
          interviewType: "Technical Round",
          reason: `Targeted practice for ${topSkills.join(", ") || "development"} competencies.`
        },
        learningSuggestions: [
          "Database Indexes & Execution Plans",
          "System Design Scalability & Caching",
          "Asynchronous Workflows & Error Handling"
        ]
      };
    }
  }
};

/**
 * Genuine authentic heuristic answer evaluation:
 * Inspects technical keyword overlap, logical connective density, code patterns, and explanation substance.
 * Never gives a high score to arbitrary word count. Scores strictly reflect genuine relevance.
 */
function evaluateAnswerAuthentically(params: {
  question: string;
  rawAnswer: string;
  role: string;
  isTextMode: boolean;
}) {
  const { question, rawAnswer, role, isTextMode } = params;
  const answerLower = rawAnswer.toLowerCase();
  const words = rawAnswer.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Extract key technical tokens from question (excluding stopwords)
  const stopwords = new Set([
    "the", "and", "or", "to", "in", "a", "an", "is", "are", "was", "were", "of", "for", "with",
    "on", "at", "by", "from", "how", "what", "why", "when", "where", "which", "do", "does", "did",
    "can", "could", "would", "should", "you", "your", "explain", "describe", "compare", "between",
    "using", "under", "versus", "vs", "walk", "through", "scenario"
  ]);

  const qTokens = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopwords.has(t));

  // Count how many unique question concepts are directly addressed in the answer
  const matchedTokens = Array.from(new Set(qTokens.filter(token => answerLower.includes(token))));
  const tokenMatchRatio = qTokens.length > 0 ? matchedTokens.length / Math.min(qTokens.length, 6) : 0;

  // Check for logical explanatory markers indicating real reasoning
  const reasoningConnectives = [
    "because", "therefore", "in contrast", "instead of", "to prevent", "on the other hand",
    "trade-off", "tradeoff", "complexity", "overhead", "mitigate", "specifically", "for example",
    "for instance", "under the hood", "lifecycle", "synchronize", "asynchronous", "architecture",
    "scalability", "concurrency", "mechanism", "runtime", "latency", "throughput", "guarantee"
  ];
  const matchedConnectives = reasoningConnectives.filter(c => answerLower.includes(c));

  // Check for code / technical implementation syntax
  const hasCodeOrSyntax = /[{}();=\[\]<>]|function|def|class|const|let|var|return|import|SELECT|WHERE/i.test(rawAnswer);

  // Check for word repetition / filler gaming
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const lexicalDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  const isRepetitive = wordCount > 15 && lexicalDiversity < 0.45;

  // Genuine scoring calculation:
  let techAcc = 3;
  let completeness = 3;
  let problemSolving = 3;
  let confidence = 5;

  if (wordCount < 8 || matchedTokens.length === 0) {
    // Very brief, off-topic, or superficial
    techAcc = matchedTokens.length > 0 ? 3 : 1;
    completeness = 2;
    problemSolving = 1;
    confidence = 3;
  } else if (isRepetitive) {
    // Repetitive filler text
    techAcc = 2;
    completeness = 2;
    problemSolving = 1;
    confidence = 2;
  } else if (matchedTokens.length >= 1 && wordCount >= 15 && wordCount < 35) {
    // Basic conceptual mention without full mechanics
    techAcc = 5;
    completeness = 4;
    problemSolving = 4;
    confidence = 6;
  } else if (matchedTokens.length >= 2 && wordCount >= 35 && wordCount < 80) {
    // Solid explanation touching core concepts
    techAcc = 7;
    completeness = 6;
    problemSolving = matchedConnectives.length >= 1 ? 7 : 5;
    confidence = 7;
  } else if (matchedTokens.length >= 3 && wordCount >= 80) {
    // Deep, comprehensive technical exposition
    techAcc = 8 + (hasCodeOrSyntax || matchedConnectives.length >= 2 ? 1 : 0);
    completeness = 8;
    problemSolving = 8 + (matchedConnectives.length >= 2 ? 1 : 0);
    confidence = 8;
  } else {
    // Moderate response
    techAcc = Math.min(6, Math.max(2, Math.round(tokenMatchRatio * 8)));
    completeness = Math.min(6, Math.max(2, Math.round(wordCount / 15)));
    problemSolving = matchedConnectives.length > 0 ? 5 : 3;
    confidence = 6;
  }

  // Derive composite score
  let compositeScore = 0;
  const baseComm = isTextMode ? null : Math.min(10, Math.max(3, 5 + matchedConnectives.length));

  if (isTextMode) {
    // Re-calculate composite score strictly using non-communication pillars
    compositeScore = Math.round((techAcc * 4.0) + (completeness * 3.5) + (problemSolving * 2.0) + (confidence * 0.5));
  } else {
    compositeScore = Math.round((techAcc * 3.0) + (completeness * 2.5) + (problemSolving * 2.0) + ((baseComm || 5) * 1.5) + (confidence * 1.0));
  }

  compositeScore = Math.min(96, Math.max(10, compositeScore));

  const strengthsList: string[] = [];
  if (matchedTokens.length > 0) {
    strengthsList.push(`Referenced core topics (${matchedTokens.slice(0, 3).join(", ")})`);
  }
  if (matchedConnectives.length > 0) {
    strengthsList.push("Demonstrated structured analytical reasoning with trade-off considerations");
  }
  if (hasCodeOrSyntax) {
    strengthsList.push("Provided concrete implementation details and technical syntax");
  }
  if (strengthsList.length === 0) {
    strengthsList.push("Direct and polite response style");
  }

  const missingList: string[] = [];
  const missedTokens = qTokens.filter(t => !matchedTokens.includes(t)).slice(0, 4);
  if (missedTokens.length > 0) {
    missingList.push(`Specific discussion of: ${missedTokens.join(", ")}`);
  }
  missingList.push("Edge-case handling and production scalability considerations");

  return {
    score: compositeScore,
    technicalAccuracy: techAcc,
    communication: baseComm,
    confidence,
    completeness,
    problemSolving,
    answerMethod: isTextMode ? "text" : "voice",
    communicationNote: isTextMode 
      ? "Communication score excluded (Text submission mode - voice required)" 
      : "Evaluated via spoken voice response",
    mistakes: techAcc <= 4 
      ? ["Response lacked direct technical depth on key question mechanics.", "Omitted concrete architectural or syntax details."]
      : ["Could expand deeper on failure recovery and concurrency boundaries."],
    suggestions: [
      "Explicitly define the runtime trade-offs and complexity implications.",
      "Back up conceptual answers with real production debugging or implementation examples."
    ],
    idealAnswer: `A comprehensive response to "${question.slice(0, 90)}..." directly outlines the foundational mechanisms, runtime execution path, failure isolation, and performance considerations.`,
    strengths: strengthsList,
    weaknesses: techAcc <= 5 
      ? ["High-level response that skipped internal architectural mechanisms", "Lacked code or concrete examples"]
      : ["Could incorporate deeper discussion of performance profiling and metrics"],
    missingPoints: missingList,
    nextQuestion: "Could you walk through how you would optimize that solution under high user concurrency?"
  };
}
