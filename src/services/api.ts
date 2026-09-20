import {
  User,
  ClassRoom,
  LearningTask,
  TaskSubmission,
  TaskArchive,
  SystemAnnouncement,
  AuditLog,
  AIAnalysisResult,
  DatabaseStats,
} from '../types.js';

const BASE_URL = '/api';

export const api = {
  // Auth
  async register(data: {
    username: string;
    password: string;
    name: string;
    role: string;
    kelas?: string;
    nomorAbsen?: string | number;
    nip?: string;
    mataPelajaran?: string;
    adminCode?: string;
    deviceName?: string;
  }): Promise<{ user: User; sessionToken: string; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      const err: any = new Error(json.error || 'Gagal mendaftar');
      err.suggestions = json.suggestions;
      throw err;
    }
    return json;
  },

  async login(
    username: string,
    password: string,
    deviceName?: string
  ): Promise<{ user: User; sessionToken: string; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, deviceName }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Gagal login');
    }
    return json;
  },

  async verifySession(userId: string, sessionToken: string): Promise<{ valid: boolean; reason?: string; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionToken }),
    });
    return res.json();
  },

  async logout(userId: string): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  // Classes
  async getClasses(params?: { teacherId?: string; studentId?: string }): Promise<ClassRoom[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${BASE_URL}/classes?${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createClass(data: Partial<ClassRoom>): Promise<ClassRoom> {
    const res = await fetch(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Gagal membuat kelas');
    }
    return res.json();
  },

  async updateClass(id: string, data: Partial<ClassRoom>): Promise<ClassRoom> {
    const res = await fetch(`${BASE_URL}/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteClass(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/classes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async joinClass(passkey: string, studentId: string): Promise<{ success: boolean; classRoom: ClassRoom; message: string }> {
    const res = await fetch(`${BASE_URL}/classes/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey, studentId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Gagal bergabung ke kelas');
    }
    return json;
  },

  async getClassStudents(classId: string): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/classes/${classId}/students`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async addClassStudent(classId: string, studentId: string): Promise<{ success: boolean; studentIds: string[]; message: string }> {
    const res = await fetch(`${BASE_URL}/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal menambahkan siswa ke kelas');
    return json;
  },

  async removeClassStudent(classId: string, studentId: string): Promise<{ success: boolean; studentIds: string[]; message: string }> {
    const res = await fetch(`${BASE_URL}/classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal mengeluarkan siswa dari kelas');
    return json;
  },

  // Tasks
  async getTasks(params?: { classId?: string; type?: string; role?: string; studentId?: string }): Promise<LearningTask[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${BASE_URL}/tasks?${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getTaskById(id: string): Promise<LearningTask> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`);
    if (!res.ok) throw new Error('Tugas tidak ditemukan');
    return res.json();
  },

  async createTask(data: Partial<LearningTask>): Promise<LearningTask> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal membuat tugas');
    return json;
  },

  async updateTask(id: string, data: Partial<LearningTask>): Promise<LearningTask> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal memperbarui tugas');
    return json;
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Submissions
  async getSubmissions(params?: { taskId?: string; classId?: string; studentId?: string; status?: string }): Promise<TaskSubmission[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${BASE_URL}/submissions?${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSubmissionById(id: string): Promise<TaskSubmission> {
    const res = await fetch(`${BASE_URL}/submissions/${id}`);
    if (!res.ok) throw new Error('Submission tidak ditemukan');
    return res.json();
  },

  async createSubmission(data: Partial<TaskSubmission>): Promise<TaskSubmission> {
    const res = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal mengumpulkan tugas');
    return json;
  },

  async gradeSubmission(
    id: string,
    data: { finalScore: number; teacherFeedback: string; gradedBy: string; answers?: any }
  ): Promise<TaskSubmission> {
    const res = await fetch(`${BASE_URL}/submissions/${id}/grade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal menyimpan penilaian');
    return json;
  },

  // AI Assistance
  async analyzeWithAI(submissionId: string): Promise<{ success: boolean; analysis: AIAnalysisResult }> {
    const res = await fetch(`${BASE_URL}/ai/grade-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal menjalankan analisis AI');
    return json;
  },

  // Archives
  async getArchives(teacherId?: string): Promise<TaskArchive[]> {
    try {
      const query = teacherId ? `?teacherId=${teacherId}` : '';
      const res = await fetch(`${BASE_URL}/archives${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createArchive(data: Partial<TaskArchive>): Promise<TaskArchive> {
    const res = await fetch(`${BASE_URL}/archives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateArchive(id: string, data: Partial<TaskArchive>): Promise<TaskArchive> {
    const res = await fetch(`${BASE_URL}/archives/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteArchive(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/archives/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Announcements
  async getAnnouncements(): Promise<SystemAnnouncement[]> {
    try {
      const res = await fetch(`${BASE_URL}/announcements`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createAnnouncement(data: Partial<SystemAnnouncement>): Promise<SystemAnnouncement> {
    const res = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/announcements/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Admin
  async getAdminUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createAdminUser(data: Partial<User>): Promise<User> {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal membuat pengguna');
    return json;
  },

  async resetUserPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal mereset kata sandi');
    return json;
  },

  async updateAdminUser(id: string, data: Partial<User>): Promise<User> {
    const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAdminUser(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/admin/users/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async kickUserSession(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/admin/users/${id}/kick-session`, { method: 'POST' });
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/audit-logs`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  // Managed Teachers (Max 5)
  async getManagedTeachers(adminId: string): Promise<{
    managedTeacherIds: string[];
    managedTeachers: User[];
    maxLimit: number;
  }> {
    try {
      const res = await fetch(`${BASE_URL}/admin/managed-teachers?adminId=${adminId}`);
      if (!res.ok) return { managedTeacherIds: [], managedTeachers: [], maxLimit: 5 };
      const data = await res.json();
      return {
        managedTeacherIds: Array.isArray(data.managedTeacherIds) ? data.managedTeacherIds : [],
        managedTeachers: Array.isArray(data.managedTeachers) ? data.managedTeachers : [],
        maxLimit: data.maxLimit || 5,
      };
    } catch {
      return { managedTeacherIds: [], managedTeachers: [], maxLimit: 5 };
    }
  },

  async addManagedTeacher(
    adminId: string,
    teacherCode: string
  ): Promise<{ success: boolean; message: string; managedTeacherIds: string[]; managedTeachers: User[] }> {
    const res = await fetch(`${BASE_URL}/admin/managed-teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, teacherCode }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal menambahkan guru binaan');
    return json;
  },

  async removeManagedTeacher(
    adminId: string,
    teacherId: string
  ): Promise<{ success: boolean; message: string; managedTeacherIds: string[]; managedTeachers: User[] }> {
    const res = await fetch(`${BASE_URL}/admin/managed-teachers/${teacherId}?adminId=${adminId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal melepas guru binaan');
    return json;
  },

  // Database Persistence & Cloud Storage
  async getDatabaseStats(): Promise<DatabaseStats> {
    const res = await fetch(`${BASE_URL}/admin/database/stats`);
    if (!res.ok) throw new Error('Gagal mengambil status basis data');
    return res.json();
  },

  async exportDatabase(): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/database/export`);
    if (!res.ok) throw new Error('Gagal mengekspor data cadangan');
    return res.json();
  },

  async restoreDatabase(
    snapshot: any,
    adminId?: string,
    adminName?: string
  ): Promise<{ success: boolean; message: string; stats: DatabaseStats }> {
    const res = await fetch(`${BASE_URL}/admin/database/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, adminId, adminName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal memulihkan basis data');
    return json;
  },

  async syncDatabase(): Promise<{ success: boolean; message: string; stats: DatabaseStats }> {
    const res = await fetch(`${BASE_URL}/admin/database/sync`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal sinkronisasi data');
    return json;
  },
};
