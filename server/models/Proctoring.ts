import mongoose, { Schema, Document } from "mongoose";
import { ProctoringEvent, IntegrityReport, ProctoringPolicy } from "../../src/types";

export interface IProctoringEventDocument extends Document, Omit<ProctoringEvent, "id"> {
  id: string;
}

export interface IIntegrityReportDocument extends Document, Omit<IntegrityReport, "id"> {
  id: string;
}

const ProctoringEventSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: ["no_face", "multiple_faces", "gaze_away", "candidate_left", "camera_interrupted", "prohibited_device"],
      required: true
    },
    timestamp: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    confidence: { type: Number, required: true },
    details: { type: String, default: "" },
    deviceType: { type: String },
    isFalsePositive: { type: Boolean, default: false },
    reviewedBy: { type: String },
    reviewerNotes: { type: String }
  },
  { timestamps: true }
);

const IntegrityReportSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    candidateName: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    monitoringDurationSec: { type: Number, required: true },
    status: { type: String, enum: ["completed", "terminated_violation"], required: true },
    terminationReason: { type: String },
    totalWarnings: { type: Number, default: 0 },
    integrityScore: { type: Number, required: true },
    integrityTier: {
      type: String,
      enum: ["High", "Generally Consistent", "Requires Review", "Significant Concerns"],
      required: true
    },
    eventCounts: {
      noFace: { type: Number, default: 0 },
      multipleFaces: { type: Number, default: 0 },
      gazeAway: { type: Number, default: 0 },
      prohibitedDevice: { type: Number, default: 0 },
      cameraInterrupted: { type: Number, default: 0 }
    },
    violations: [ProctoringEventSchema],
    disclaimer: { type: String, required: true },
    reviewedBy: { type: String },
    reviewedAt: { type: String }
  },
  { timestamps: true }
);

export const ProctoringEventModel =
  mongoose.models.ProctoringEvent ||
  mongoose.model<IProctoringEventDocument>("ProctoringEvent", ProctoringEventSchema);

export const IntegrityReportModel =
  mongoose.models.IntegrityReport ||
  mongoose.model<IIntegrityReportDocument>("IntegrityReport", IntegrityReportSchema);

export const defaultProctoringPolicy: ProctoringPolicy = {
  maxWarnings: 3,
  noFaceThresholdSec: 4,
  gazeAwayThresholdSec: 3.5,
  deviceConfidenceThreshold: 0.60,
  deviceConsecutiveDetections: 2,
  autoTerminateOnCritical: true,
  penalties: {
    no_face: 10,
    multiple_faces: 20,
    gaze_away: 8,
    candidate_left: 15,
    camera_interrupted: 15,
    prohibited_device: 25
  }
};
