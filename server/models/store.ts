import { ResumeAnalysis, InterviewSession, UserProfile, ProctoringEvent, IntegrityReport, ProctoringPolicy } from "../../src/types";
import { defaultProctoringPolicy } from "./Proctoring";

// Local in-memory DB collections with pre-populated seed data for demo purposes
class MockDatabase {
  public users: Map<string, UserProfile> = new Map();
  public resumes: Map<string, ResumeAnalysis> = new Map();
  public sessions: Map<string, InterviewSession> = new Map();
  public activeOtps: Map<string, string> = new Map(); // email -> otp
  public proctoringEvents: Map<string, ProctoringEvent[]> = new Map(); // sessionId -> events
  public integrityReports: Map<string, IntegrityReport> = new Map(); // sessionId -> report
  public policy: ProctoringPolicy = { ...defaultProctoringPolicy };

  constructor() {
    this.seedData();
  }

  public calculateIntegrityScore(sessionId: string): {
    score: number;
    tier: IntegrityReport["integrityTier"];
    eventCounts: IntegrityReport["eventCounts"];
    validViolations: ProctoringEvent[];
  } {
    const events = this.proctoringEvents.get(sessionId) || [];
    const validViolations = events.filter((e) => !e.isFalsePositive);

    const eventCounts = {
      noFace: 0,
      multipleFaces: 0,
      gazeAway: 0,
      prohibitedDevice: 0,
      cameraInterrupted: 0
    };

    let totalPenalty = 0;

    for (const v of validViolations) {
      if (v.eventType === "no_face") eventCounts.noFace++;
      else if (v.eventType === "multiple_faces") eventCounts.multipleFaces++;
      else if (v.eventType === "gaze_away") eventCounts.gazeAway++;
      else if (v.eventType === "prohibited_device") eventCounts.prohibitedDevice++;
      else if (v.eventType === "camera_interrupted") eventCounts.cameraInterrupted++;

      const basePenalty = this.policy.penalties[v.eventType] || 10;
      const severityMultiplier =
        v.severity === "critical" ? 1.8 : v.severity === "high" ? 1.3 : v.severity === "medium" ? 1.0 : 0.6;
      totalPenalty += basePenalty * severityMultiplier;
    }

    const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
    let tier: IntegrityReport["integrityTier"] = "High";
    if (score < 50) {
      tier = "Significant Concerns";
    } else if (score < 75) {
      tier = "Requires Review";
    } else if (score < 90) {
      tier = "Generally Consistent";
    }

    return { score, tier, eventCounts, validViolations };
  }

