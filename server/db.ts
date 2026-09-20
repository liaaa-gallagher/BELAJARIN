import fs from 'fs';
import path from 'path';
import {
  User,
  ClassRoom,
  LearningTask,
  TaskSubmission,
  TaskArchive,
  SystemAnnouncement,
  AuditLog,
} from '../src/types.js';

export interface DatabaseSchema {
  users: User[];
  classes: ClassRoom[];
  tasks: LearningTask[];
  submissions: TaskSubmission[];
  archives: TaskArchive[];
  announcements: SystemAnnouncement[];
  auditLogs: AuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'belajarin_db.json');

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const INITIAL_DATA: DatabaseSchema = {
  users: [
    {
      id: 'usr-admin-1',
      username: 'admin1',
      password: 'password123',
      name: 'Rian Hidayat, S.Kom (Super Admin)',
      role: 'admin',
      adminCode: 'ADM-9901',
      managedTeacherIds: ['usr-guru-1'],
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'usr-guru-1',
      username: 'guru1',
      password: 'password123',
      name: 'Dr. Budi Santoso, M.Pd',
      role: 'guru',
      nip: '198204122008011004',
      mataPelajaran: 'Biologi & Sains',
      teacherCode: 'GURU-1004',
      createdAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: 'usr-siswa-1',
      username: 'siswa1',
      password: 'password123',
      name: 'Ahmad Fauzan',
      role: 'siswa',
      kelas: 'X-MIPA-1',
      nomorAbsen: '04',
      createdAt: '2026-01-03T08:00:00.000Z',
    },
    {
      id: 'usr-siswa-2',
      username: 'siswa2',
      password: 'password123',
      name: 'Nabila Putri Azzahra',
      role: 'siswa',
      kelas: 'X-MIPA-1',
      nomorAbsen: '19',
      createdAt: '2026-01-03T08:30:00.000Z',
    },
  ],
  classes: [
    {
      id: 'cls-bio-101',
      name: 'X MIPA 1 - Biologi Terapan',
      subject: 'Biologi',
      gradeLevel: 'Kelas X',
      teacherId: 'usr-guru-1',
      teacherName: 'Dr. Budi Santoso, M.Pd',
      passkey: 'BIO101',
      description: 'Kelas eksplorasi konsep biologi sel, jaringan tumbuhan, dan metabolisme.',
      studentIds: ['usr-siswa-1', 'usr-siswa-2'],
      createdAt: '2026-01-05T09:00:00.000Z',
    },
    {
      id: 'cls-kim-201',
      name: 'XI MIPA 2 - Kimia Analitik',
      subject: 'Kimia',
      gradeLevel: 'Kelas XI',
      teacherId: 'usr-guru-1',
      teacherName: 'Dr. Budi Santoso, M.Pd',
      passkey: 'KIM2026',
      description: 'Pendalaman reaksi redoks, kinetika kimia, dan titrasi asam basa.',
      studentIds: ['usr-siswa-1'],
      createdAt: '2026-01-06T10:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 'tsk-lkpd-1',
      classId: 'cls-bio-101',
      className: 'X MIPA 1 - Biologi Terapan',
      subject: 'Biologi',
      title: 'LKPD 1: Identifikasi Organel Sel & Fungsinya',
      topicBab: 'Bab 1: Struktur dan Fungsi Sel',
      description: 'Pelajari instruksi percobaan virtual dan identifikasi perbedaan sel hewan vs sel tumbuhan.',
      type: 'lkpd',
      materialContent:
        '# Panduan Pengamatan Sel\n\nSel merupakan unit struktural dan fungsional terkecil dari makhluk hidup. Pada kegiatan ini, amati preparat mikroskopis sel gabus (hewan) dan sel epidermis bawang merah (tumbuhan).\n\nPerhatikan organel-organel utama seperti nukleus, mitokondria, kloroplas, dan dinding sel.',
      questions: [
        {
          id: 'q-lkpd-1',
          questionNumber: 1,
          type: 'multiple_choice',
          prompt: 'Organel sel yang berperan utama sebagai "The Powerhouse of the Cell" dalam respirasi seluler dan pembentukan ATP adalah...',
          options: [
            { id: 'A', text: 'Ribosom' },
            { id: 'B', text: 'Mitokondria' },
            { id: 'C', text: 'Badan Golgi' },
            { id: 'D', text: 'Lisosom' },
          ],
          correctAnswer: 'B',
          points: 25,
        },
        {
          id: 'q-lkpd-2',
          questionNumber: 2,
          type: 'essay',
          prompt: 'Gambarkan dan tuliskan sketsa perbedaan mendasar antara sel hewan dan sel tumbuhan di lembar kerja Anda! Buka kamera atau unggah foto catatan/sketsa Anda yang memuat dinding sel, vakuola, dan kloroplas.',
          rubricNotes: 'Memuat gambar tangan atau catatan yang mencakup dinding sel, vakuola besar, dan kloroplas dengan penjelasan fungsi ringkas.',
          points: 75,
        },
      ],
      totalPoints: 100,
      publishDate: '2026-01-01T00:00:00.000Z',
      deadline: '2026-12-31T23:59:59.000Z',
      durationMinutes: 45,
      createdAt: '2026-01-07T08:00:00.000Z',
      updatedAt: '2026-01-07T08:00:00.000Z',
    },
    {
      id: 'tsk-bank-1',
      classId: 'cls-bio-101',
      className: 'X MIPA 1 - Biologi Terapan',
      subject: 'Biologi',
      title: 'Bank Soal Latihan: Transport Membran Sel',
      topicBab: 'Bab 1: Struktur dan Fungsi Sel',
      description: 'Latihan soal pemahaman mekanisme difusi, osmosis, endositosis, dan eksositosis.',
      type: 'bank_soal',
      questions: [
        {
          id: 'q-bank-1',
          questionNumber: 1,
          type: 'multiple_choice',
          prompt: 'Peristiwa perpindahan molekul air melalui membran semipermeabel dari larutan hipotonik ke hipertonik disebut...',
          options: [
            { id: 'A', text: 'Difusi sederhana' },
            { id: 'B', text: 'Osmosis' },
            { id: 'C', text: 'Transpor aktif' },
            { id: 'D', text: 'Pinositosis' },
          ],
          correctAnswer: 'B',
          points: 50,
        },
        {
          id: 'q-bank-2',
          questionNumber: 2,
          type: 'essay',
          prompt: 'Jelaskan mengapa sel darah merah mengalami krenasi ketika diletakkan dalam larutan garam pekat (hipertonik). Anda dapat mengetik jawaban atau memotret lembar coretan penjelasan Anda!',
          rubricNotes: 'Penjelasan air keluar dari sel secara osmosis karena konsentrasi air di dalam sel lebih tinggi.',
          points: 50,
        },
      ],
      totalPoints: 100,
      publishDate: '2026-01-01T00:00:00.000Z',
      deadline: '2026-12-31T23:59:59.000Z',
      durationMinutes: 30,
      createdAt: '2026-01-08T08:00:00.000Z',
      updatedAt: '2026-01-08T08:00:00.000Z',
    },
    {
      id: 'tsk-eval-1',
      classId: 'cls-bio-101',
      className: 'X MIPA 1 - Biologi Terapan',
      subject: 'Biologi',
      title: 'Evaluasi UH 1: Biologi Sel & Jaringan',
      topicBab: 'Bab 1: Struktur dan Fungsi Sel',
      description: 'Ulangan Harian Bab 1. Dilarang berpindah tab atau keluar layar (terpantau sistem anti-kecurangan).',
      type: 'evaluasi',
      questions: [
        {
          id: 'q-eval-1',
          questionNumber: 1,
          type: 'multiple_choice',
          prompt: 'Komponen membran sel yang bersifat hidrofobik adalah...',
          options: [
            { id: 'A', text: 'Glikolipid luar' },
            { id: 'B', text: 'Ekor asam lemak fosfolipid' },
            { id: 'C', text: 'Kepala fosfat' },
            { id: 'D', text: 'Protein periferal' },
          ],
          correctAnswer: 'B',
          points: 30,
        },
        {
          id: 'q-eval-2',
          questionNumber: 2,
          type: 'multiple_choice',
          prompt: 'Sintesis lipid dan detoksifikasi racun di dalam sel terjadi pada organel...',
          options: [
            { id: 'A', text: 'Retikulum Endoplasma Kasar' },
            { id: 'B', text: 'Retikulum Endoplasma Halus' },
            { id: 'C', text: 'Lisosom' },
            { id: 'D', text: 'Sentrosom' },
          ],
          correctAnswer: 'B',
          points: 30,
        },
        {
          id: 'q-eval-3',
          questionNumber: 3,
          type: 'essay',
          prompt: 'Tuliskan dan jelaskan 3 perbedaan utama pembelahan mitosis dan meiosis dalam sebuah tabel atau catatan, lalu gunakan kamera untuk memfoto hasil catatan Anda!',
          rubricNotes: 'Tabel perbandingan lokasi, jumlah pembelahan, sel anakan (2n vs n), dan tujuan (pertumbuhan vs gamet).',
          points: 40,
        },
      ],
      totalPoints: 100,
      publishDate: '2026-01-01T00:00:00.000Z',
      deadline: '2026-12-31T23:59:59.000Z',
      durationMinutes: 60,
      createdAt: '2026-01-09T08:00:00.000Z',
      updatedAt: '2026-01-09T08:00:00.000Z',
    },
  ],
  submissions: [],
  archives: [
    {
      id: 'arc-bio-sample',
      teacherId: 'usr-guru-1',
      originalTaskId: 'tsk-eval-1',
      title: 'Arsip: UH Biologi Sel Kurikulum Merdeka',
      topicBab: 'Bab 1: Struktur dan Fungsi Sel',
      type: 'evaluasi',
      subject: 'Biologi',
      questions: [
        {
          id: 'q-eval-1',
          questionNumber: 1,
          type: 'multiple_choice',
          prompt: 'Komponen membran sel yang bersifat hidrofobik adalah...',
          options: [
            { id: 'A', text: 'Glikolipid luar' },
            { id: 'B', text: 'Ekor asam lemak fosfolipid' },
            { id: 'C', text: 'Kepala fosfat' },
            { id: 'D', text: 'Protein periferal' },
          ],
          correctAnswer: 'B',
          points: 30,
        },
      ],
      totalPoints: 30,
      archivedAt: '2026-01-09T10:00:00.000Z',
    },
  ],
  announcements: [
    {
      id: 'ann-1',
      title: 'Selamat Datang di Portal Belajarin',
      content: 'Selamat datang di Belajarin. Ujian daring dilindungi dengan autentikasi 1 akun 1 perangkat dan sensor integritas browser.',
      senderRole: 'admin',
      senderName: 'Sistem Belajarin',
      targetRole: 'all',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      timestamp: '2026-01-01T08:00:00.000Z',
      userId: 'usr-admin-1',
      userName: 'Rian Hidayat',
      userRole: 'admin',
      action: 'SYSTEM_BOOT',
      details: 'Server Belajarin diinisialisasi.',
    },
  ],
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      ensureDirExists(DB_DIR);
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
        return JSON.parse(JSON.stringify(INITIAL_DATA));
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        parsed.users.forEach((u: User) => {
          if (u.role === 'guru' && !u.teacherCode) {
            u.teacherCode = u.nip ? `GURU-${u.nip.slice(-4)}` : `GURU-${u.id.slice(-4).toUpperCase()}`;
          }
          if (u.role === 'admin' && !u.managedTeacherIds) {
            u.managedTeacherIds = [];
          }
        });
      }
      return parsed;
    } catch (err) {
      console.error('Error loading DB file, fallback to initial data:', err);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  }

  private saveData(): void {
    try {
      ensureDirExists(DB_DIR);
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  findUserByUsername(username: string): User | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.saveData();
    return this.data.users[idx];
  }

  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Classes
  getClasses(): ClassRoom[] {
    return this.data.classes;
  }

  getClassById(id: string): ClassRoom | undefined {
    return this.data.classes.find((c) => c.id === id);
  }

  createClass(c: ClassRoom): ClassRoom {
    this.data.classes.push(c);
    this.saveData();
    return c;
  }

  updateClass(id: string, updates: Partial<ClassRoom>): ClassRoom | null {
    const idx = this.data.classes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.classes[idx] = { ...this.data.classes[idx], ...updates };
    this.saveData();
    return this.data.classes[idx];
  }

  deleteClass(id: string): boolean {
    const initialLen = this.data.classes.length;
    this.data.classes = this.data.classes.filter((c) => c.id !== id);
    if (this.data.classes.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Tasks
  getTasks(): LearningTask[] {
    return this.data.tasks;
  }

  getTaskById(id: string): LearningTask | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  createTask(task: LearningTask): LearningTask {
    this.data.tasks.push(task);
    this.saveData();
    return task;
  }

  updateTask(id: string, updates: Partial<LearningTask>): LearningTask | null {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.tasks[idx];
  }

  deleteTask(id: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    if (this.data.tasks.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Submissions
  getSubmissions(): TaskSubmission[] {
    return this.data.submissions;
  }

  getSubmissionById(id: string): TaskSubmission | undefined {
    return this.data.submissions.find((s) => s.id === id);
  }

  createSubmission(submission: TaskSubmission): TaskSubmission {
    // Remove existing submission for this student and task if resubmitted
    this.data.submissions = this.data.submissions.filter(
      (s) => !(s.taskId === submission.taskId && s.studentId === submission.studentId)
    );
    this.data.submissions.push(submission);
    this.saveData();
    return submission;
  }

  updateSubmission(id: string, updates: Partial<TaskSubmission>): TaskSubmission | null {
    const idx = this.data.submissions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.submissions[idx] = { ...this.data.submissions[idx], ...updates };
    this.saveData();
    return this.data.submissions[idx];
  }

  // Archives
  getArchives(): TaskArchive[] {
    return this.data.archives;
  }

  createArchive(archive: TaskArchive): TaskArchive {
    this.data.archives.push(archive);
    this.saveData();
    return archive;
  }

  updateArchive(id: string, updates: Partial<TaskArchive>): TaskArchive | null {
    const idx = this.data.archives.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.archives[idx] = { ...this.data.archives[idx], ...updates };
    this.saveData();
    return this.data.archives[idx];
  }

  deleteArchive(id: string): boolean {
    const len = this.data.archives.length;
    this.data.archives = this.data.archives.filter((a) => a.id !== id);
    if (this.data.archives.length !== len) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Announcements
  getAnnouncements(): SystemAnnouncement[] {
    return this.data.announcements;
  }

  createAnnouncement(ann: SystemAnnouncement): SystemAnnouncement {
    this.data.announcements.unshift(ann);
    this.saveData();
    return ann;
  }

  deleteAnnouncement(id: string): boolean {
    const len = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter((a) => a.id !== id);
    if (this.data.announcements.length !== len) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(entry);
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.saveData();
    return entry;
  }

  // Database Persistence & Cloud Storage Stats
  getDatabaseStats() {
    let sizeBytes = 0;
    let lastModified: string = new Date().toISOString();
    try {
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        sizeBytes = stats.size;
        lastModified = stats.mtime.toISOString();
      }
    } catch (e) {
      console.error('Error reading DB stat:', e);
    }

    return {
      storageEngine: 'Cloud Server-Side Persistent JSON Engine',
      filePath: DB_FILE,
      isLocalhostOnly: false,
      isMultiDeviceSync: true,
      sizeBytes,
      sizeFormatted: (sizeBytes / 1024).toFixed(2) + ' KB',
      lastModified,
      counts: {
        users: this.data.users.length,
        classes: this.data.classes.length,
        tasks: this.data.tasks.length,
        submissions: this.data.submissions.length,
        archives: this.data.archives.length,
        announcements: this.data.announcements.length,
        auditLogs: this.data.auditLogs.length,
      },
    };
  }

  getFullDatabaseSnapshot(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  restoreDatabase(snapshot: DatabaseSchema): boolean {
    if (
      !snapshot ||
      !Array.isArray(snapshot.users) ||
      !Array.isArray(snapshot.classes) ||
      !Array.isArray(snapshot.tasks) ||
      !Array.isArray(snapshot.submissions)
    ) {
      throw new Error('Format cadangan database tidak valid atau rusak!');
    }

    this.data = {
      users: snapshot.users,
      classes: snapshot.classes,
      tasks: snapshot.tasks,
      submissions: snapshot.submissions,
      archives: Array.isArray(snapshot.archives) ? snapshot.archives : [],
      announcements: Array.isArray(snapshot.announcements) ? snapshot.announcements : [],
      auditLogs: Array.isArray(snapshot.auditLogs) ? snapshot.auditLogs : [],
    };

    this.saveData();
    return true;
  }

  forceSync(): void {
    this.saveData();
  }
}

export const db = new DatabaseManager();
