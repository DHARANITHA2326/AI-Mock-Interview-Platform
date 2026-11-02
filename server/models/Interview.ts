import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvaluation {
  score: number;
  technicalAccuracy: number;
  communication?: number | null;
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
  answerMethod?: string;
  communicationNote?: string;
}

export interface IQuestion {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  category: string;
  codingTemplate?: string;
  expectedOutput?: string;
  candidateAnswer?: string;
  answerMethod?: string;
  evaluation?: IEvaluation;
}

export interface IRoadmapStep {
  phase: string;
  topic: string;
  actionSteps: string[];
}

export interface IFeedback {
  summary: string;
  strongTopics: string[];
  weakTopics: string[];
  resumeImprovements: string[];
  improvementRoadmap: IRoadmapStep[];
}

export interface IInterviewReport {
  overallScore: number;
  technicalRating: number;
  communicationRating?: number | null;
  communicationEvaluated?: boolean;
  communicationNote?: string;
  confidenceRating: number;
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  overallFeedback: string;
  hiringRecommendation: string;
}

export interface IInterviewSession extends Document {
  id: string; // Map Custom session-id
  userId: string;
  candidateName?: string;
  registerNumber?: string;
  studentDepartment?: string;
  studentYear?: string;
  interviewType: string;
  difficulty: string;
  experienceLevel: string;
  company: string;
  status: "active" | "completed" | "terminated_violation";
  terminationReason?: string;
  integrityReport?: any;
  questions: IQuestion[];
  overallScore?: number;
  feedback?: IFeedback;
  report?: IInterviewReport;
  biometricsSummary?: any;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationSchema = new Schema({
  score: { type: Number, required: true },
  technicalAccuracy: { type: Number, required: true },
  communication: { type: Number, required: false },
  confidence: { type: Number, required: true },
  completeness: { type: Number, required: true },
  problemSolving: { type: Number, required: true },
  mistakes: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  idealAnswer: { type: String, required: true },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  missingPoints: { type: [String], default: [] },
  nextQuestion: { type: String },
  answerMethod: { type: String },
  communicationNote: { type: String }
});

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, required: true },
  difficulty: { type: String, required: true },
  category: { type: String, required: true },
  codingTemplate: { type: String },
  expectedOutput: { type: String },
  candidateAnswer: { type: String },
  answerMethod: { type: String },
  evaluation: { type: EvaluationSchema }
});

const RoadmapStepSchema = new Schema({
  phase: { type: String, required: true },
  topic: { type: String, required: true },
  actionSteps: { type: [String], default: [] }
});

const FeedbackSchema = new Schema({
  summary: { type: String, required: true },
  strongTopics: { type: [String], default: [] },
  weakTopics: { type: [String], default: [] },
  resumeImprovements: { type: [String], default: [] },
  improvementRoadmap: { type: [RoadmapStepSchema], default: [] }
});

const ReportSchema = new Schema({
  overallScore: { type: Number, required: true },
  technicalRating: { type: Number, required: true },
  communicationRating: { type: Number, required: false },
  communicationEvaluated: { type: Boolean, default: true },
  communicationNote: { type: String },
  confidenceRating: { type: Number, required: true },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  recommendedTopics: { type: [String], default: [] },
  overallFeedback: { type: String, required: true },
  hiringRecommendation: { type: String, required: true }
});

const InterviewSessionSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    candidateName: { type: String },
    registerNumber: { type: String, index: true },
    studentDepartment: { type: String },
    studentYear: { type: String },
    interviewType: { type: String, required: true },
    difficulty: { type: String, required: true },
    experienceLevel: { type: String, required: true },
    company: { type: String, required: true },
    status: { type: String, enum: ["active", "completed", "terminated_violation"], default: "active" },
    terminationReason: { type: String },
    integrityReport: { type: Object },
    questions: { type: [QuestionSchema], default: [] },
    overallScore: { type: Number },
    feedback: { type: FeedbackSchema },
    report: { type: ReportSchema },
    biometricsSummary: { type: Object }
  },
  {
    timestamps: true
  }
);

export const InterviewSessionModel: Model<IInterviewSession> =
  mongoose.models.InterviewSession || mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);
