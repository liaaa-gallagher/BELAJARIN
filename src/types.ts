export type UserRole = 'siswa' | 'guru' | 'admin';

export interface UserPermissions {
  canCreateTasks?: boolean;
  canGradeSubmissions?: boolean;
  canManageClasses?: boolean;
  canViewIntegrityLogs?: boolean;
  isSuspended?: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  // Siswa specific
  kelas?: string;
  nomorAbsen?: number | string;
  // Guru specific
  nip?: string;
  mataPelajaran?: string;
  teacherCode?: string;
  // Admin specific
  adminCode?: string;
  managedTeacherIds?: string[];
  // Granular access control permissions (Rubrik A3)
  permissions?: UserPermissions;
  // Session tracking for 1 account 1 device
  activeSessionId?: string;
  lastLoginAt?: string;
  lastDeviceName?: string;
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  teacherId: string;
  teacherName: string;
  passkey: string;
  description?: string;
  studentIds: string[]; // List of student IDs who joined
  createdAt: string;
}

export type TaskType = 'lkpd' | 'bank_soal' | 'evaluasi';

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D', 'E'
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  questionNumber: number;
  type: 'multiple_choice' | 'essay';
  prompt: string;
  imageUrl?: string;
  options?: QuestionOption[]; // for multiple_choice
  correctAnswer?: string; // 'A', 'B', etc. or key points for essay
  rubricNotes?: string;
  points: number;
}

export interface LearningTask {
  id: string;
  classId: string;
  className?: string;
  subject?: string;
  title: string;
  topicBab: string; // e.g., "Bab 1: Struktur Sel"
  description: string;
  type: TaskType;
  teacherId?: string;
  teacherName?: string;
  materialContent?: string; // text/instructions for LKPD
  materialFileUrl?: string;
  questions: Question[];
  totalPoints: number;
  publishDate: string; // ISO date string - not visible to students before this
  deadline: string; // ISO date string - locked after this
  durationMinutes?: number; // for UH / evaluasi
  scheduledAt?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheatingIncident {
  questionNumber: number;
  durationSeconds: number;
  timestamp: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption?: string; // for multiple_choice
  essayText?: string; // for essay
  photoUrl?: string; // captured/uploaded photo for this specific question
  scoreAwarded?: number;
  aiSuggestedScore?: number;
  aiFeedback?: string;
}

export interface QuestionEvaluation {
  questionNumber: number;
  questionPrompt?: string;
  questionType?: string;
  maxPoints?: number;
  pointsSuggested: number;
  congruenceLevel: 'Sangat Sesuai' | 'Cukup Sesuai' | 'Kurang Sesuai' | 'Tidak Sesuai / Melenceng';
  textAnalysis?: string; // Analisis kesesuaian antara soal dengan tulisan/esai siswa
  photoObservations?: string; // Observasi & pembacaan detail foto lembar kerja siswa
  photoCongruence?: string; // Analisis kesesuaian isi foto terhadap pertanyaan soal
  reasoning: string; // Pertimbangan evaluasi untuk pertimbangan guru
}

export interface AIAnalysisResult {
  overallSummary?: string;
  overallFeedback?: string;
  strengths: string[];
  weaknesses: string[];
  recommendedFinalScore?: number;
  suggestedScore?: number;
  questionEvaluations: QuestionEvaluation[];
  generatedAt: string;
}

export interface DatabaseStats {
  storageEngine: string;
  filePath: string;
  isLocalhostOnly: boolean;
  isMultiDeviceSync: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string;
  counts: {
    users: number;
    classes: number;
    tasks: number;
    submissions: number;
    archives: number;
    announcements: number;
    auditLogs: number;
  };
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  topicBab: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentAbsen: string | number;
  studentClass: string;
  answers: Record<string, StudentAnswer>; // questionId -> answer
  submittedAt: string;
  status: 'submitted' | 'graded';
  cheatingIncidents: CheatingIncident[];
  totalCheatingCount: number;
  finalScore?: number;
  teacherFeedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  aiAnalysis?: AIAnalysisResult; // visible ONLY to teacher!
}

export interface TaskArchive {
  id: string;
  teacherId: string;
  originalTaskId: string;
  title: string;
  topicBab: string;
  type: TaskType;
  subject: string;
  questions: Question[];
  totalPoints: number;
  materialContent?: string;
  archivedAt: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  senderRole: 'admin' | 'guru';
  senderName: string;
  senderId?: string;
  targetRole?: 'all' | 'siswa' | 'guru';
  targetClassId?: string;
  targetClassName?: string;
  priority?: 'normal' | 'penting';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipOrDevice?: string;
}
