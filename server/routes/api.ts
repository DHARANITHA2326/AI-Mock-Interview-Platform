import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";
import { dbStore } from "../models/store";
import { aiService } from "../services/gemini";
import { executeCode } from "../services/codeRunner";
import { ResumeAnalysis, InterviewSession, Question, UserProfile, ProctoringEvent, IntegrityReport, ProctoringPolicy } from "../../src/types";
import { signup, login, forgotPassword, verifyOtpAndReset } from "../controllers/authController";
import multer from "multer";
import * as pdfParseModule from "pdf-parse";
import mammoth from "mammoth";
import { ResumeModel } from "../models/Resume";
import { UserModel } from "../models/User";
import { InterviewSessionModel } from "../models/Interview";
import { ProctoringEventModel, IntegrityReportModel } from "../models/Proctoring";
import { isMongoConnected } from "../services/db";
import mongoose from "mongoose";
import vm from "vm";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

async function extractTextFromBuffer(buffer: Buffer, mimetype: string, originalName: string): Promise<string> {
  const extension = originalName.split(".").pop()?.toLowerCase();
  
  try {
    if (mimetype === "application/pdf" || extension === "pdf") {
      // 1. Primary: Support pdf-parse v2 class PDFParse
      const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
      if (typeof PDFParseClass === "function") {
        const parser = new PDFParseClass({ data: buffer });
        const res = await parser.getText();
        if (typeof parser.destroy === "function") {
          try { await parser.destroy(); } catch {}
        }
        if (res && typeof res.text === "string" && res.text.trim()) {
          // Clean page boundary markers like "-- 1 of 1 --"
          const cleaned = res.text.replace(/-- \d+ of \d+ --/g, "").trim();
          if (cleaned.length > 0) return cleaned;
        }
      }

      // 2. Secondary: Support callable function if present in other versions
      const callableParser = typeof pdfParseModule === "function" ? pdfParseModule : (pdfParseModule as any).default;
      if (typeof callableParser === "function") {
        const data = await callableParser(buffer);
        if (data && data.text && data.text.trim()) {
          return data.text.trim();
        }
      }
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      extension === "docx" ||
      extension === "doc"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      if (result && result.value && result.value.trim()) {
        return result.value.trim();
      }
    } else if (
      mimetype === "text/plain" ||
      mimetype === "text/markdown" ||
      extension === "txt" ||
      extension === "text" ||
      extension === "md"
    ) {
      return buffer.toString("utf8").trim();
    }
  } catch (err) {
    console.error("Text extraction failed:", err);
  }
  
  // If PDF parsing failed or produced empty text, check for readable ASCII strings or alert user
  if (mimetype === "application/pdf" || extension === "pdf") {
    try {
      const latinStr = buffer.toString("latin1");
      const textMatches = latinStr.match(/\(([^()]{2,})\)\s*Tj/g) || latinStr.match(/\[([^\[\]]{3,})\]\s*TJ/g);
      if (textMatches && textMatches.length > 5) {
        const words = textMatches.map(m => m.replace(/[()\[\]]|Tj|TJ/g, "").trim()).filter(w => w.length > 1);
        if (words.length > 10) {
          return words.join(" ");
        }
      }
    } catch {}
    throw new Error("Unable to extract text from this PDF file. Please ensure the PDF contains selectable text (not an image scan) or paste your resume text directly.");
  }
  
  const text = buffer.toString("utf8").trim();
  if (!text) {
    throw new Error("Uploaded file is empty or unreadable. Please check the file and try again.");
  }
  return text;
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS (MVC Controllers)
// ==========================================

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/verify-otp", verifyOtpAndReset);


// ==========================================
// 2. RESUME ANALYSIS ENDPOINTS
// ==========================================

router.post("/resume/upload", requireAuth, upload.single("resume"), async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  let textContent = req.body.textContent;
  let fileName = req.body.fileName || "uploaded_resume.pdf";

  if (req.file) {
    try {
      textContent = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      fileName = req.file.originalname;
    } catch (err: any) {
      return res.status(400).json({ error: `Failed to extract text from file: ${err.message}` });
    }
  }

  if (!textContent || !textContent.trim()) {
    return res.status(400).json({ error: "Resume content is required. Please upload a PDF/DOCX file or paste text." });
  }

  try {
    const analysis = await aiService.analyzeResume(textContent);
    
    // Robust parsing for projects
    const parsedProjects = (analysis.structuredProjects || []).map((p: any) => ({
      title: p.title || "Project",
      technologies: Array.isArray(p.technologies) 
        ? p.technologies 
        : typeof p.technologies === "string" 
          ? p.technologies.split(",").map((s: string) => s.trim()).filter(Boolean) 
          : [],
      description: p.description || ""
    }));

    // Robust parsing for education
    let parsedEducation = [];
    if (Array.isArray(analysis.structuredEducation) && analysis.structuredEducation.length > 0) {
      parsedEducation = analysis.structuredEducation.map((e: any) => ({
        degree: e.degree || "Degree",
        institution: e.institution || "Institution",
        year: e.year || ""
      }));
    } else if (analysis.education && typeof analysis.education === "string") {
      parsedEducation = [{
        degree: analysis.education,
        institution: "Extracted from Resume",
        year: ""
      }];
    } else {
      parsedEducation = [{
        degree: "B.S. or equivalent degree",
        institution: "University background",
        year: ""
      }];
    }

    // Robust parsing for internships
    const parsedInternships = (analysis.structuredInternships || []).map((i: any) => ({
      role: i.role || "Intern",
      company: i.company || "Company",
      duration: i.duration || "",
      description: i.description || ""
    }));

    const savedResume: ResumeAnalysis = {
      userId,
      fileName,
      uploadedAt: new Date().toISOString(),
      skills: analysis.skills || [],
      projects: parsedProjects,
      education: parsedEducation,
      internships: parsedInternships,
      technologies: analysis.technologies || analysis.technicalSkills || [],
      strengths: analysis.strengths || [],
      weakAreas: analysis.weakAreas || analysis.areasToImprove || [],
      suggestedRoles: analysis.suggestedRoles || analysis.recommendedJobRoles || []
    };

    // Save or update in MongoDB Atlas if connected
    if (isMongoConnected()) {
      try {
        await ResumeModel.findOneAndUpdate(
          { userId },
          {
            fileName,
            uploadedAt: new Date(),
            rawText: textContent,
            skills: savedResume.skills,
            projects: savedResume.projects,
            education: savedResume.education,
            internships: savedResume.internships,
            technologies: savedResume.technologies,
            strengths: savedResume.strengths,
            weakAreas: savedResume.weakAreas,
            suggestedRoles: savedResume.suggestedRoles
          },
          { upsert: true, new: true }
        );

        // Sync user profile skills in MongoDB
        const userQuery = mongoose.Types.ObjectId.isValid(userId)
          ? { _id: userId }
          : { email: req.user?.email || "student@example.com" };
        await UserModel.updateOne(
          userQuery,
          { $addToSet: { skills: { $each: savedResume.skills } } }
        );
      } catch (dbErr) {
        console.warn("MongoDB sync notice during resume upload:", dbErr);
      }
    }

    dbStore.resumes.set(userId, savedResume);

    // Sync user skills with the newly analyzed resume skills
    const user = Array.from(dbStore.users.values()).find(u => u.id === userId);
    if (user) {
      user.skills = Array.from(new Set([...user.skills, ...savedResume.skills]));
    }

    return res.json({
      message: "Resume processed and analyzed successfully!",
      resume: savedResume
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze resume." });
  }
});

router.get("/resume/get", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  try {
    if (isMongoConnected()) {
      const dbResume = await ResumeModel.findOne({ userId });
      if (dbResume) {
        return res.json(dbResume);
      }
    }
    const resume = dbStore.resumes.get(userId);
    
    if (!resume) {
      return res.status(404).json({ error: "No analyzed resume found. Please upload one." });
    }
    return res.json(resume);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch resume." });
  }
});

router.get("/dashboard/insights", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  try {
    let resume: any = null;
    if (isMongoConnected()) {
      resume = await ResumeModel.findOne({ userId });
    }
    if (!resume) {
      resume = dbStore.resumes.get(userId);
    }

    if (!resume) {
      return res.json({
        jobReadinessScore: 0,
        jobReadinessReasons: ["Please upload your resume to calculate readiness details."],
        recommendedInterview: {
          role: "Software Developer",
          company: "General Company",
          difficulty: "Medium",
          interviewType: "Technical Round",
          reason: "Please upload your resume to view smart recommendation."
        },
        learningSuggestions: ["System Design Basic Rules", "Coding & Syntax optimization", "Standard Algorithms"]
      });
    }

    const insights = await aiService.generateDashboardInsights(
      resume.rawText || "",
      resume.skills || [],
      resume.suggestedRoles || resume.recommendedJobRoles || []
    );

    return res.json(insights);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch dashboard insights." });
  }
});