  private seedData() {
    // 1. Seed demo student user
    const demoUser: UserProfile = {
      id: "demo-user-123",
      email: "student@example.com",
      name: "Alex Morgan",
      role: "student",
      registerNumber: "DEMO-2024-001",
      department: "Computer Science & Engineering",
      year: "3rd Year",
      experienceLevel: "Freshers",
      skills: ["React", "JavaScript", "Node.js", "Express", "HTML/CSS", "SQL"],
      streak: 5,
      lastActive: new Date().toISOString(),
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    };
    this.users.set(demoUser.email, demoUser);

    // 2. Seed demo teacher user
    const facultyUser: UserProfile = {
      id: "faculty-user-01",
      email: "faculty@interviewmaster.edu",
      name: "Prof. Ananya Sharma",
      role: "teacher",
      staffId: "FAC-CS-01",
      department: "Computer Science & Engineering",
      experienceLevel: "Senior Faculty & Placement Coordinator",
      skills: ["Placement Training", "Curriculum Design", "Interview Evaluation", "Algorithms Assessment"],
      streak: 12,
      lastActive: new Date().toISOString(),
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop"
    };
    this.users.set(facultyUser.email, facultyUser);

    // 3. Seed Interview Session History
    const prevSession1: InterviewSession = {
      id: "session-acc-1",
      userId: demoUser.id,
      candidateName: "Alex Morgan",
      registerNumber: "DEMO-2024-001",
      studentDepartment: "Computer Science & Engineering",
      studentYear: "3rd Year",
      interviewType: "React Interview",
      difficulty: "Medium",
      experienceLevel: "Freshers",
      company: "Accenture",
      subject: "React",
      status: "completed",
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      questions: [
        {
          id: "q1",
          text: "Explain the difference between useEffect with an empty dependency array and no dependency array.",
          type: "Technical",
          difficulty: "Medium",
          category: "React",
          candidateAnswer: "With an empty array, it runs once after mount. With no array, it runs on every render of the component.",
          evaluation: {
            score: 95,
            technicalAccuracy: 10,
            communication: 9,
            confidence: 9,
            completeness: 10,
            problemSolving: 9,
            mistakes: [],
            suggestions: ["Excellent, direct answer. You can also mention the cleanup function syntax."],
            idealAnswer: "useEffect with no dependency array runs on every single render cycle. If you specify an empty dependency array [], the effect only runs once after the initial mounting phase of the component. The cleanup return function will execute upon unmounting."
          }
        },
        {
          id: "q2",
          text: "What are React Server Components and how do they differ from client components?",
          type: "Technical",
          difficulty: "Hard",
          category: "React",
          candidateAnswer: "They run on the server side to reduce bundle sizes, so they don't have hooks or states.",
          evaluation: {
            score: 88,
            technicalAccuracy: 9,
            communication: 8,
            confidence: 8,
            completeness: 8,
            problemSolving: 9,
            mistakes: ["Missed explaining how state synchronization operates or when to mark 'use client'."],
            suggestions: ["Add a short sentence about where code bundling savings occur and how 'use client' works as a boundary marker."],
            idealAnswer: "React Server Components (RSC) are executed entirely on the server. Because they run on the server, their dependencies are not included in the client-side JavaScript bundle, making the initial load much faster. Unlike client components, RSCs cannot use state (useState) or side-effects (useEffect)."
          }
        }
      ],
      overallScore: 91.5,
      feedback: {
        summary: "Excellent performance showing clear deep-dive understanding of modern React design guidelines, rendering pipelines, and state handling processes.",
        strongTopics: ["React Lifecycle", "Server-side optimizations", "Effect Hooks"],
        weakTopics: ["State Synchronization Boundaries"],
        resumeImprovements: ["Add a specific metric on load-time performance gains when using server rendering."],
        improvementRoadmap: [
          {
            phase: "Immediate Action",
            topic: "RSC Boundaries & Data Hydration",
            actionSteps: ["Read official Next.js documentation regarding client-server component structures.", "Build a simple app that splits heavy components into Server side."]
          }
        ]
      }
    };

    const prevSession2: InterviewSession = {
      id: "session-acc-2",
      userId: demoUser.id,
      candidateName: "Alex Morgan",
      registerNumber: "DEMO-2024-001",
      studentDepartment: "Computer Science & Engineering",
      studentYear: "3rd Year",
      interviewType: "Technical Interview",
      difficulty: "Hard",
      experienceLevel: "Freshers",
      company: "Google",
      subject: "Node.js & Backend",
      status: "completed",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      questions: [
        {
          id: "g1",
          text: "Describe how you would design a rate limiter middleware for a high-traffic Node.js endpoint.",
          type: "System Design",
          difficulty: "Hard",
          category: "Node.js",
          candidateAnswer: "I would use redis to count IP addresses and check if they exceed a limit in a minute.",
          evaluation: {
            score: 82,
            technicalAccuracy: 8,
            communication: 8,
            confidence: 7,
            completeness: 8,
            problemSolving: 9,
            mistakes: ["Did not mention standard token bucket or sliding window algorithms.", "Omitted explaining race condition mitigations in Redis."],
            suggestions: ["Mention the specific algorithms like Sliding Window Log or Token Bucket.", "Talk about using Redis Lua scripts to make key checks atomic."],
            idealAnswer: "A high-traffic rate limiter can be designed using Redis. We can use a Sliding Window Counter algorithm where request timestamps are stored in a sorted set (ZSET) keyed by the client's IP. Each request removes logs older than the current window (e.g., 1 minute) and checks the set's size. Using Redis pipelines or Lua scripts ensures checking and incrementing happen atomically, avoiding race conditions."
          }
        }
      ],
      overallScore: 82.0,
      feedback: {
        summary: "Solid foundations in Express middleware architecture, but lacks technical depth when explaining sliding window algorithms or concurrency locking mechanisms under heavy concurrency load.",
        strongTopics: ["Redis caching integration", "Express Middleware structuring"],
        weakTopics: ["Rate-Limiting Algorithms", "Concurrency Race Conditions"],
        resumeImprovements: ["Include database tuning or concurrency projects to prove system design capability."],
        improvementRoadmap: [
          {
            phase: "Short-term (1 week)",
            topic: "Redis Transactions & Advanced rate-limiters",
            actionSteps: ["Study sliding window counters in-depth.", "Implement an open-source middleware package utilizing atomic Lua scripts in Node.js."]
          }
        ]
      }
    };

    // Additional Student Session 3: Karthik Raja (Java Coding Test)
    const studentSession3: InterviewSession = {
      id: "session-karthik-01",
      userId: "user-karthik-02",
      candidateName: "Karthik Raja",
      registerNumber: "2024CS102",
      studentDepartment: "Computer Science & Engineering",
      studentYear: "3rd Year",
      interviewType: "Coding Test",
      difficulty: "Medium",
      experienceLevel: "Freshers",
      company: "Zoho",
      subject: "Java",
      status: "completed",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      overallScore: 95.0,
      questions: [
        {
          id: "q-karthik-1",
          text: "Two Sum Target Pair: Given an array of integers and target, return indices.",
          type: "Coding",
          difficulty: "Easy",
          category: "Arrays & Hash Map",
          candidateCode: "class Solution {\n  public static int[] twoSum(int[] nums, int target) {\n    java.util.Map<Integer, Integer> map = new java.util.HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n      int comp = target - nums[i];\n      if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n      map.put(nums[i], i);\n    }\n    return new int[]{};\n  }\n}",
          selectedLanguage: "java",
          testResults: {
            passed: 4,
            total: 4,
            percentage: 100,
            details: [
              { id: 1, input: "[2, 7, 11, 15], 9", expected: "[0, 1]", actual: "[0, 1]", passed: true },
              { id: 2, input: "[3, 2, 4], 6", expected: "[1, 2]", actual: "[1, 2]", passed: true },
              { id: 3, input: "[3, 3], 6", expected: "[0, 1]", actual: "[0, 1]", passed: true },
              { id: 4, input: "[1, 5, 8, 3], 11", expected: "[2, 3]", actual: "[2, 3]", passed: true }
            ]
          },
          evaluation: {
            score: 100,
            technicalAccuracy: 10,
            communication: null,
            confidence: 10,
            completeness: 10,
            problemSolving: 10,
            mistakes: [],
            suggestions: ["All 4 test cases passed cleanly! Time complexity is optimal O(N)."],
            idealAnswer: "Optimal HashMap solution with single pass O(N) time and O(N) space."
          }
        }
      ],
      feedback: {
        summary: "Exceptional algorithmic problem-solving in Java with 100% test case pass rate.",
        strongTopics: ["Java Collections", "HashMap", "Time Complexity Analysis"],
        weakTopics: [],
        resumeImprovements: ["Highlight competitive coding rankings."],
        improvementRoadmap: []
      }
    };

    // Additional Student Session 4: Priya Sundaram (HR Behavioral Round)
    const studentSession4: InterviewSession = {
      id: "session-priya-01",
      userId: "user-priya-03",
      candidateName: "Priya Sundaram",
      registerNumber: "2024CS105",
      studentDepartment: "Information Technology",
      studentYear: "Final Year",
      interviewType: "HR Round",
      difficulty: "Easy",
      experienceLevel: "Freshers",
      company: "Infosys",
      subject: "HR / Behavioral",
      status: "completed",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      overallScore: 89.0,
      questions: [
        {
          id: "q-priya-1",
          text: "Tell me about yourself, your educational background, and what inspired your career in IT.",
          type: "Behavioral",
          difficulty: "Easy",
          category: "Self Introduction",
          candidateAnswer: "I am a Final Year IT student at VIT with deep interest in cloud platforms and full stack development. During my academic projects I led a 4-person team building web portals.",
          answerMethod: "voice",
          evaluation: {
            score: 89,
            technicalAccuracy: 9,
            communication: 9,
            confidence: 9,
            completeness: 9,
            problemSolving: 8,
            mistakes: [],
            suggestions: ["Very clear speech articulation and structured chronological narrative."],
            idealAnswer: "Well rounded self-introduction covering academics, practical projects, and long-term tech aspirations."
          }
        }
      ],
      feedback: {
        summary: "Strong verbal communication skills, high poise, and mature workplace readiness.",
        strongTopics: ["Self Presentation", "Team Leadership", "Interpersonal Communication"],
        weakTopics: [],
        resumeImprovements: ["Include leadership role descriptions."],
        improvementRoadmap: []
      }
    };

    // Additional Student Session 5: Rahul Menon (Python & SQL Technical)
    const studentSession5: InterviewSession = {
      id: "session-rahul-01",
      userId: "user-rahul-04",
      candidateName: "Rahul Menon",
      registerNumber: "2024IT201",
      studentDepartment: "Information Technology",
      studentYear: "3rd Year",
      interviewType: "Technical",
      difficulty: "Medium",
      experienceLevel: "Freshers",
      company: "TCS",
      subject: "SQL",
      status: "completed",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      overallScore: 76.0,
      questions: [
        {
          id: "q-rahul-1",
          text: "Explain the difference between WHERE and HAVING clause in SQL.",
          type: "Technical",
          difficulty: "Medium",
          category: "SQL Clauses & Aggregation",
          candidateAnswer: "WHERE filters rows before grouping, and HAVING filters after GROUP BY is applied.",
          evaluation: {
            score: 80,
            technicalAccuracy: 8,
            communication: 7,
            confidence: 7,
            completeness: 8,
            problemSolving: 8,
            mistakes: ["Could provide a concrete aggregate function example like COUNT or SUM."],
            suggestions: ["Always write out a sample query snippet showing GROUP BY dept HAVING COUNT(*) > 5."],
            idealAnswer: "WHERE filters individual rows before grouping. HAVING filters groups created by GROUP BY."
          }
        }
      ],
      feedback: {
        summary: "Good grasp of basic relational queries; needs more practice on indexing and query plan optimization.",
        strongTopics: ["SQL Filtering", "Basic Joins"],
        weakTopics: ["Query Optimization", "Window Functions"],
        resumeImprovements: ["Add database tuning projects."],
        improvementRoadmap: []
      }
    };

    this.sessions.set(prevSession1.id, prevSession1);
    this.sessions.set(prevSession2.id, prevSession2);
    this.sessions.set(studentSession3.id, studentSession3);
    this.sessions.set(studentSession4.id, studentSession4);
    this.sessions.set(studentSession5.id, studentSession5);
  }
}

export const dbStore = new MockDatabase();
