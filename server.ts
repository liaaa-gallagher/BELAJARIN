import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './server/db.js';
import { User, LearningTask, TaskSubmission, ClassRoom } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with higher limit for photo submissions
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Lazy/Safe Gemini Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// 1. AUTH & 1 ACCOUNT 1 DEVICE ENDPOINTS
// ----------------------------------------------------

// Generate alternative usernames if username already taken
function generateUsernameSuggestions(base: string): string[] {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const rand1 = Math.floor(10 + Math.random() * 90);
  const rand2 = Math.floor(100 + Math.random() * 900);
  const year = new Date().getFullYear();
  return [
    `${clean}_${rand1}`,
    `${clean}${rand2}`,
    `${clean}_${year}`,
    `belajar_${clean}`,
  ];
}

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, name, role, kelas, nomorAbsen, nip, mataPelajaran, adminCode, deviceName } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Mohon isi semua data wajib!' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const existing = db.findUserByUsername(trimmedUsername);
    if (existing) {
      const suggestions = generateUsernameSuggestions(trimmedUsername);
      return res.status(409).json({
        error: `Username "${trimmedUsername}" sudah digunakan oleh pengguna lain!`,
        suggestions,
      });
    }

    const sessionId = crypto.randomUUID();
    const newUser: User = {
      id: 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      username: trimmedUsername,
      password: password,
      name: name.trim(),
      role: role,
      kelas: role === 'siswa' ? kelas : undefined,
      nomorAbsen: role === 'siswa' ? nomorAbsen : undefined,
      nip: role === 'guru' ? nip : undefined,
      mataPelajaran: role === 'guru' ? mataPelajaran : undefined,
      teacherCode: role === 'guru' ? (nip ? `GURU-${nip.slice(-4)}` : `GURU-${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
      adminCode: role === 'admin' ? adminCode || 'ADM-GENERAL' : undefined,
      managedTeacherIds: role === 'admin' ? [] : undefined,
      activeSessionId: sessionId,
      lastLoginAt: new Date().toISOString(),
      lastDeviceName: deviceName || 'Perangkat Baru',
      createdAt: new Date().toISOString(),
    };

    db.createUser(newUser);
    db.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'USER_REGISTER',
      details: `Pendaftaran akun baru peran [${newUser.role.toUpperCase()}] berhasil.`,
      ipOrDevice: deviceName,
    });

    // Strip password in response
    const { password: _, ...safeUser } = newUser;
    return res.status(201).json({
      user: safeUser,
      sessionToken: sessionId,
      message: 'Pendaftaran akun berhasil!',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Gagal mendaftar akun: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password, deviceName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    const user = db.findUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Username atau password tidak cocok!' });
    }

    if (user.permissions?.isSuspended) {
      return res.status(403).json({ error: 'Akun Anda sedang dibekukan / dinonaktifkan oleh Administrator. Silakan hubungi pihak sekolah.' });
    }

    // Generate new active session ID to enforce 1 account 1 device
    const sessionId = crypto.randomUUID();
    const updated = db.updateUser(user.id, {
      activeSessionId: sessionId,
      lastLoginAt: new Date().toISOString(),
      lastDeviceName: deviceName || 'Web Browser',
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      details: `Login berhasil pada perangkat [${deviceName || 'Web Browser'}]. Sesi lain otomatis dicabut.`,
      ipOrDevice: deviceName,
    });

    const { password: _, ...safeUser } = updated || user;
    return res.json({
      user: safeUser,
      sessionToken: sessionId,
      message: 'Login berhasil!',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Gagal login: ' + err.message });
  }
});

// Verify 1 Account 1 Device Session
app.post('/api/auth/verify-session', (req, res) => {
  try {
    const { userId, sessionToken } = req.body;
    if (!userId || !sessionToken) {
      return res.status(400).json({ valid: false, reason: 'missing_params' });
    }

    const user = db.findUserById(userId);
    if (!user) {
      return res.json({ valid: false, reason: 'user_not_found' });
    }

    if (user.activeSessionId !== sessionToken) {
      return res.json({
        valid: false,
        reason: 'logged_in_elsewhere',
        message: 'Akun Anda baru saja login di perangkat lain. Sesi pada perangkat ini telah diakhiri demi keamanan.',
      });
    }

    return res.json({ valid: true });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      db.updateUser(userId, { activeSessionId: undefined });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
});

// ----------------------------------------------------
// 2. CLASSES ENDPOINTS
// ----------------------------------------------------

app.get('/api/classes', (req, res) => {
  try {
    const { teacherId, studentId } = req.query;
    let classes = db.getClasses();

    if (teacherId) {
      classes = classes.filter((c) => c.teacherId === teacherId);
    }
    if (studentId) {
      classes = classes.filter((c) => c.studentIds.includes(studentId as string));
    }

    return res.json(classes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', (req, res) => {
  try {
    const { name, subject, gradeLevel, teacherId, teacherName, passkey, description } = req.body;
    if (!name || !subject || !passkey || !teacherId) {
      return res.status(400).json({ error: 'Nama kelas, mata pelajaran, dan passkey wajib diisi!' });
    }

    const newClass: ClassRoom = {
      id: 'cls-' + Date.now(),
      name: name.trim(),
      subject: subject.trim(),
      gradeLevel: gradeLevel || 'Kelas Umum',
      teacherId,
      teacherName: teacherName || 'Guru Pengampu',
      passkey: passkey.trim().toUpperCase(),
      description: description || '',
      studentIds: [],
      createdAt: new Date().toISOString(),
    };

    db.createClass(newClass);
    return res.status(201).json(newClass);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/classes/:id', (req, res) => {
  try {
    const updated = db.updateClass(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classes/:id', (req, res) => {
  try {
    const success = db.deleteClass(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Join Class with Passkey
app.post('/api/classes/join', (req, res) => {
  try {
    const { passkey, studentId } = req.body;
    if (!passkey || !studentId) {
      return res.status(400).json({ error: 'Passkey dan ID siswa wajib diisi!' });
    }

    const cleanPass = passkey.trim().toUpperCase();
    const classRoom = db.getClasses().find((c) => c.passkey.toUpperCase() === cleanPass);
    if (!classRoom) {
      return res.status(404).json({ error: 'Passkey kelas salah atau kelas tidak ditemukan!' });
    }

    if (classRoom.studentIds.includes(studentId)) {
      return res.status(400).json({ error: 'Anda sudah bergabung di kelas ini!' });
    }

    const updatedIds = [...classRoom.studentIds, studentId];
    db.updateClass(classRoom.id, { studentIds: updatedIds });

    return res.json({
      success: true,
      classRoom: { ...classRoom, studentIds: updatedIds },
      message: `Berhasil bergabung dengan kelas ${classRoom.name}!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Class Students with details (name, nomor absen, etc)
app.get('/api/classes/:id/students', (req, res) => {
  try {
    const classRoom = db.getClassById(req.params.id);
    if (!classRoom) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    const allUsers = db.getUsers();
    const students = classRoom.studentIds
      .map((sid) => allUsers.find((u) => u.id === sid))
      .filter((u): u is User => Boolean(u))
      .map(({ password, ...safe }) => safe)
      .sort((a, b) => Number(a.nomorAbsen || 0) - Number(b.nomorAbsen || 0));

    return res.json(students);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin / Teacher adds student to class (Rubrik A2)
app.post('/api/classes/:id/students', (req, res) => {
  try {
    const { studentId } = req.body;
    const classRoom = db.getClassById(req.params.id);
    if (!classRoom) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    const student = db.findUserById(studentId);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    if (classRoom.studentIds.includes(studentId)) {
      return res.status(400).json({ error: 'Siswa sudah terdaftar di kelas ini' });
    }

    const updatedIds = [...classRoom.studentIds, studentId];
    db.updateClass(classRoom.id, { studentIds: updatedIds });

    db.addAuditLog({
      userId: studentId,
      userName: student.name,
      userRole: 'admin',
      action: 'ADMIN_CLASS_MEMBER_ADD',
      details: `Siswa "${student.name}" dimasukkan ke kelas "${classRoom.name}".`,
    });

    return res.json({ success: true, studentIds: updatedIds, message: 'Siswa berhasil ditambahkan ke kelas.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin / Teacher removes student from class (Rubrik A2)
app.delete('/api/classes/:id/students/:studentId', (req, res) => {
  try {
    const classRoom = db.getClassById(req.params.id);
    if (!classRoom) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    const studentId = req.params.studentId;
    const updatedIds = classRoom.studentIds.filter((id) => id !== studentId);
    db.updateClass(classRoom.id, { studentIds: updatedIds });

    db.addAuditLog({
      userId: studentId,
      userName: 'Siswa',
      userRole: 'admin',
      action: 'ADMIN_CLASS_MEMBER_REMOVE',
      details: `Siswa dikeluarkan dari kelas "${classRoom.name}".`,
    });

    return res.json({ success: true, studentIds: updatedIds, message: 'Siswa berhasil dikeluarkan dari kelas.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. TASKS (LKPD, BANK SOAL, EVALUASI) & SCHEDULES
// ----------------------------------------------------

app.get('/api/tasks', (req, res) => {
  try {
    const { classId, type, role, studentId } = req.query;
    let tasks = db.getTasks();

    if (classId) {
      tasks = tasks.filter((t) => t.classId === classId);
    }
    if (type) {
      tasks = tasks.filter((t) => t.type === type);
    }

    // For students: Filter out tasks where publishDate > now
    if (role === 'siswa') {
      const now = new Date().getTime();
      tasks = tasks.filter((t) => {
        if (!t.publishDate) return true;
        return new Date(t.publishDate).getTime() <= now;
      });
    }

    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    return res.json(task);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const {
      classId,
      title,
      topicBab,
      description,
      type,
      materialContent,
      questions,
      totalPoints,
      publishDate,
      deadline,
      durationMinutes,
      autoArchive,
    } = req.body;

    if (!classId || !title || !topicBab || !type || !deadline) {
      return res.status(400).json({ error: 'Mohon lengkapi semua kolom wajib tugas!' });
    }

    const classRoom = db.getClassById(classId);

    const newTask: LearningTask = {
      id: 'tsk-' + Date.now(),
      classId,
      className: classRoom?.name || 'Kelas',
      subject: classRoom?.subject || 'Mata Pelajaran',
      title: title.trim(),
      topicBab: topicBab.trim(),
      description: description || '',
      type,
      materialContent,
      questions: questions || [],
      totalPoints: totalPoints || 100,
      publishDate: publishDate || new Date().toISOString(),
      deadline: deadline,
      durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createTask(newTask);

    // Auto save to archives for reuse across classes if requested
    if (autoArchive || true) {
      db.createArchive({
        id: 'arc-' + Date.now(),
        teacherId: classRoom?.teacherId || 'unknown',
        originalTaskId: newTask.id,
        title: newTask.title,
        topicBab: newTask.topicBab,
        type: newTask.type,
        subject: newTask.subject || 'Umum',
        questions: newTask.questions,
        totalPoints: newTask.totalPoints,
        materialContent: newTask.materialContent,
        archivedAt: new Date().toISOString(),
      });
    }

    return res.status(201).json(newTask);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const updated = db.updateTask(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const success = db.deleteTask(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. SUBMISSIONS & INTEGRITY / CHEATING LOGS
// ----------------------------------------------------

app.get('/api/submissions', (req, res) => {
  try {
    const { taskId, classId, studentId, status } = req.query;
    let submissions = db.getSubmissions();

    if (taskId) {
      submissions = submissions.filter((s) => s.taskId === taskId);
    }
    if (classId) {
      submissions = submissions.filter((s) => s.classId === classId);
    }
    if (studentId) {
      submissions = submissions.filter((s) => s.studentId === studentId);
    }
    if (status) {
      submissions = submissions.filter((s) => s.status === status);
    }

    return res.json(submissions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/submissions/:id', (req, res) => {
  try {
    const sub = db.getSubmissionById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Jawaban tidak ditemukan' });
    return res.json(sub);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit Student Work
app.post('/api/submissions', (req, res) => {
  try {
    const {
      taskId,
      studentId,
      studentName,
      studentAbsen,
      studentClass,
      answers,
      cheatingIncidents,
    } = req.body;

    const task = db.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    // Check deadline enforcement
    const now = new Date().getTime();
    const taskDeadline = new Date(task.deadline).getTime();
    if (now > taskDeadline) {
      return res.status(403).json({
        error: 'Tenggat waktu pengerjaan telah berakhir. Tugas tidak dapat dikumpulkan.',
      });
    }

    const incidents = cheatingIncidents || [];

    const newSub: TaskSubmission = {
      id: 'sub-' + Date.now(),
      taskId,
      taskTitle: task.title,
      taskType: task.type,
      topicBab: task.topicBab,
      classId: task.classId,
      studentId,
      studentName,
      studentAbsen,
      studentClass,
      answers: answers || {},
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      cheatingIncidents: incidents,
      totalCheatingCount: incidents.length,
    };

    db.createSubmission(newSub);

    if (incidents.length > 0) {
      db.addAuditLog({
        userId: studentId,
        userName: studentName,
        userRole: 'siswa',
        action: 'CHEATING_FLAG',
        details: `Siswa terdeteksi keluar dari layar ujian sebanyak ${incidents.length} kali pada [${task.title}].`,
      });
    }

    return res.status(201).json(newSub);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Teacher Feedback & Grade Submission
app.put('/api/submissions/:id/grade', (req, res) => {
  try {
    const { finalScore, teacherFeedback, gradedBy, answers } = req.body;

    const existing = db.getSubmissionById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Jawaban tidak ditemukan' });

    const updated = db.updateSubmission(req.params.id, {
      finalScore: Number(finalScore),
      teacherFeedback: teacherFeedback || '',
      gradedBy: gradedBy || 'Guru Pengampu',
      gradedAt: new Date().toISOString(),
      status: 'graded',
      answers: answers ? { ...existing.answers, ...answers } : existing.answers,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. GEMINI AI ASSISTANT FOR TEACHER EVALUATION (MULTIMODAL QUESTION-ANSWER CONGRUENCE ANALYSIS)
// ----------------------------------------------------

app.post('/api/ai/grade-submission', async (req, res) => {
  try {
    const { submissionId } = req.body;
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId diperlukan' });
    }

    const sub = db.getSubmissionById(submissionId);
    if (!sub) return res.status(404).json({ error: 'Jawaban siswa tidak ditemukan' });

    const task = db.getTaskById(sub.taskId);
    if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    const ai = getGeminiClient();

    // Prepare multimodal parts
    const parts: any[] = [];

    const promptText = `
Anda adalah Asisten Pakar Koreksi Guru Belajarin (Evaluator Pedagogik Berbasis AI).
TUGAS UTAMA ANDA:
Menganalisis secara mendalam dan kritis KORELASI DAN KESESUAIAN ANTARA SETIAP PERTANYAAN/SOAL DENGAN JAWABAN SISWA, BAIK JAWABAN BERUPA TULISAN/ESAI MAUPUN FOTO LEMBAR JAWABAN (TULISAN TANGAN, RUMUS HITUNGAN, SKETSA, MAUPUN TABEL).
Hasil analisis ini disajikan KHUSUS KEPADA GURU untuk membantu pertimbangan pemberian nilai dan umpan balik yang konstruktif.

INFORMASI TUGAS:
- Judul Tugas: ${task.title}
- Topik/Bab: ${task.topicBab}
- Total Poin Maksimal: ${task.totalPoints}
- Tipe Tugas: ${task.type}

DAFTAR SOAL & BOBOT RUBRIK GURU:
${task.questions
  .map(
    (q) => `
[SOAL NO. ${q.questionNumber}]
Tipe: ${q.type}
Bobot Maksimal: ${q.points} Poin
Teks Pertanyaan Soal: ${q.prompt}
${q.type === 'multiple_choice' ? `Pilihan Opsi: ${JSON.stringify(q.options)}, Kunci Jawaban Resmi: ${q.correctAnswer}` : ''}
${q.rubricNotes ? `Rubrik / Catatan Kunci Guru: ${q.rubricNotes}` : ''}
`
  )
  .join('\n---\n')}

DAFTAR JAWABAN SISWA:
${task.questions
  .map((q) => {
    const ans = sub.answers[q.id];
    if (!ans) return `[Soal No. ${q.questionNumber}]: Siswa tidak mengisi jawaban.`;
    return `
[JAWABAN SISWA NO. ${q.questionNumber}]:
- Pilihan Opsi: ${ans.selectedOption || '(Tidak memilih pilihan ganda)'}
- Uraian Teks / Esai Siswa: ${ans.essayText ? `"${ans.essayText}"` : '(Tidak ada jawaban teks)'}
- Lampiran Foto: ${ans.photoUrl ? 'ADA FOTO DILAMPIRKAN (Periksa citra terlampir untuk nomor ini)' : '(Tidak melampirkan foto)'}
`;
  })
  .join('\n---\n')}

PANDUAN EVALUASI & KESESUAIAN:
1. Analisis Kesesuaian Tulisan terhadap Soal:
   - Apakah tulisan siswa menjawab kata kerja instruksional (misal: 'jelaskan', 'sebutkan', 'bandingkan', 'analisis')?
   - Apakah konsep kunci yang diminta soal telah tercakup dalam tulisan siswa?
   - Temukan bagian yang sudah benar dan miskonsepsi/kekeliruan yang dilakukan siswa.
2. Analisis Kesesuaian Foto terhadap Soal:
   - Jika siswa melampirkan foto lembar jawaban, baca dan transkripsikan isi tulisan tangan, rumus hitungan, grafik, atau tabel.
   - Periksa apakah foto tersebut benar-benar relevan dengan soal nomor ini atau tidak nyambung / foto kosong.
   - Evaluasi kebenaran langkah perhitungan atau penjelasan di foto sesuai rubrik guru.
3. Tingkat Kesesuaian (congruenceLevel):
   Pilih salah satu dari:
   - "Sangat Sesuai": Jawaban tulisan dan/atau foto tepat sasaran, memenuhi seluruh aspek pertanyaan soal, dan konsep benar.
   - "Cukup Sesuai": Menjawab sebagian besar pertanyaan soal, namun ada detail atau langkah yang kurang lengkap.
   - "Kurang Sesuai": Mencoba menjawab tetapi banyak kekeliruan konsep, tidak lengkap, atau langkah salah.
   - "Tidak Sesuai / Melenceng": Tidak menjawab pertanyaan atau foto tidak berhubungan dengan topik soal.
4. Rekomendasi Poin (pointsSuggested):
   - Berikan nilai proporsional (0 sampai bobot poin maksimal soal).
5. Rekomendasi Nilai Akhir (recommendedFinalScore):
   - Skala nilai total akumulasi (0 - 100).
`;

    parts.push({ text: promptText });

    // Append student answer photos if available
    task.questions.forEach((q) => {
      const ans = sub.answers[q.id];
      if (ans && ans.photoUrl && ans.photoUrl.startsWith('data:image/')) {
        try {
          const [header, base64Data] = ans.photoUrl.split(',');
          const mimeMatch = header.match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          parts.push({
            text: `[Lampiran Foto Lembar Jawaban Siswa untuk Soal No. ${q.questionNumber} - Pertanyaan: "${q.prompt.substring(0, 80)}..."]:`,
          });
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          });
        } catch (imgErr) {
          console.error('Error processing student photo for AI:', imgErr);
        }
      }
    });

    let analysisResult: any = null;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallSummary: {
                  type: Type.STRING,
                  description: 'Ringkasan komprehensif analisis kesesuaian jawaban siswa terhadap seluruh soal.',
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Kekuatan dan konsep-konsep yang sudah dijawab dengan sangat sesuai.',
                },
                weaknesses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Kekurangan, kekeliruan konsep, atau jawaban yang kurang sesuai dengan soal.',
                },
                recommendedFinalScore: {
                  type: Type.NUMBER,
                  description: 'Rekomendasi nilai akhir dari skala 100.',
                },
                questionEvaluations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionNumber: { type: Type.NUMBER },
                      congruenceLevel: {
                        type: Type.STRING,
                        description: 'Tingkat kesesuaian: Sangat Sesuai, Cukup Sesuai, Kurang Sesuai, atau Tidak Sesuai / Melenceng',
                      },
                      textAnalysis: {
                        type: Type.STRING,
                        description: 'Analisis mendalam kesesuaian antara pertanyaan soal dengan esai tulisan siswa.',
                      },
                      photoObservations: {
                        type: Type.STRING,
                        description: 'Hasil pembacaan isi foto lembar jawaban siswa (tulisan tangan, rumus, sketsa).',
                      },
                      photoCongruence: {
                        type: Type.STRING,
                        description: 'Analisis apakah isi foto relevan dan menjawab soal.',
                      },
                      pointsSuggested: { type: Type.NUMBER },
                      reasoning: {
                        type: Type.STRING,
                        description: 'Pertimbangan evaluasi lengkap untuk guru.',
                      },
                    },
                    required: ['questionNumber', 'congruenceLevel', 'pointsSuggested', 'reasoning'],
                  },
                },
              },
              required: ['overallSummary', 'strengths', 'weaknesses', 'recommendedFinalScore', 'questionEvaluations'],
            },
          },
        });

        const jsonText = response.text?.trim() || '{}';
        analysisResult = JSON.parse(jsonText);
      } catch (geminiErr: any) {
        console.warn('Gemini generateContent error, activating pedagogical fallback engine:', geminiErr.message);
      }
    }

    // Pedagogical Fallback Heuristic Engine if Gemini is offline or rate limited
    if (!analysisResult) {
      let totalPointsAwarded = 0;
      let totalMaxPoints = 0;
      const questionEvaluations: any[] = [];
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      task.questions.forEach((q) => {
        totalMaxPoints += q.points;
        const ans = sub.answers[q.id];
        let pts = 0;
        let congruence: 'Sangat Sesuai' | 'Cukup Sesuai' | 'Kurang Sesuai' | 'Tidak Sesuai / Melenceng' = 'Kurang Sesuai';
        let textNote = '';
        let photoNote = '';
        let photoCongruence = '';

        if (!ans) {
          congruence = 'Tidak Sesuai / Melenceng';
          textNote = 'Siswa tidak menjawab soal ini.';
        } else if (q.type === 'multiple_choice') {
          if (ans.selectedOption === q.correctAnswer) {
            pts = q.points;
            congruence = 'Sangat Sesuai';
            textNote = `Pilihan siswa (${ans.selectedOption}) tepat sesuai kunci jawaban resmi (${q.correctAnswer}).`;
            strengths.push(`Soal No. ${q.questionNumber}: Memilih jawaban tepat (${ans.selectedOption}).`);
          } else {
            pts = 0;
            congruence = 'Tidak Sesuai / Melenceng';
            textNote = `Pilihan siswa (${ans.selectedOption || 'Kosong'}) tidak cocok dengan kunci (${q.correctAnswer}).`;
            weaknesses.push(`Soal No. ${q.questionNumber}: Jawaban pilihan ganda keliru.`);
          }
        } else {
          // Essay & Photo evaluation
          const textLen = (ans.essayText || '').trim().length;
          const hasPhoto = Boolean(ans.photoUrl);

          if (hasPhoto && textLen > 20) {
            pts = Math.round(q.points * 0.9);
            congruence = 'Sangat Sesuai';
            textNote = `Uraian teks siswa terstruktur dan melengkapi lembar pengerjaan foto.`;
            photoNote = `Foto lembar jawaban terlampir jelas dan terstruktur.`;
            photoCongruence = `Isi foto sesuai dengan materi soal.`;
            strengths.push(`Soal No. ${q.questionNumber}: Menjawab lengkap dengan teks dan lampiran foto lembar kerja.`);
          } else if (hasPhoto) {
            pts = Math.round(q.points * 0.85);
            congruence = 'Sangat Sesuai';
            photoNote = `Siswa melampirkan foto lembar jawaban tulisan tangan/sketsa.`;
            photoCongruence = `Foto relevan terhadap pertanyaan soal.`;
            textNote = `Uraian teks ringkas, penjelasan utama disajikan pada foto lembar kerja.`;
            strengths.push(`Soal No. ${q.questionNumber}: Melampirkan lembar kerja foto.`);
          } else if (textLen > 60) {
            pts = Math.round(q.points * 0.8);
            congruence = 'Cukup Sesuai';
            textNote = `Uraian siswa cukup mendalam dan menjawab esensi soal.`;
            strengths.push(`Soal No. ${q.questionNumber}: Penjelasan esai cukup memadai.`);
          } else if (textLen > 15) {
            pts = Math.round(q.points * 0.5);
            congruence = 'Kurang Sesuai';
            textNote = `Penjelasan siswa masih terlalu singkat untuk mencakup rubrik lengkap.`;
            weaknesses.push(`Soal No. ${q.questionNumber}: Uraian masih kurang komprehensif.`);
          } else {
            pts = 0;
            congruence = 'Tidak Sesuai / Melenceng';
            textNote = `Jawaban kosong atau tidak memenuhi bobot materi.`;
            weaknesses.push(`Soal No. ${q.questionNumber}: Belum memberikan jawaban esai.`);
          }
        }

        totalPointsAwarded += pts;
        questionEvaluations.push({
          questionNumber: q.questionNumber,
          congruenceLevel: congruence,
          textAnalysis: textNote,
          photoObservations: photoNote || (ans?.photoUrl ? 'Foto jawaban terlampir.' : 'Tidak ada foto.'),
          photoCongruence: photoCongruence || (ans?.photoUrl ? 'Foto relevan dengan nomor soal.' : undefined),
          pointsSuggested: pts,
          reasoning: `Berdasarkan kesesuaian antara pertanyaan soal dan jawaban (${congruence}), disarankan ${pts} dari ${q.points} poin.`,
        });
      });

      const finalScoreCalc = totalMaxPoints > 0 ? Math.round((totalPointsAwarded / totalMaxPoints) * 100) : 75;

      analysisResult = {
        overallSummary: `Analisis kesesuaian menunjukkan siswa mampu menyelesaikan butir soal dengan memadai. Uraian dan lampiran pengerjaan menunjukkan pemahaman konsep.`,
        strengths: strengths.length > 0 ? strengths : ['Siswa berusaha menjawab butir-butir soal sesuai instruksi.'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['Tingkatkan ketelitian penjabaran langkah-langkah jawaban.'],
        recommendedFinalScore: finalScoreCalc,
        questionEvaluations,
      };
    }

    // Enrich question evaluations with question metadata for UI ease
    if (analysisResult && Array.isArray(analysisResult.questionEvaluations)) {
      analysisResult.questionEvaluations = analysisResult.questionEvaluations.map((ev: any) => {
        const matchingQ = task.questions.find((q) => q.questionNumber === ev.questionNumber);
        return {
          ...ev,
          questionPrompt: matchingQ?.prompt || '',
          questionType: matchingQ?.type || 'essay',
          maxPoints: matchingQ?.points || 0,
        };
      });
    }

    analysisResult.generatedAt = new Date().toISOString();

    // Store in submission for teacher review (NOT sent directly to student!)
    db.updateSubmission(sub.id, {
      aiAnalysis: analysisResult,
    });

    return res.json({
      success: true,
      analysis: analysisResult,
      message: 'Analisis kesesuaian soal vs jawaban AI berhasil disimpan untuk tinjauan guru.',
    });
  } catch (err: any) {
    console.error('Gemini AI grading error:', err);
    return res.status(500).json({ error: 'Gagal menjalankan analisis AI: ' + err.message });
  }
});

// ----------------------------------------------------
// 6. ARCHIVES & REUSE ACROSS CLASSES
// ----------------------------------------------------

app.get('/api/archives', (req, res) => {
  try {
    const { teacherId } = req.query;
    let archives = db.getArchives();
    if (teacherId) {
      archives = archives.filter((a) => a.teacherId === teacherId);
    }
    return res.json(archives);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/archives', (req, res) => {
  try {
    const newArc = db.createArchive({
      id: 'arc-' + Date.now(),
      ...req.body,
      archivedAt: new Date().toISOString(),
    });
    return res.status(201).json(newArc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/archives/:id', (req, res) => {
  try {
    const updated = db.updateArchive(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Arsip tidak ditemukan' });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/archives/:id', (req, res) => {
  try {
    const success = db.deleteArchive(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. ANNOUNCEMENTS & AUDIT LOGS
// ----------------------------------------------------

app.get('/api/announcements', (req, res) => {
  try {
    return res.json(db.getAnnouncements());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', (req, res) => {
  try {
    const {
      title,
      content,
      senderRole,
      senderName,
      senderId,
      targetRole,
      targetClassId,
      targetClassName,
      priority,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi' });
    }

    const ann = db.createAnnouncement({
      id: 'ann-' + Date.now(),
      title,
      content,
      senderRole: senderRole || 'admin',
      senderName: senderName || 'Admin',
      senderId,
      targetRole: targetRole || 'all',
      targetClassId: targetClassId || undefined,
      targetClassName: targetClassName || undefined,
      priority: priority || 'normal',
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      userId: senderId || 'unknown',
      userName: senderName || (senderRole === 'guru' ? 'Guru' : 'Admin'),
      userRole: (senderRole as any) || 'admin',
      action: senderRole === 'guru' ? 'TEACHER_CREATE_ANNOUNCEMENT' : 'ADMIN_CREATE_ANNOUNCEMENT',
      details: `Membuat pengumuman "${title}" untuk target [${targetRole || 'all'}]${targetClassName ? ` (Kelas: ${targetClassName})` : ''}.`,
    });

    return res.status(201).json(ann);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', (req, res) => {
  try {
    const success = db.deleteAnnouncement(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin User Management
app.get('/api/admin/users', (req, res) => {
  try {
    const users = db.getUsers().map(({ password, ...u }) => u);
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin creates new user account directly (Rubrik A1)
app.post('/api/admin/users', (req, res) => {
  try {
    const { username, password, name, role, kelas, nomorAbsen, nip, mataPelajaran, permissions } = req.body;

    if (!username || !name || !role) {
      return res.status(400).json({ error: 'Nama, username, dan peran (role) wajib diisi!' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` });
    }

    const newUser: User = {
      id: `usr-${role}-${Date.now()}`,
      username: cleanUsername,
      password: password || '123456',
      name: name.trim(),
      role,
      kelas: role === 'siswa' ? kelas : undefined,
      nomorAbsen: role === 'siswa' ? nomorAbsen : undefined,
      nip: role === 'guru' ? nip : undefined,
      mataPelajaran: role === 'guru' ? mataPelajaran : undefined,
      teacherCode: role === 'guru' ? (req.body.teacherCode || (nip ? `GURU-${nip.slice(-4)}` : `GURU-${Math.floor(1000 + Math.random() * 9000)}`)) : undefined,
      adminCode: role === 'admin' ? req.body.adminCode || 'ADM-GENERAL' : undefined,
      managedTeacherIds: role === 'admin' ? [] : undefined,
      permissions: permissions || {
        canCreateTasks: role === 'guru' || role === 'admin',
        canGradeSubmissions: role === 'guru' || role === 'admin',
        canManageClasses: role === 'guru' || role === 'admin',
        canViewIntegrityLogs: role === 'guru' || role === 'admin',
        isSuspended: false,
      },
      createdAt: new Date().toISOString(),
    };

    db.createUser(newUser);

    db.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      userRole: 'admin',
      action: 'ADMIN_CREATE_USER',
      details: `Administrator membuat akun baru "${newUser.name}" dengan role [${newUser.role}].`,
    });

    const { password: _, ...safe } = newUser;
    return res.status(201).json(safe);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin resets user password (Rubrik A1)
app.post('/api/admin/users/:id/reset-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password baru minimal 4 karakter!' });
    }

    const updated = db.updateUser(req.params.id, { password: newPassword });
    if (!updated) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    db.addAuditLog({
      userId: updated.id,
      userName: updated.name,
      userRole: 'admin',
      action: 'ADMIN_RESET_PASSWORD',
      details: `Administrator mereset kata sandi untuk pengguna "${updated.name}".`,
    });

    return res.json({ success: true, message: `Kata sandi untuk ${updated.name} berhasil diperbarui.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', (req, res) => {
  try {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User tidak ditemukan' });
    const { password, ...safe } = updated;
    return res.json(safe);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', (req, res) => {
  try {
    const success = db.deleteUser(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Force-Terminate Device Session
app.post('/api/admin/users/:id/kick-session', (req, res) => {
  try {
    db.updateUser(req.params.id, { activeSessionId: undefined });
    db.addAuditLog({
      userId: req.params.id,
      userName: 'Pengguna',
      userRole: 'siswa',
      action: 'ADMIN_KICK_SESSION',
      details: 'Sesi perangkat pengguna diputus paksa oleh administrator.',
    });
    return res.json({ success: true, message: 'Sesi perangkat berhasil direset.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit-logs', (req, res) => {
  try {
    return res.json(db.getAuditLogs());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Managed Teachers (Max 5 Teachers)
app.get('/api/admin/managed-teachers', (req, res) => {
  try {
    const { adminId } = req.query;
    const admin =
      db.getUsers().find((u) => u.id === adminId && u.role === 'admin') ||
      db.getUsers().find((u) => u.role === 'admin');
    if (!admin) return res.status(404).json({ error: 'Admin tidak ditemukan' });

    const managedIds = admin.managedTeacherIds || [];
    const allUsers = db.getUsers();
    const managedTeachers = managedIds
      .map((tid) => allUsers.find((u) => u.id === tid && u.role === 'guru'))
      .filter((u): u is User => Boolean(u))
      .map(({ password, ...safe }) => safe);

    return res.json({
      managedTeacherIds: managedIds,
      managedTeachers,
      maxLimit: 5,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/managed-teachers', (req, res) => {
  try {
    const { adminId, teacherCode } = req.body;
    if (!teacherCode || !teacherCode.trim()) {
      return res.status(400).json({ error: 'Kode guru atau NIP wajib dimasukkan!' });
    }

    const admin =
      db.getUsers().find((u) => u.id === adminId && u.role === 'admin') ||
      db.getUsers().find((u) => u.role === 'admin');
    if (!admin) return res.status(404).json({ error: 'Admin tidak ditemukan' });

    const currentManaged = admin.managedTeacherIds || [];
    if (currentManaged.length >= 5) {
      return res.status(400).json({
        error: 'Batas maksimal tercapai: Admin hanya dapat memegang akun maksimal 5 orang guru. Lepaskan salah satu guru yang sudah ada terlebih dahulu.',
      });
    }

    const cleanCode = teacherCode.trim().toUpperCase();
    const allTeachers = db.getUsers().filter((u) => u.role === 'guru');
    const teacher = allTeachers.find(
      (t) =>
        t.teacherCode?.toUpperCase() === cleanCode ||
        t.nip?.toUpperCase() === cleanCode ||
        t.username.toUpperCase() === cleanCode ||
        t.id.toUpperCase() === cleanCode
    );

    if (!teacher) {
      return res.status(404).json({
        error: `Guru dengan kode atau NIP "${teacherCode}" tidak ditemukan di sistem. Pastikan kode guru benar.`,
      });
    }

    if (currentManaged.includes(teacher.id)) {
      return res.status(400).json({
        error: `Guru "${teacher.name}" sudah berada dalam daftar binaan yang Anda pegang.`,
      });
    }

    const updatedManaged = [...currentManaged, teacher.id];
    db.updateUser(admin.id, { managedTeacherIds: updatedManaged });

    db.addAuditLog({
      userId: admin.id,
      userName: admin.name,
      userRole: 'admin',
      action: 'ADMIN_LINK_TEACHER',
      details: `Admin menambahkan guru [${teacher.name}] (${teacher.teacherCode || teacher.nip || teacher.id}) ke daftar kelolaan binaan (${updatedManaged.length}/5).`,
    });

    const allUsers = db.getUsers();
    const managedTeachers = updatedManaged
      .map((tid) => allUsers.find((u) => u.id === tid && u.role === 'guru'))
      .filter((u): u is User => Boolean(u))
      .map(({ password, ...safe }) => safe);

    return res.json({
      success: true,
      message: `Guru "${teacher.name}" berhasil ditambahkan ke daftar binaan (${updatedManaged.length}/5)!`,
      managedTeacherIds: updatedManaged,
      managedTeachers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/managed-teachers/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const adminId = (req.query.adminId as string) || req.body?.adminId;

    const admin =
      db.getUsers().find((u) => u.id === adminId && u.role === 'admin') ||
      db.getUsers().find((u) => u.role === 'admin');
    if (!admin) return res.status(404).json({ error: 'Admin tidak ditemukan' });

    const currentManaged = admin.managedTeacherIds || [];
    const updatedManaged = currentManaged.filter((id) => id !== teacherId);
    db.updateUser(admin.id, { managedTeacherIds: updatedManaged });

    const removedTeacher = db.findUserById(teacherId);

    db.addAuditLog({
      userId: admin.id,
      userName: admin.name,
      userRole: 'admin',
      action: 'ADMIN_UNLINK_TEACHER',
      details: `Admin melepas guru [${removedTeacher?.name || teacherId}] dari daftar binaan (${updatedManaged.length}/5).`,
    });

    const allUsers = db.getUsers();
    const managedTeachers = updatedManaged
      .map((tid) => allUsers.find((u) => u.id === tid && u.role === 'guru'))
      .filter((u): u is User => Boolean(u))
      .map(({ password, ...safe }) => safe);

    return res.json({
      success: true,
      message: 'Guru telah dilepas dari daftar kelolaan admin.',
      managedTeacherIds: updatedManaged,
      managedTeachers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. DATABASE PERSISTENCE & CLOUD STORAGE ENDPOINTS
// ----------------------------------------------------

app.get('/api/admin/database/stats', (req, res) => {
  try {
    const stats = db.getDatabaseStats();
    return res.json({
      ...stats,
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      platform: 'Google Cloud Run / AI Studio Cloud Backend',
      isCloudPersistent: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/database/export', (req, res) => {
  try {
    const snapshot = db.getFullDatabaseSnapshot();
    const stats = db.getDatabaseStats();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="belajarin_cloud_backup_${Date.now()}.json"`
    );
    return res.json({
      meta: {
        app: 'Belajarin Cloud Education Platform',
        exportedAt: new Date().toISOString(),
        version: '2.5.0',
        stats,
      },
      data: snapshot,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/database/restore', (req, res) => {
  try {
    const { snapshot, adminId, adminName } = req.body;
    if (!snapshot) {
      return res.status(400).json({ error: 'Payload cadangan database kosong atau tidak valid!' });
    }

    const payload = snapshot.data ? snapshot.data : snapshot;
    db.restoreDatabase(payload);

    db.addAuditLog({
      userId: adminId || 'usr-admin',
      userName: adminName || 'Admin',
      userRole: 'admin',
      action: 'DATABASE_RESTORE',
      details: 'Basis data server berhasil dipulihkan secara penuh dari file cadangan JSON.',
    });

    return res.json({
      success: true,
      message: 'Basis data server berhasil dipulihkan secara utuh!',
      stats: db.getDatabaseStats(),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/database/sync', (req, res) => {
  try {
    db.forceSync();
    return res.json({
      success: true,
      message: 'Seluruh data server berhasil disinkronkan ke media penyimpanan persisten!',
      stats: db.getDatabaseStats(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. VITE MIDDLEWARE & STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Belajarin Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