router.post("/resume/improve", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  try {
    let resume: any = null;
    if (isMongoConnected()) {
      resume = await ResumeModel.findOne({ userId });
    }
    if (!resume) {
      resume = dbStore.resumes.get(userId);
    }

    if (!resume) {
      return res.status(400).json({ error: "Analyze a resume first to suggest improvements." });
    }

    const advice = await aiService.generateCareerAdvice({
      skills: resume.skills,
      strengths: resume.strengths,
      weakAreas: resume.weakAreas,
      scores: [85, 90] // Base baseline scores
    });
    return res.json(advice);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to suggest resume improvements." });
  }
});


function inferFunctionName(text: string, template?: string): string {
  if (template) {
    const m = template.match(/(?:function|def)\s+([a-zA-Z0-9_$]+)/);
    if (m && m[1]) return m[1];
  }
  const t = (text || "").toLowerCase();
  if (t.includes("palindrome")) return "isPalindrome";
  if (t.includes("two sum") || (t.includes("target") && t.includes("indices"))) return "twoSum";
  if (t.includes("parenthes") || t.includes("bracket")) return "isValid";
  if (t.includes("stock") || t.includes("profit")) return "maxProfit";
  if (t.includes("climb") || t.includes("stairs")) return "climbStairs";
  if (t.includes("duplicate email")) return "duplicateEmails";
  if (t.includes("duplicate")) return "containsDuplicate";
  if (t.includes("anagram")) return "isAnagram";
  if (t.includes("reverse word")) return "reverseWords";
  if (t.includes("reverse")) return "reverseString";
  if (t.includes("single number")) return "singleNumber";
  if (t.includes("binary search") || (t.includes("search") && t.includes("sorted"))) return "search";
  if (t.includes("move zero")) return "moveZeroes";
  if (t.includes("last word")) return "lengthOfLastWord";
  if (t.includes("plus one")) return "plusOne";
  if (t.includes("common prefix")) return "longestCommonPrefix";
  if (t.includes("container") || t.includes("water")) return "maxArea";
  if (t.includes("longest substring")) return "lengthOfLongestSubstring";
  if (t.includes("rob")) return "rob";
  if (t.includes("subarray") || t.includes("kadane")) return "maxSubArray";
  if (t.includes("fizzbuzz")) return "fizzBuzz";
  if (t.includes("second highest")) return "secondHighestSalary";
  if (t.includes("highest salary")) return "departmentHighestSalary";
  return "solve";
}

function generateStarterTemplates(fnName: string, text: string) {
  const pyFnName = fnName.replace(/([A-Z])/g, "_$1").toLowerCase();
  const isSql = /sql|table|query|select/i.test(text);
  if (isSql) {
    return {
      sql: `-- Write your SQL query below\nSELECT *\nFROM Department\nLIMIT 10;\n`,
      javascript: `// SQL Query solution`,
      python: `# SQL Query solution`,
      java: `// SQL Query solution`,
      cpp: `// SQL Query solution`
    };
  }
  return {
    javascript: `function ${fnName}(...args) {\n  // Write your solution here\n  \n}\n`,
    python: `def ${pyFnName}(*args):\n    # Write your solution here\n    pass\n`,
    java: `class Solution {\n    public static Object ${fnName}(Object... args) {\n        // Write your solution here\n        return null;\n    }\n}\n`,
    cpp: `#include <vector>\nusing namespace std;\n\nint ${fnName}() {\n    // Write your solution here\n    return 0;\n}\n`
  };
}

// ==========================================
// 3. ADAPTIVE INTERVIEW AGENT ENDPOINTS
// ==========================================

