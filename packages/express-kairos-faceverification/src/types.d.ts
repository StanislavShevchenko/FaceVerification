export interface SearchResult {
  liveness: number;
  quality: number;
  candidates: Array<{ subjectId: string; score: number }>;
}

export interface Face {
  faceId: string;
  subjectId: string;
  quality: number;
  liveness?: number;
  eyeDistance: number;
  pitch: number;
  roll: number;
  yaw: number;
  width: number;
  height: number;
  topLeftX: number;
  topLeftY: number;
  gender: { f: number; m: number };
  race: {
    other: number;
    white: number;
    asian: number;
    black: number;
    hispanic: number;
  };
  glasses: string;
  age: number;
  error?: string;
}

export interface CallbackData {
  ok: 0 | 1;
  error: string;
  isEnroll: boolean;
  isLive: boolean;
  isDuplicate: boolean;
  isUpdated: boolean;
  isVerified: boolean;
  result: object;
}
export type ProcessCallback = (
  userId: string,
  sessionId: string,
  CallbackData
) => void;
export interface VerifyResult {
  liveness: number;
  score: number;
  face: Face;
}
