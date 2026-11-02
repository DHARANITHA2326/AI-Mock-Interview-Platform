/**
 * Core type declarations for the AI Mock Interview Platform
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: 'student' | 'teacher';
  registerNumber?: string;
  department?: string;
  year?: string;
  staffId?: string;
  experienceLevel: string;
  skills: string[];
  streak: number;
  lastActive: string;
  avatarUrl?: string;
  avatar?: string;
  targetRole?: string;
  targetCompany?: string;
  preferredSubject?: string;
  bio?: string;
  isAdmin?: boolean;
}

export interface VoiceSettings {
  voiceURI: string;
  voiceName: string;
  lang: string;
  pitch: number;
  rate: number;
  volume: number;
}

export interface Project {
  title: string;
  technologies: string[];
  description: string;
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
}

export interface Internship {
  role: string;
  company: string;
  duration?: string;
}

export interface ResumeAnalysis {
  userId: string;
  fileName: string;
  uploadedAt: string;
  skills: string[];
  projects: Project[];
  education: Education[];
  internships: Internship[];
  technologies: string[];
  strengths: string[];
  weakAreas: string[];
  suggestedRoles: string[];
}

export interface Evaluation {
  score: number;
  technicalAccuracy: number;
  communication: number | null; // null if candidate answered via text
  confidence: number;
  completeness: number;
  problemSolving: number;
  mistakes: string[];
  suggestions: string[];
  idealAnswer: string;
  strengths?: string[];
  weaknesses?: string[];
  missingPoints?: string[];
  nextQuestion?: string;
  answerMethod?: 'voice' | 'text';
  communicationNote?: string;
  codeQualityRating?: number;
  passedTestsNote?: string;
}

export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden?: boolean;
}

export interface TestCaseDetail {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export interface Question {
  id: string;
  text: string;
  type: string; // e.g. Technical, Behavioral, System Design, Coding
  difficulty: string; // Basics, Easy, Medium, Hard
  category: string;
  subject?: string;
  functionName?: string;
  codingTemplate?: string; // Standard syntax boilerplate for coding questions
  starterTemplates?: { [lang: string]: string };
  expectedOutput?: string;
  testCases?: TestCase[];
  testResults?: {
    passed: number;
    total: number;
    percentage: number;
    details: TestCaseDetail[];
  };
  candidateAnswer?: string;
  candidateCode?: string;
  selectedLanguage?: string;
  answerMethod?: 'voice' | 'text';
  audioRecordingUrl?: string;
  audioBlobDurationSec?: number;
  evaluation?: Evaluation;
}

export interface RoadmapStep {
  phase: string;
  topic: string;
  actionSteps: string[];
}

export interface Feedback {
  summary: string;
  strongTopics: string[];
  weakTopics: string[];
  resumeImprovements: string[];
  improvementRoadmap: RoadmapStep[];
}

export interface BiometricSummary {
  cameraUsed: boolean;
  isVirtual: boolean;
  facePresencePct: number;
  eyeContactPct: number;
  lightingQuality: string;
  lightingScore: number;
  posturePoise: string;
  postureScore: number;
  motionLevel: string;
  confidenceIndex: number;
  totalFramesAnalyzed: number;
  candidateDemeanorReview: string;
}

export interface InterviewReport {
  overallScore: number;
  technicalRating: number;
  communicationRating: number | null; // null if answered purely via text
  communicationEvaluated: boolean;
  communicationNote?: string;
  confidenceRating: number;
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  overallFeedback: string;
  hiringRecommendation: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  candidateName?: string;
  registerNumber?: string;
  studentDepartment?: string;
  studentYear?: string;
  interviewType: string;
  difficulty: string;
  experienceLevel: string;
  company: string;
  status: 'active' | 'completed' | 'terminated_violation';
  createdAt: string;
  questions: Question[];
  overallScore?: number;
  feedback?: Feedback;
  role?: string;
  timePerQuestion?: string;
  subject?: string;
  report?: InterviewReport;
  biometricsSummary?: BiometricSummary;
  terminationReason?: string;
  integrityReport?: IntegrityReport;
}

export interface DashboardStats {
  highestScore: number;
  averageScore: number;
  interviewsCompleted: number;
  streak: number;
  weakestSkills: string[];
  bestSkills: string[];
  recentTrends: { date: string; score: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  experienceLevel: string;
  averageScore: number;
  interviewsCount: number;
  streak: number;
}

export interface DailyChallenge {
  id: string;
  question: string;
  category: string;
  points: number;
  solved: boolean;
}

// ==========================================
// AI-Based Interview Proctoring & Malpractice Detection Types
// ==========================================

export type ProctoringEventType = 
  | 'no_face'
  | 'multiple_faces'
  | 'gaze_away'
  | 'candidate_left'
  | 'camera_interrupted'
  | 'prohibited_device';

export type ProctoringSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ProctoringEvent {
  id: string;
  sessionId: string;
  eventType: ProctoringEventType;
  timestamp: string;
  durationSeconds: number;
  severity: ProctoringSeverity;
  confidence: number; // 0.0 - 1.0
  details: string;
  deviceType?: string; // 'cell phone' | 'laptop' | 'book' | etc.
  isFalsePositive?: boolean;
  reviewedBy?: string;
  reviewerNotes?: string;
}

export interface ProctoringPolicy {
  maxWarnings: number; // e.g. 3
  noFaceThresholdSec: number; // e.g. 4
  gazeAwayThresholdSec: number; // e.g. 3.5
  deviceConfidenceThreshold: number; // e.g. 0.65
  deviceConsecutiveDetections: number; // e.g. 2 consecutive samples
  autoTerminateOnCritical: boolean;
  penalties: {
    no_face: number;
    multiple_faces: number;
    gaze_away: number;
    candidate_left: number;
    camera_interrupted: number;
    prohibited_device: number;
  };
}

export interface IntegrityReport {
  id: string;
  sessionId: string;
  userId: string;
  candidateName: string;
  startTime: string;
  endTime: string;
  monitoringDurationSec: number;
  status: 'completed' | 'terminated_violation';
  terminationReason?: string;
  totalWarnings: number;
  integrityScore: number; // 0 - 100
  integrityTier: 'High' | 'Generally Consistent' | 'Requires Review' | 'Significant Concerns';
  eventCounts: {
    noFace: number;
    multipleFaces: number;
    gazeAway: number;
    prohibitedDevice: number;
    cameraInterrupted: number;
  };
  violations: ProctoringEvent[];
  disclaimer: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