router.post("/interview/start", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { role, company, difficulty, interviewType, questionCount, timePerQuestion, subject } = req.body;
  const userId = req.user?.id || "demo-user-123";

  // Attempt to retrieve user's analyzed resume profile to inject custom context
  let resume: any = null;
  if (isMongoConnected()) {
    try {
      resume = await ResumeModel.findOne({ userId });
    } catch (err) {
      console.warn("MongoDB Resume query failed, fallback to dbStore:", err);
    }
  }
  if (!resume) {
    resume = dbStore.resumes.get(userId);
  }

  const isHRRound = /hr|behavioral|cultural/i.test(interviewType || "") || role === "HR";
  const isCodingRound = /coding|practical/i.test(interviewType || "");

  let targetRole = role || "Full Stack Developer";
  let targetType = interviewType || "Technical";

  if (isHRRound) {
    targetRole = "Candidate (HR Round)";
    targetType = "HR Round";
  } else if (isCodingRound) {
    targetType = "Coding Test";
    if (subject) targetRole = `${subject} Developer`;
  } else if (subject) {
    targetRole = `${subject} Developer`;
  }

  const domainSkillsMap: { [key: string]: string[] } = {
    "Java Developer": [
      "Java 17/21", "JVM Architecture & Memory Management", "Garbage Collection (G1, ZGC)",
      "Multithreading & Concurrency (ExecutorService, synchronized, Locks)",
      "Spring Boot & Spring Cloud", "Hibernate & JPA", "Microservices & REST APIs",
      "OOP & SOLID Principles", "Collections Framework", "SQL & Database Transactions"
    ],
    "Python Developer": [
      "Python 3 Core", "Global Interpreter Lock (GIL)", "Memory Management & Reference Counting",
      "Decorators, Generators & Context Managers", "Asyncio & Concurrency",
      "FastAPI & Django Frameworks", "SQLAlchemy & ORM Patterns", "Data Structures in Python",
      "RESTful API Development", "PyTest & Automated Testing"
    ],
    "SQL Database Engineer": [
      "SQL Queries & DDL/DML", "Inner, Left, Right & Full Joins", "Indexes (Clustered & Non-Clustered)",
      "Transactions & ACID Properties", "Database Normalization (1NF to BCNF)", "Window Functions",
      "Query Plans & EXPLAIN ANALYZE", "Aggregations & Subqueries", "Deadlocks & Isolation Levels"
    ],
    "Data Scientist": [
      "Python for Data Science", "Pandas & NumPy", "Supervised & Unsupervised Machine Learning",
      "Scikit-Learn & Feature Engineering", "Statistics & Probability Distributions",
      "Overfitting, Regularization (L1/L2)", "Deep Learning Fundamentals",
      "SQL Data Modeling", "Model Evaluation (AUC, F1, Precision/Recall)"
    ],
    "Frontend Engineer": [
      "JavaScript (ES6+) & TypeScript", "React Framework & Hooks (useEffect, useMemo)",
      "Component Architecture & State Management", "DOM & Virtual DOM Reconciliation",
      "HTML5, CSS3, Tailwind CSS & Responsive Layouts", "Web Performance & Core Web Vitals",
      "REST APIs, GraphQL & Async Data Fetching", "Browser Security (CORS, CSP, XSS)"
    ],
    "Backend Architect": [
      "Distributed Systems & Scalability", "Microservices & Event-Driven Architecture",
      "Database Sharding, Replication & CAP Theorem", "Caching Strategies (Redis)",
      "Message Brokers (Kafka, RabbitMQ)", "API Gateways & Load Balancing",
      "Containerization (Docker, Kubernetes)", "High Availability & Fault Tolerance"
    ],
    "Full Stack Developer": [
      "React & Modern TypeScript Frontend", "Node.js / Express & Python Backend",
      "RESTful API Design & Middleware", "Relational (PostgreSQL) & NoSQL (MongoDB) Databases",
      "Authentication (JWT, OAuth)", "System Architecture & Integration",
      "Performance Tuning & Database Indexing", "CI/CD & Deployment"
    ]
  };

  let domainSkills: string[] = [];
  if (isHRRound) {
    domainSkills = [
      "Personal Introduction & Background",
      "Professional Strengths & Areas to Improve",
      "Teamwork & Conflict Resolution (STAR)",
      "Workplace Ethics & Adaptability",
      "Handling Stress & Deadlines",
      "Career Goals & 3-5 Year Vision"
    ];
  } else if (subject && subject.toLowerCase().includes("sql")) {
    domainSkills = domainSkillsMap["SQL Database Engineer"];
  } else if (subject && subject.toLowerCase().includes("java") && !subject.toLowerCase().includes("script")) {
    domainSkills = domainSkillsMap["Java Developer"];
  } else if (subject && subject.toLowerCase().includes("python")) {
    domainSkills = domainSkillsMap["Python Developer"];
  } else if (domainSkillsMap[targetRole]) {
    domainSkills = domainSkillsMap[targetRole];
  } else {
    domainSkills = [
      `${subject || targetRole} Core Competencies`, "Software Engineering Best Practices",
      "Data Structures & Algorithms", "System Architecture", "Debugging & Problem Solving"
    ];
  }

  // Preserve domain alignment
  const resumeSkills = isHRRound ? [] : (resume?.skills || []).slice(0, 3);
  const blendedSkills = isHRRound ? domainSkills : Array.from(new Set([...domainSkills, ...resumeSkills]));

  const projects = isHRRound
    ? ["Team & Project Collaboration Experience"]
    : resume?.projects?.length
    ? resume.projects.map((p: any) => p.title || p)
    : [`${targetRole} High-Throughput Service`, `${targetRole} Scalable Architecture`];

  const experienceLevel = resume ? "1-3 Years" : "Freshers";
  const count = Number(questionCount) || 5;

  try {
    const aiResponse = await aiService.generateQuestions({
      resumeSkills: blendedSkills,
      resumeProjects: projects,
      experienceLevel,
      difficulty: difficulty || "Medium",
      interviewType: targetType,
      company: company || "General Corporate",
      role: isHRRound ? "HR Candidate" : (subject ? `${subject} Specialist` : targetRole),
      subject: isHRRound ? "HR / Behavioral" : (subject || undefined),
      count
    });

    const userRecord = Array.from(dbStore.users.values()).find(u => u.id === userId);
    const candidateName = (req.body.candidateName || userRecord?.name || req.user?.name || "Student Candidate").trim();
    const registerNumber = (req.body.registerNumber || userRecord?.registerNumber || "").trim().toUpperCase();
    const studentDepartment = (req.body.studentDepartment || req.body.department || userRecord?.department || "").trim();
    const studentYear = (req.body.studentYear || req.body.year || userRecord?.year || "").trim();

    const newSession: InterviewSession = {
      id: `session-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      candidateName,
      registerNumber,
      studentDepartment,
      studentYear,
      interviewType: isHRRound ? "HR Round" : (isCodingRound ? "Coding Test" : (interviewType || "Technical Round")),
      difficulty: difficulty || "Medium",
      experienceLevel,
      company: company || "General Industry",
      status: "active",
      createdAt: new Date().toISOString(),
      role: isHRRound ? "General HR / Behavioral" : (role || (subject ? `${subject} Developer` : "Software Developer")),
      subject: subject || (isHRRound ? "HR / Behavioral" : undefined),
      timePerQuestion: timePerQuestion || "2 Minutes",
      questions: aiResponse.questions.map((q: any, i: number) => {
        const fnName = q.functionName || (isCodingRound ? inferFunctionName(q.text, q.codingTemplate) : undefined);
        const starters = q.starterTemplates || (isCodingRound && fnName ? generateStarterTemplates(fnName, q.text) : undefined);
        return {
          id: q.id || `q-${i + 1}-${Math.random().toString(36).substr(2, 5)}`,
          text: q.text,
          type: isCodingRound ? "Coding" : (isHRRound ? "Behavioral" : (q.type || "Technical")),
          difficulty: q.difficulty || difficulty || "Medium",
          category: q.category || (isHRRound ? "HR Behavioral" : (subject || role || "General")),
          subject: q.subject || subject || undefined,
          functionName: fnName,
          codingTemplate: q.codingTemplate || (starters ? starters.javascript : undefined),
          starterTemplates: starters,
          expectedOutput: q.expectedOutput || undefined,
          testCases: q.testCases || undefined
        };
      })
    };

    // Store in-memory
    dbStore.sessions.set(newSession.id, newSession);

    // Store in MongoDB if connected
    if (isMongoConnected()) {
      try {
        await (InterviewSessionModel as any).create(newSession);
      } catch (err) {
        console.error("Failed to save InterviewSession to MongoDB:", err);
      }
    }

    return res.json(newSession);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to launch interview session." });
  }
});

// ==========================================
// CODE EXECUTION & TEST CASE ENGINE (Python / JS / Java / C++ / SQL)
// ==========================================

router.post("/interview/execute-code", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { code, language, testCases, questionId, functionName } = req.body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Code is required for execution." });
  }

  try {
    const result = await executeCode({
      code,
      language,
      testCases,
      functionName
    });
    return res.json(result);
  } catch (error: any) {
    console.error("Execute code unexpected error:", error);
    return res.status(500).json({ error: error.message || "Failed to execute code." });
  }
});

// ==========================================
// TEACHER PORTAL: STUDENT REPORTS & ANALYTICS
// ==========================================

router.get("/teacher/student-reports", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    let allSessions: InterviewSession[] = [];

    if (isMongoConnected()) {
      try {
        const docs = await InterviewSessionModel.find({}).sort({ createdAt: -1 });
        allSessions = docs.map((doc: any) => doc.toObject() as unknown as InterviewSession);
      } catch (err) {
        console.error("Failed to fetch student reports from MongoDB:", err);
      }
    }

    // Merge unique sessions from memory dbStore
    const memorySessions = Array.from(dbStore.sessions.values());
    const mergedMap = new Map<string, InterviewSession>();

    allSessions.forEach(s => mergedMap.set(s.id, s));
    memorySessions.forEach(s => {
      if (!mergedMap.has(s.id)) {
        mergedMap.set(s.id, s);
      }
    });

    // Populate user profile details if missing on older records
    const userMap = new Map<string, UserProfile>();
    Array.from(dbStore.users.values()).forEach(u => userMap.set(u.id, u));

    const studentReports = Array.from(mergedMap.values()).map(s => {
      const u = userMap.get(s.userId);
      return {
        ...s,
        candidateName: s.candidateName || u?.name || "Student Candidate",
        registerNumber: s.registerNumber || u?.registerNumber || "DEMO-2024-001",
        studentDepartment: s.studentDepartment || u?.department || "Computer Science & Engineering",
        studentYear: s.studentYear || u?.year || "3rd Year"
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(studentReports);
  } catch (error: any) {
    console.error("Teacher reports fetch error:", error);
    return res.status(500).json({ error: error.message || "Failed to retrieve student reports." });
  }
});

router.post("/interview/answer", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { sessionId, questionId, candidateAnswer, answerMethod, candidateCode, selectedLanguage, testResults, audioRecordingUrl } = req.body;

  if (!sessionId || !questionId || (candidateAnswer === undefined && candidateCode === undefined)) {
    return res.status(400).json({ error: "sessionId, questionId, and candidateAnswer/candidateCode are required." });
  }

  let session = dbStore.sessions.get(sessionId);
  if (!session && isMongoConnected()) {
    try {
      const doc = await InterviewSessionModel.findOne({ id: sessionId });
      if (doc) {
        session = doc.toObject() as unknown as InterviewSession;
        dbStore.sessions.set(sessionId, session);
      }
    } catch (err) {
      console.error("Failed to fetch session from MongoDB in /interview/answer:", err);
    }
  }

  if (!session) {
    return res.status(404).json({ error: "Interview session not found." });
  }

  const question = session.questions.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: "Question not found in this session." });
  }

  try {
    const finalAnswerMethod: 'voice' | 'text' = answerMethod === "voice" ? "voice" : "text";
    let evaluation: any = null;

    // Check if this is a Coding Test question evaluated with test cases
    if (testResults && typeof testResults.total === "number" && testResults.total > 0) {
      const passedCount = testResults.passed || 0;
      const totalCount = testResults.total;
      const percentage = Math.round((passedCount / totalCount) * 100);
      const failedDetails = (testResults.details || []).filter((d: any) => !d.passed);

      evaluation = {
        score: percentage,
        technicalAccuracy: Math.round((passedCount / totalCount) * 10),
        communication: null,
        communicationNote: "Communication score excluded (Hands-on Coding Sandbox)",
        confidence: percentage >= 75 ? 9 : percentage >= 50 ? 7 : 5,
        completeness: Math.round((passedCount / totalCount) * 10),
        problemSolving: Math.round((passedCount / totalCount) * 10),
        mistakes: failedDetails.map((d: any) => 
          `Failed Test Case ${d.id}: Input: ${d.input} -> Expected: ${d.expected} | Got: ${d.actual}${d.error ? ` [Error: ${d.error}]` : ''}`
        ),
        suggestions: percentage === 100
          ? ["All test cases passed cleanly! Solution is functionally correct.", "Consider optimizing time and space complexity if dealing with 10^5+ scale."]
          : ["Ensure your code covers boundary and edge condition inputs.", "Check edge cases like empty collections, negative values, and duplicate elements."],
        idealAnswer: question.expectedOutput || "Optimal algorithmic implementation satisfying all test cases.",
        strengths: [`Passed ${passedCount} out of ${totalCount} test cases (${percentage}%)`],
        weaknesses: passedCount < totalCount ? [`Failed ${totalCount - passedCount} test case conditions`] : [],
        missingPoints: passedCount < totalCount ? ["Boundary test case coverage"] : [],
        nextQuestion: "Next problem will evaluate complementary algorithmic structures.",
        codeQualityRating: percentage >= 75 ? 9 : percentage >= 50 ? 6 : 3,
        passedTestsNote: `${passedCount} of ${totalCount} test cases passed (${percentage}%)`
      };

      question.testResults = testResults;
      question.candidateCode = candidateCode;
      question.selectedLanguage = selectedLanguage || "javascript";
    } else {
      // Standard Text or Voice Answer Evaluation
      evaluation = await aiService.evaluateAnswer({
        question: question.text,
        answer: candidateAnswer || "",
        role: session.role || "Software Developer",
        difficulty: session.difficulty || "Medium",
        answerMethod: finalAnswerMethod
      });
    }

    question.candidateAnswer = candidateAnswer;
    question.answerMethod = finalAnswerMethod;
    question.evaluation = evaluation;
    if (candidateCode) question.candidateCode = candidateCode;
    if (selectedLanguage) question.selectedLanguage = selectedLanguage;
    if (audioRecordingUrl) question.audioRecordingUrl = audioRecordingUrl;

    // Update session record
    dbStore.sessions.set(sessionId, session);

    if (isMongoConnected()) {
      try {
        await InterviewSessionModel.updateOne(
          { id: sessionId },
          { questions: session.questions }
        );
      } catch (err) {
        console.error("Failed to sync answer state with MongoDB:", err);
      }
    }

    return res.json({
      evaluation,
      followUpQuestion: null
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to process candidate answer." });
  }
});

// ==========================================
// USER PROFILE MANAGEMENT ENDPOINT
// ==========================================
router.get("/user/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  let user = Array.from(dbStore.users.values()).find(u => u.id === userId);
  if (!user) {
    user = {
      id: userId,
      email: req.user?.email || "candidate@domain.com",
      name: req.user?.name || "Candidate",
      experienceLevel: "Freshers",
      skills: ["React", "JavaScript", "Python", "SQL"],
      streak: 1,
      lastActive: new Date().toISOString()
    };
    dbStore.users.set(user.email, user);
  }
  return res.json(user);
});

router.post("/user/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  const { name, experienceLevel, skills, targetRole, targetCompany, preferredSubject, bio, avatarUrl } = req.body;

  let user = Array.from(dbStore.users.values()).find(u => u.id === userId);
  if (!user) {
    user = {
      id: userId,
      email: req.user?.email || "candidate@domain.com",
      name: name || req.user?.name || "Candidate",
      experienceLevel: experienceLevel || "Freshers",
      skills: skills || [],
      streak: 1,
      lastActive: new Date().toISOString()
    };
    dbStore.users.set(user.email, user);
  }

  if (name) user.name = name.trim();
  if (experienceLevel) user.experienceLevel = experienceLevel;
  if (skills && Array.isArray(skills)) user.skills = skills;
  if (targetRole) user.targetRole = targetRole.trim();
  if (targetCompany) user.targetCompany = targetCompany.trim();
  if (preferredSubject) user.preferredSubject = preferredSubject.trim();
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  user.lastActive = new Date().toISOString();

  if (isMongoConnected()) {
    try {
      const userQuery = mongoose.Types.ObjectId.isValid(userId)
        ? { _id: userId }
        : { email: req.user?.email || user.email };
      await UserModel.updateOne(
        userQuery,
        {
          name: user.name,
          experienceLevel: user.experienceLevel,
          skills: user.skills,
          avatarUrl: user.avatarUrl,
          lastActive: user.lastActive
        }
      );
    } catch (e) {
      console.warn("MongoDB user profile update error:", e);
    }
  }

  return res.json({ success: true, user });
});

router.post("/interview/complete", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { sessionId, biometricsSummary } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required." });
  }

  let session = dbStore.sessions.get(sessionId);
  if (!session && isMongoConnected()) {
    try {
      const doc = await InterviewSessionModel.findOne({ id: sessionId });
      if (doc) {
        session = doc.toObject() as unknown as InterviewSession;
        dbStore.sessions.set(sessionId, session);
      }
    } catch (err) {
      console.error("Failed to find session in complete:", err);
    }
  }

  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  try {
    if (biometricsSummary) {
      session.biometricsSummary = biometricsSummary;
    }

    // Calculate final metrics
    const evaluatedQuestions = session.questions.filter(q => q.evaluation);
    if (evaluatedQuestions.length === 0) {
      session.status = "completed";
      session.overallScore = 0;
      dbStore.sessions.set(sessionId, session);
      if (isMongoConnected()) {
        await InterviewSessionModel.updateOne({ id: sessionId }, { status: "completed", overallScore: 0, biometricsSummary });
      }
      return res.json(session);
    }

    const totalScore = evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.score || 0), 0);
    const overallScore = Math.round(totalScore / evaluatedQuestions.length);

    // Compile skill performance data for Career Roadmap
    const strongTopicsSet = new Set<string>();
    const weakTopicsSet = new Set<string>();

    evaluatedQuestions.forEach(q => {
      const score = q.evaluation?.score || 0;
      if (score >= 85) {
        strongTopicsSet.add(q.category);
      } else if (score < 75) {
        weakTopicsSet.add(q.category);
      }
    });

    const strongTopics = Array.from(strongTopicsSet);
    const weakTopics = Array.from(weakTopicsSet);

    const feedback = await aiService.generateCareerAdvice({
      skills: strongTopics.concat(weakTopics),
      strengths: strongTopics.length > 0 ? strongTopics : ["Logical reasoning"],
      weakAreas: weakTopics.length > 0 ? weakTopics : ["System design tradeoffs"],
      scores: [overallScore]
    });

    // Generate Final Interview Report with genuine biometrics summary and text/voice distinctions
    const report = await aiService.generateFinalReport({
      role: session.role || "Software Developer",
      company: session.company || "Target Company",
      difficulty: session.difficulty || "Medium",
      experienceLevel: session.experienceLevel || "Mid-Level",
      questions: session.questions,
      biometricsSummary: session.biometricsSummary
    });

    session.status = "completed";
    session.overallScore = overallScore;
    session.feedback = feedback;
    session.report = report;

    // Trigger streak checks on user profile
    const user = Array.from(dbStore.users.values()).find(u => u.id === session.userId);
    if (user) {
      user.streak += 1;
      user.lastActive = new Date().toISOString();
    }

    // Update in-memory
    dbStore.sessions.set(sessionId, session);

    // Update MongoDB
    if (isMongoConnected()) {
      try {
        await InterviewSessionModel.updateOne(
          { id: sessionId },
          { status: "completed", overallScore, feedback, report, biometricsSummary: session.biometricsSummary }
        );
        // Sync user streak
        if (user) {
          const userQuery = mongoose.Types.ObjectId.isValid(session.userId)
            ? { _id: session.userId }
            : { email: req.user?.email || "student@example.com" };
          await UserModel.updateOne(
            userQuery,
            { $inc: { streak: 1 }, lastActive: new Date().toISOString() }
          );
        }
      } catch (err) {
        console.error("Failed to sync completed session to MongoDB:", err);
      }
    }

    return res.json(session);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to complete interview session." });
  }
});

router.get("/interview/history", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  let userSessions: InterviewSession[] = [];

  if (isMongoConnected()) {
    try {
      const docs = await InterviewSessionModel.find({ userId }).sort({ createdAt: -1 });
      userSessions = docs.map((doc: any) => doc.toObject() as unknown as InterviewSession);
    } catch (err) {
      console.error("Failed to fetch history from MongoDB:", err);
    }
  }

  // Merge unique sessions from memory dbStore
  const memorySessions = Array.from(dbStore.sessions.values())
    .filter(s => s.userId === userId);

  const mergedMap = new Map<string, InterviewSession>();
  userSessions.forEach(s => mergedMap.set(s.id, s));
  memorySessions.forEach(s => {
    if (!mergedMap.has(s.id)) {
      mergedMap.set(s.id, s);
    }
  });

  const sortedSessions = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(sortedSessions);
});

router.get("/interview/session/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const sessionId = req.params.id;
  let session = dbStore.sessions.get(sessionId);

  if (!session && isMongoConnected()) {
    try {
      const doc = await InterviewSessionModel.findOne({ id: sessionId });
      if (doc) {
        session = doc.toObject() as unknown as InterviewSession;
        dbStore.sessions.set(sessionId, session);
      }
    } catch (err) {
      console.error("Failed to fetch session from MongoDB:", err);
    }
  }

  if (!session) {
    return res.status(404).json({ error: "Session feedback report not found." });
  }
  return res.json(session);
});

router.delete("/interview/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const sessionId = req.params.id;
  const userId = req.user?.id || "demo-user-123";

  dbStore.sessions.delete(sessionId);

  if (isMongoConnected()) {
    try {
      await InterviewSessionModel.deleteOne({ id: sessionId, userId });
    } catch (err) {
      console.error("Failed to delete session from MongoDB:", err);
      return res.status(500).json({ error: "Failed to delete interview from database." });
    }
  }

  return res.json({ success: true, message: "Interview deleted successfully." });
});


// ==========================================
// 4. ANALYTICS & DASHBOARD ENDPOINTS
// ==========================================

router.get("/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || "demo-user-123";
  let sessionsList: InterviewSession[] = [];

  if (isMongoConnected()) {
    try {
      const docs = await InterviewSessionModel.find({ userId, status: "completed" });
      sessionsList = docs.map((doc: any) => doc.toObject() as unknown as InterviewSession);
    } catch (err) {
      console.error("Failed to load stats sessions from MongoDB:", err);
    }
  }

  const memorySessions = Array.from(dbStore.sessions.values())
    .filter(s => s.userId === userId && s.status === "completed");

  const mergedMap = new Map<string, InterviewSession>();
  sessionsList.forEach(s => mergedMap.set(s.id, s));
  memorySessions.forEach(s => {
    if (!mergedMap.has(s.id)) {
      mergedMap.set(s.id, s);
    }
  });

  const userSessions = Array.from(mergedMap.values());
  const user = Array.from(dbStore.users.values()).find(u => u.id === userId);

  if (userSessions.length === 0) {
    return res.json({
      highestScore: 0,
      averageScore: 0,
      interviewsCompleted: 0,
      streak: user ? user.streak : 1,
      weakestSkills: ["Database Schema Tuning", "Docker Deployments"],
      bestSkills: ["React UI", "REST API Development"],
      recentTrends: []
    });
  }

  const scores = userSessions.map(s => s.overallScore || 0);
  const highestScore = Math.max(...scores);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Analyze skills from questions evaluations
  const skillScores: { [key: string]: { total: number; count: number } } = {};
  userSessions.forEach(session => {
    session.questions.forEach(q => {
      if (q.evaluation) {
        if (!skillScores[q.category]) {
          skillScores[q.category] = { total: 0, count: 0 };
        }
        skillScores[q.category].total += q.evaluation.score;
        skillScores[q.category].count += 1;
      }
    });
  });

  const skillAverages = Object.keys(skillScores).map(category => ({
    category,
    avg: skillScores[category].total / skillScores[category].count
  }));

  const bestSkills = skillAverages
    .filter(s => s.avg >= 80)
    .map(s => s.category)
    .slice(0, 3);

  const weakestSkills = skillAverages
    .filter(s => s.avg < 80)
    .map(s => s.category)
    .slice(0, 3);

  // Compile trend chart elements
  const recentTrends = userSessions
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(s => ({
      date: new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: s.overallScore || 0
    }));

  return res.json({
    highestScore,
    averageScore,
    interviewsCompleted: userSessions.length,
    streak: user ? user.streak : 1,
    weakestSkills: weakestSkills.length > 0 ? weakestSkills : ["System Design Tradeoffs"],
    bestSkills: bestSkills.length > 0 ? bestSkills : ["React Hooks", "REST Routing"],
    recentTrends
  });
});

router.get("/leaderboard", (req, res) => {
  // Rank users based on historical averages
  const demoLeaderboard = [
    { rank: 1, name: "Aarav Sharma", experienceLevel: "Experienced", averageScore: 94, interviewsCount: 8, streak: 12 },
    { rank: 2, name: "Alex Morgan", experienceLevel: "Freshers", averageScore: 89, interviewsCount: 4, streak: 5 },
    { rank: 3, name: "Vikram Iyer", experienceLevel: "Freshers", averageScore: 86, interviewsCount: 5, streak: 3 },
    { rank: 4, name: "Sneha Reddy", experienceLevel: "Experienced", averageScore: 81, interviewsCount: 3, streak: 2 },
    { rank: 5, name: "Rahul Verma", experienceLevel: "Freshers", averageScore: 78, interviewsCount: 2, streak: 1 }
  ];
  return res.json(demoLeaderboard);
});

// ==========================================
// PROCTORING & INTEGRITY REPORTING ENDPOINTS
// ==========================================

// 1. Get current proctoring policy
router.get("/proctoring/policy", (req, res) => {
  return res.json(dbStore.policy);
});

// 2. Update proctoring policy (Admin / Configurable)
router.put("/proctoring/policy", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Invalid policy payload" });
  }

  dbStore.policy = {
    ...dbStore.policy,
    ...updates,
    penalties: {
      ...dbStore.policy.penalties,
      ...(updates.penalties || {})
    }
  };

  return res.json({ success: true, policy: dbStore.policy });
});

// 3. Start proctoring session (post consent & camera check)
router.post("/proctoring/start", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  // Clear any existing events for a clean session run
  dbStore.proctoringEvents.set(sessionId, []);

  return res.json({
    success: true,
    sessionId,
    startedAt: new Date().toISOString(),
    policy: dbStore.policy
  });
});

// 4. Record timestamped proctoring events & evaluate policy termination
router.post("/proctoring/events", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, event } = req.body;
  if (!sessionId || !event || !event.eventType) {
    return res.status(400).json({ error: "sessionId and valid event object are required" });
  }

  const existingEvents = dbStore.proctoringEvents.get(sessionId) || [];

  // Prevent duplicate flooding of the exact same event type within 2.5 seconds
  const nowMs = Date.now();
  const recentDuplicate = existingEvents.find(
    (e) =>
      e.eventType === event.eventType &&
      !e.isFalsePositive &&
      Math.abs(nowMs - new Date(e.timestamp).getTime()) < 2500
  );

  if (recentDuplicate) {
    return res.json({
      success: true,
      deduplicated: true,
      totalWarnings: existingEvents.filter((e) => !e.isFalsePositive && (e.severity === "high" || e.severity === "critical")).length,
      shouldTerminate: false
    });
  }

  const newEvent: ProctoringEvent = {
    id: event.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    sessionId,
    eventType: event.eventType,
    timestamp: event.timestamp || new Date().toISOString(),
    durationSeconds: Number(event.durationSeconds) || 0,
    severity: event.severity || "medium",
    confidence: Math.min(1, Math.max(0, Number(event.confidence) || 0.7)),
    details: event.details || "Behavior flagged by computer vision proctor",
    deviceType: event.deviceType,
    isFalsePositive: false
  };

  existingEvents.push(newEvent);
  dbStore.proctoringEvents.set(sessionId, existingEvents);

  if (isMongoConnected()) {
    try {
      await ProctoringEventModel.create(newEvent);
    } catch (err) {
      console.warn("Failed to persist event to MongoDB:", err);
    }
  }

  // Calculate current warning status and policy thresholds
  const warningEvents = existingEvents.filter(
    (e) => !e.isFalsePositive && (e.severity === "high" || e.severity === "critical")
  );
  const totalWarnings = warningEvents.length;

  let shouldTerminate = false;
  let terminationReason = "";

  if (totalWarnings >= dbStore.policy.maxWarnings) {
    shouldTerminate = true;
    terminationReason = `Exceeded maximum allowed proctoring warnings (${totalWarnings}/${dbStore.policy.maxWarnings}). Centralized proctoring policy automatically terminated the session.`;
  } else if (newEvent.severity === "critical" && dbStore.policy.autoTerminateOnCritical) {
    shouldTerminate = true;
    terminationReason = `Critical malpractice violation detected: ${newEvent.details}. Centralized policy mandated automatic termination.`;
  }

  return res.json({
    success: true,
    eventId: newEvent.id,
    totalWarnings,
    shouldTerminate,
    terminationReason: shouldTerminate ? terminationReason : undefined
  });
});

// 5. End proctoring session, compute final transparent integrity report
router.post("/proctoring/end", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, status, terminationReason, startTime, endTime } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const session = dbStore.sessions.get(sessionId);
  const user = Array.from(dbStore.users.values()).find((u) => u.id === req.user?.id) || {
    name: req.user?.email?.split("@")[0] || "Candidate"
  };

  const calculated = dbStore.calculateIntegrityScore(sessionId);
  const events = dbStore.proctoringEvents.get(sessionId) || [];

  const startMs = startTime ? new Date(startTime).getTime() : (session ? new Date(session.createdAt).getTime() : Date.now() - 300000);
  const endMs = endTime ? new Date(endTime).getTime() : Date.now();
  const monitoringDurationSec = Math.max(1, Math.round((endMs - startMs) / 1000));

  const totalWarnings = events.filter(
    (e) => !e.isFalsePositive && (e.severity === "high" || e.severity === "critical")
  ).length;

  const finalStatus = status === "terminated_violation" ? "terminated_violation" : "completed";

  const integrityReport: IntegrityReport = {
    id: `rep-int-${sessionId}`,
    sessionId,
    userId: req.user?.id || (session ? session.userId : "candidate-user"),
    candidateName: user.name,
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    monitoringDurationSec,
    status: finalStatus,
    terminationReason: finalStatus === "terminated_violation" ? (terminationReason || "Proctoring policy violation") : undefined,
    totalWarnings,
    integrityScore: calculated.score,
    integrityTier: calculated.tier,
    eventCounts: calculated.eventCounts,
    violations: events,
    disclaimer:
      "This assessment is an AI-generated interview integrity estimate based on webcam feed analysis, not definitive proof of candidate genuineness or cheating. Browser limitations, lighting variations, and hardware angles may generate false positives. Technical interview performance score remains evaluated independently."
  };

  dbStore.integrityReports.set(sessionId, integrityReport);

  // Update session record
  if (session) {
    session.status = finalStatus;
    if (finalStatus === "terminated_violation") {
      session.terminationReason = integrityReport.terminationReason;
    }
    session.integrityReport = integrityReport;
  }

  if (isMongoConnected()) {
    try {
      await (IntegrityReportModel as any).findOneAndUpdate(
        { sessionId },
        integrityReport,
        { upsert: true, new: true }
      );
      if (session) {
        await (InterviewSessionModel as any).findOneAndUpdate(
          { id: sessionId },
          {
            status: finalStatus,
            terminationReason: session.terminationReason,
            integrityReport
          }
        );
      }
    } catch (err) {
      console.warn("Failed to persist integrity report to MongoDB:", err);
    }
  }

  return res.json({ success: true, report: integrityReport });
});

// 6. Get integrity report for an interview
router.get("/proctoring/report/:sessionId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;

  let report = dbStore.integrityReports.get(sessionId);

  if (!report && isMongoConnected()) {
    try {
      const doc = await (IntegrityReportModel as any).findOne({ sessionId });
      if (doc) {
        report = doc.toObject() as unknown as IntegrityReport;
      }
    } catch (err) {
      console.warn("Failed to query report from MongoDB:", err);
    }
  }

  if (!report) {
    // Check if session exists; if so, dynamically generate from logged events
    const session = dbStore.sessions.get(sessionId);
    if (session) {
      const calculated = dbStore.calculateIntegrityScore(sessionId);
      const events = dbStore.proctoringEvents.get(sessionId) || [];
      const user = Array.from(dbStore.users.values()).find((u) => u.id === session.userId);

      report = {
        id: `rep-int-${sessionId}`,
        sessionId,
        userId: session.userId,
        candidateName: user?.name || "Candidate",
        startTime: session.createdAt,
        endTime: new Date().toISOString(),
        monitoringDurationSec: 180,
        status: session.status === "terminated_violation" ? "terminated_violation" : "completed",
        terminationReason: session.terminationReason,
        totalWarnings: events.filter((e) => !e.isFalsePositive && (e.severity === "high" || e.severity === "critical")).length,
        integrityScore: calculated.score,
        integrityTier: calculated.tier,
        eventCounts: calculated.eventCounts,
        violations: events,
        disclaimer:
          "This assessment is an AI-generated interview integrity estimate based on webcam feed analysis, not definitive proof of candidate genuineness or cheating. Technical performance scores are kept completely separate."
      };
      dbStore.integrityReports.set(sessionId, report);
    } else {
      return res.status(404).json({ error: "Integrity report not found for this session" });
    }
  }

  return res.json(report);
});

// 7. Get proctoring events timeline for an interview
router.get("/proctoring/events/:sessionId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;

  let events = dbStore.proctoringEvents.get(sessionId) || [];

  if (events.length === 0 && isMongoConnected()) {
    try {
      const docs = await (ProctoringEventModel as any).find({ sessionId }).sort({ createdAt: 1 });
      events = docs.map((d: any) => d.toObject() as unknown as ProctoringEvent);
    } catch (err) {
      console.warn("Failed to fetch events from MongoDB:", err);
    }
  }

  return res.json(events);
});

// 8. Authorized Reviewer: Examine flagged event, mark false positive or update dispute
router.patch("/proctoring/review/:eventId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { isFalsePositive, reviewerNotes } = req.body;

  let targetEvent: ProctoringEvent | undefined;
  let targetSessionId: string | undefined;

  for (const [sessId, events] of dbStore.proctoringEvents.entries()) {
    const found = events.find((e) => e.id === eventId);
    if (found) {
      targetEvent = found;
      targetSessionId = sessId;
      break;
    }
  }

  if (!targetEvent && isMongoConnected()) {
    try {
      const doc = await (ProctoringEventModel as any).findOne({ id: eventId });
      if (doc) {
        targetEvent = doc.toObject() as unknown as ProctoringEvent;
        targetSessionId = targetEvent.sessionId;
      }
    } catch (err) {
      console.warn("MongoDB review fetch error:", err);
    }
  }

  if (!targetEvent || !targetSessionId) {
    return res.status(404).json({ error: "Flagged event not found" });
  }

  // Update event
  if (typeof isFalsePositive === "boolean") {
    targetEvent.isFalsePositive = isFalsePositive;
  }
  if (reviewerNotes !== undefined) {
    targetEvent.reviewerNotes = reviewerNotes;
  }
  targetEvent.reviewedBy = req.user?.email || "Authorized Reviewer";

  if (isMongoConnected()) {
    try {
      await (ProctoringEventModel as any).findOneAndUpdate(
        { id: eventId },
        {
          isFalsePositive: targetEvent.isFalsePositive,
          reviewerNotes: targetEvent.reviewerNotes,
          reviewedBy: targetEvent.reviewedBy
        }
      );
    } catch (err) {
      console.warn("MongoDB event update error:", err);
    }
  }

  // Recalculate and update the Integrity Report
  const recalculated = dbStore.calculateIntegrityScore(targetSessionId);
  const report = dbStore.integrityReports.get(targetSessionId);

  if (report) {
    report.integrityScore = recalculated.score;
    report.integrityTier = recalculated.tier;
    report.eventCounts = recalculated.eventCounts;
    report.reviewedBy = targetEvent.reviewedBy;
    report.reviewedAt = new Date().toISOString();

    if (isMongoConnected()) {
      try {
        await (IntegrityReportModel as any).findOneAndUpdate(
          { sessionId: targetSessionId },
          {
            integrityScore: report.integrityScore,
            integrityTier: report.integrityTier,
            eventCounts: report.eventCounts,
            reviewedBy: report.reviewedBy,
            reviewedAt: report.reviewedAt
          }
        );
      } catch (err) {
        console.warn("MongoDB report update error:", err);
      }
    }
  }

  return res.json({
    success: true,
    event: targetEvent,
    updatedReport: report
  });
});

export default router;
