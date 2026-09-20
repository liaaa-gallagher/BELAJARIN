import React, { useState, useEffect } from 'react';
import {
  User,
  ClassRoom,
  LearningTask,
  TaskSubmission,
  TaskArchive,
  TaskType,
  Question,
  QuestionOption,
  AIAnalysisResult,
  StudentAnswer,
  SystemAnnouncement,
} from '../../types.js';
import { api } from '../../services/api.js';
import { exportSubmissionToPdf } from '../pdf/exportPdf.js';
import {
  Users,
  BookOpen,
  PlusCircle,
  Archive,
  GraduationCap,
  Sparkles,
  Download,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Layers,
  Image as ImageIcon,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  Send,
  HelpCircle,
  RefreshCw,
  Maximize2,
  Megaphone,
  Bell,
  BellRing,
} from 'lucide-react';

interface TeacherDashboardProps {
  currentUser: User;
  onAnnouncementCreated?: () => void;
}

type TeacherTab =
  | 'classes'
  | 'tasks'
  | 'submissions'
  | 'archives'
  | 'create_task'
  | 'announcements';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onAnnouncementCreated,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('classes');

  // Core data states
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [archives, setArchives] = useState<TaskArchive[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Announcement creation states
  const [isCreateAnnModalOpen, setIsCreateAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetClassId, setAnnTargetClassId] = useState('all');
  const [annPriority, setAnnPriority] = useState<'normal' | 'penting'>('normal');
  const [isSubmittingAnn, setIsSubmittingAnn] = useState(false);
  const [annSuccessNotice, setAnnSuccessNotice] = useState<string | null>(null);

  // Selected Class detail modal (Req 10: View enrolled students with nomor absen)
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<ClassRoom | null>(null);
  const [classStudents, setClassStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Class Creation modal (Req 3: Create class with passkey)
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState(currentUser.mataPelajaran || 'Biologi');
  const [newClassPasskey, setNewClassPasskey] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');

  // ----------------------------------------------------------------
  // GForm-like Task Creator States (Req 3, 6, 27, 39, 40)
  // ----------------------------------------------------------------
  const [formTaskType, setFormTaskType] = useState<TaskType>('lkpd');
  const [formClassId, setFormClassId] = useState('');
  const [formTopicBab, setFormTopicBab] = useState('Bab 1: Struktur Sel');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaterialContent, setFormMaterialContent] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formQuestions, setFormQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      questionNumber: 1,
      type: 'multiple_choice',
      prompt: 'Jelaskan organel sel yang berfungsi menghasilkan energi (ATP)!',
      points: 20,
      options: [
        { id: 'A', text: 'Mitokondria' },
        { id: 'B', text: 'Ribosom' },
        { id: 'C', text: 'Badan Golgi' },
        { id: 'D', text: 'Retikulum Endoplasma' },
      ],
      correctAnswer: 'A',
    },
  ]);

  // Submissions Grading View Filter (Req 11 & 22: per-class, per-task, and separated into "Tanggungan Guru" vs "Sudah Diperiksa")
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterTaskId, setFilterTaskId] = useState<string>('all');
  const [gradingStatusTab, setGradingStatusTab] = useState<'pending' | 'graded'>('pending');

  // Active Grading / AI Modal
  const [activeSubmissionToGrade, setActiveSubmissionToGrade] = useState<TaskSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Load all teacher data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cls, tsk, sub, arc, ann] = await Promise.all([
        api.getClasses({ teacherId: currentUser.id }),
        api.getTasks({ role: 'guru' }),
        api.getSubmissions(),
        api.getArchives(currentUser.id),
        api.getAnnouncements(),
      ]);
      setClasses(cls);
      setTasks(tsk);
      setSubmissions(sub);
      setArchives(arc);
      setAnnouncements(ann);
      if ((cls?.length || 0) > 0 && !formClassId) {
        setFormClassId(cls[0].id);
      }
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      alert('Judul dan isi pengumuman wajib diisi');
      return;
    }

    setIsSubmittingAnn(true);
    try {
      const targetClass = classes.find((c) => c.id === annTargetClassId);
      await api.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
        senderRole: 'guru',
        senderName: currentUser.name,
        senderId: currentUser.id,
        targetRole: 'siswa',
        targetClassId: annTargetClassId === 'all' ? undefined : annTargetClassId,
        targetClassName: targetClass ? targetClass.name : undefined,
        priority: annPriority,
      });

      setAnnSuccessNotice(
        'Pengumuman berhasil disiarkan! Notifikasi merah kini aktif di lonceng notifikasi siswa dan muncul langsung di beranda dashboard siswa.'
      );
      setAnnTitle('');
      setAnnContent('');
      setAnnTargetClassId('all');
      setAnnPriority('normal');
      setIsCreateAnnModalOpen(false);
      onAnnouncementCreated?.();
      await loadData(true);
      setTimeout(() => setAnnSuccessNotice(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyiarkan pengumuman');
    } finally {
      setIsSubmittingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;
    try {
      await api.deleteAnnouncement(id);
      onAnnouncementCreated?.();
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pengumuman');
    }
  };

  useEffect(() => {
    loadData();

    // Auto-polling interval to receive student submissions dynamically
    const pollTimer = setInterval(() => {
      loadData(true);
    }, 6000);

    return () => clearInterval(pollTimer);
  }, [currentUser.id]);

  // Open class enrolled students (Req 10)
  const handleOpenClassStudents = async (cls: ClassRoom) => {
    setSelectedClassForStudents(cls);
    setLoadingStudents(true);
    try {
      const students = await api.getClassStudents(cls.id);
      setClassStudents(students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Create new Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClass({
        name: newClassName,
        subject: newClassSubject,
        passkey: newClassPasskey.toUpperCase().trim(),
        description: newClassDescription,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
      });
      setIsCreateClassModalOpen(false);
      setNewClassName('');
      setNewClassPasskey('');
      setNewClassDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat kelas');
    }
  };

  // GForm Question Helpers
  const addQuestion = (type: 'multiple_choice' | 'essay') => {
    const nextNum = formQuestions.length + 1;
    const newQ: Question = {
      id: `q-${Date.now()}-${nextNum}`,
      questionNumber: nextNum,
      type: type,
      prompt: '',
      points: 20,
      options:
        type === 'multiple_choice'
          ? [
              { id: 'A', text: '' },
              { id: 'B', text: '' },
              { id: 'C', text: '' },
              { id: 'D', text: '' },
            ]
          : undefined,
      correctAnswer: type === 'multiple_choice' ? 'A' : undefined,
    };
    setFormQuestions([...formQuestions, newQ]);
  };

  const removeQuestion = (index: number) => {
    const updated = formQuestions.filter((_, i) => i !== index).map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
    }));
    setFormQuestions(updated);
  };

  // Handle Question Image Upload (Req 27 & 40)
  const handleQuestionImageUpload = (qIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const updated = [...formQuestions];
      updated[qIndex].imageUrl = base64;
      setFormQuestions(updated);
    };
    reader.readAsDataURL(file);
  };

  // Handle Option Image Upload (Req 27 & 40)
  const handleOptionImageUpload = (qIndex: number, optIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const updated = [...formQuestions];
      if (updated[qIndex].options && updated[qIndex].options![optIndex]) {
        updated[qIndex].options![optIndex].imageUrl = base64;
        setFormQuestions(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Task Submit (also saves a copy to archives for republishing! Req 33, 41)
  const handlePublishTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass = classes.find((c) => c.id === formClassId);
    if (!targetClass) {
      alert('Pilih kelas tujuan terlebih dahulu!');
      return;
    }

    const totalPts = formQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
    const deadlineVal =
      formDeadline || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    try {
      const newTask = await api.createTask({
        title: formTitle,
        type: formTaskType,
        classId: targetClass.id,
        className: targetClass.name,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        topicBab: formTopicBab,
        description: formDescription,
        materialContent: formMaterialContent,
        scheduledAt: formScheduledAt || new Date().toISOString(),
        deadline: deadlineVal,
        totalPoints: totalPts || 100,
        questions: formQuestions,
        isPublished: true,
      });

      // Save into teacher bank/archive automatically (Req 33)
      await api.createArchive({
        title: formTitle,
        type: formTaskType,
        topicBab: formTopicBab,
        subject: targetClass.subject,
        teacherId: currentUser.id,
        questions: formQuestions,
        materialContent: formMaterialContent,
      });

      alert(`Tugas "${newTask.title}" berhasil dipublikasikan ke kelas ${targetClass.name}!`);
      setActiveTab('tasks');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menerbitkan tugas');
    }
  };

  // Run AI Grading Analysis (Req 4, 15, 18, 31: Shown to teacher only! Multimodal reads student photo!)
  const handleRunAIAnalysis = async (submissionId: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.analyzeWithAI(submissionId);
      if (res.analysis) {
        setAiAnalysisResult(res.analysis);
        // Pre-fill suggested score and overall feedback
        const score = res.analysis.recommendedFinalScore ?? res.analysis.suggestedScore ?? 85;
        const feedback = res.analysis.overallSummary ?? res.analysis.overallFeedback ?? '';
        setGradeInput(score);
        setFeedbackInput(feedback);
      }
    } catch (err: any) {
      setAiError(err.message || 'Gagal memanggil analisis AI');
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Final Grade by Teacher (Req 18: Teacher decides final score & feedback)
  const handleSubmitTeacherGrade = async () => {
    if (!activeSubmissionToGrade) return;

    try {
      await api.gradeSubmission(activeSubmissionToGrade.id, {
        finalScore: Number(gradeInput),
        teacherFeedback: feedbackInput,
        gradedBy: currentUser.name,
      });

      alert('Nilai dan umpan balik berhasil disimpan untuk siswa ini!');
      setActiveSubmissionToGrade(null);
      setAiAnalysisResult(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan penilaian');
    }
  };

  // Delete Task (Req 38)
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      await api.deleteTask(taskId);
      loadData();
    }
  };

  // Filtered submissions list (Req 11 & 22)
  const filteredSubmissions = submissions.filter((sub) => {
    const matchClass = filterClassId === 'all' || sub.classId === filterClassId;
    const matchTask = filterTaskId === 'all' || sub.taskId === filterTaskId;
    const matchStatus =
      gradingStatusTab === 'pending'
        ? sub.status === 'submitted' || (sub.status as any) === 'pending'
        : sub.status === 'graded';
    return matchClass && matchTask && matchStatus;
  });

  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status === 'submitted' || (s.status as any) === 'pending'
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-16">
      {/* Top Teacher Header & Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between py-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  Portal Manajemen Guru
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-900 text-[11px] font-mono font-bold flex items-center gap-1.5"
                  title="Kode Guru Anda untuk diberikan kepada Admin Sekolah"
                >
                  <KeyRound className="w-3 h-3 text-purple-600" />
                  <span>Kode Guru:</span>
                  <strong className="text-purple-700 font-extrabold">
                    {currentUser.teacherCode ||
                      (currentUser.nip ? `GURU-${currentUser.nip.slice(-4)}` : 'GURU-1004')}
                  </strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800">
                Halo, {currentUser.name}
              </h2>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-refresh-teacher-data"
                onClick={() => loadData(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Segarkan Data Masuk"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>
              <button
                type="button"
                id="btn-nav-create-announcement"
                onClick={() => {
                  setActiveTab('announcements');
                  setIsCreateAnnModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Siarkan pengumuman ke lonceng dan dashboard siswa"
              >
                <Megaphone className="w-4 h-4" />
                <span>+ Buat Pengumuman</span>
              </button>
              <button
                type="button"
                id="btn-nav-create-task"
                onClick={() => setActiveTab('create_task')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Buat Tugas Baru (GForm)
              </button>
            </div>
          </div>

          {/* Teacher Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 border-t border-slate-100 pt-2 pb-1 text-xs">
            <button
              type="button"
              id="teacher-tab-classes"
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'classes'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Daftar Kelas ({classes.length})</span>
            </button>

            <button
              type="button"
              id="teacher-tab-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'tasks'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Daftar Tugas & UH ({tasks.length})</span>
            </button>

            <button
              type="button"
              id="teacher-tab-submissions"
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'submissions'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Koreksian Siswa</span>
              {pendingSubmissionsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {pendingSubmissionsCount} Tanggungan
                </span>
              )}
            </button>

            <button
              type="button"
              id="teacher-tab-archives"
              onClick={() => setActiveTab('archives')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'archives'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Bank Soal & Arsip ({archives.length})</span>
            </button>

            <button
              type="button"
              id="teacher-tab-announcements"
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'announcements'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>
                Pengumuman Siswa (
                {
                  announcements.filter(
                    (a) => a.senderId === currentUser.id || a.senderRole === 'guru'
                  ).length
                }
                )
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ================================================================ */}
        {/* TAB 1: KELAS & DAFTAR SISWA BESERTA NOMOR ABSEN (Req 3 & 10)       */}
        {/* ================================================================ */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manajemen Kelas Anda</h3>
                <p className="text-xs text-slate-500">
                  Klik pada kartu kelas untuk melihat daftar siswa terdaftar beserta nomor absen
                  mereka.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-create-class"
                onClick={() => setIsCreateClassModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                Buat Kelas Baru + Passkey
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">Belum ada kelas yang dibuat</p>
                <p className="text-xs text-slate-400 mt-1">
                  Buat kelas pertama Anda dan bagikan sandi passkey kepada para siswa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => handleOpenClassStudents(cls)}
                    className="p-5 bg-white rounded-3xl border border-slate-200/90 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
                          {cls.subject}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {cls.studentIds?.length || 0} Siswa
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-slate-800 group-hover:text-purple-700 transition-colors">
                        {cls.name}
                      </h4>
                      {cls.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cls.description}</p>
                      )}

                      {/* Passkey Banner */}
                      <div className="mt-4 p-3 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-purple-800 font-bold">
                          <KeyRound className="w-4 h-4 text-purple-600" />
                          <span>Passkey Kelas:</span>
                        </div>
                        <span className="font-mono font-black text-sm bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900 tracking-wider">
                          {cls.passkey}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                      <span>Lihat Rincian Absen Siswa</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: DAFTAR TUGAS & UH GURU (Req 3, 6, 38)                     */}
        {/* ================================================================ */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daftar Materi & Ujian Terbit</h3>
                <p className="text-xs text-slate-500">
                  Pantau jadwal penugasan, tenggat waktu, dan kelola soal-soal Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('create_task')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Tugas Baru
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => {
                const subCount = submissions.filter((s) => s.taskId === task.id).length;

                return (
                  <div
                    key={task.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-purple-200 transition-all flex flex-wrap items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            task.type === 'lkpd'
                              ? 'bg-blue-100 text-blue-700'
                              : task.type === 'bank_soal'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {task.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {task.className}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-400 font-medium">{task.topicBab}</span>
                      </div>

                      <h4 className="font-bold text-base text-slate-800">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Tenggat: {new Date(task.deadline).toLocaleString('id-ID')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {subCount} Siswa Mengumpulkan
                        </span>
                        <span>{task.questions?.length || 0} Soal</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTaskId(task.id);
                          setFilterClassId(task.classId);
                          setActiveTab('submissions');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Periksa Jawaban ({subCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 text-xs cursor-pointer"
                        title="Hapus Tugas Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: KOREKSIAN SISWA & ANALISIS AI (Req 4, 11, 15, 18, 22, 31)   */}
        {/* ================================================================ */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Lembar Koreksi Siswa (Per Kelas & Per Sesi)
                </h3>
                <p className="text-xs text-slate-500">
                  Gunakan bantuan analisis AI multimodal untuk memeriksa jawaban teks & foto siswa,
                  lalu tentukan nilai akhir dan feedback.
                </p>
              </div>

              {/* Status Toggle: Tanggungan Guru vs Sudah Diperiksa (Req 22) */}
              <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl">
                <button
                  type="button"
                  id="tab-sub-pending"
                  onClick={() => setGradingStatusTab('pending')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    gradingStatusTab === 'pending'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tanggungan Belum Dikoreksi ({pendingSubmissionsCount})
                </button>
                <button
                  type="button"
                  id="tab-sub-graded"
                  onClick={() => setGradingStatusTab('graded')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    gradingStatusTab === 'graded'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sudah Dikoreksi
                </button>
              </div>
            </div>

            {/* Filter Bar (Req 11: Koreksian guru dibuat perkelas dan persesi penugasan) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Filter className="w-4 h-4 text-purple-600" />
                <span>Filter Lembar:</span>
              </div>

              {/* Filter Class */}
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-700"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Filter Task */}
              <select
                value={filterTaskId}
                onChange={(e) => setFilterTaskId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-700"
              >
                <option value="all">Semua Sesi Tugas / UH</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Submissions Grid */}
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {gradingStatusTab === 'pending'
                    ? 'Tidak ada tanggungan koreksi pada filter ini'
                    : 'Belum ada lembar yang sudah dikoreksi'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubmissions.map((sub) => {
                  const task = tasks.find((t) => t.id === sub.taskId);

                  return (
                    <div
                      key={sub.id}
                      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            {sub.taskType.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            Absen: No. {sub.studentAbsen || '-'}
                          </span>
                        </div>

                        <h4 className="font-bold text-base text-slate-800">{sub.studentName}</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {sub.studentClass} • {sub.taskTitle}
                        </p>

                        {/* Cheating Alert if any */}
                        {sub.totalCheatingCount > 0 ? (
                          <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Terdeteksi {sub.totalCheatingCount}x pindah layar!</span>
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Integritas browser bersih
                          </div>
                        )}

                        {/* Score if graded */}
                        {sub.status === 'graded' && (
                          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-slate-500">Nilai Akhir:</span>
                            <span className="font-black text-indigo-700 text-base">
                              {sub.finalScore} / 100
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubmissionToGrade(sub);
                            setGradeInput(sub.finalScore || 85);
                            setFeedbackInput(sub.teacherFeedback || '');
                            setAiAnalysisResult(sub.aiAnalysis || null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {sub.status === 'graded' ? 'Ubah Nilai / Feedback' : 'Koreksi & Analisis AI'}
                        </button>

                        <button
                          type="button"
                          onClick={() => exportSubmissionToPdf(sub, task)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
                          title="Unduh PDF Lembar Siswa Ini"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: BANK SOAL & ARSIP (Req 33, 41, 42)                        */}
        {/* ================================================================ */}
        {activeTab === 'archives' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bank Soal & Arsip Guru (Republishable)
                </h3>
                <p className="text-xs text-slate-500">
                  Soal-soal yang tersimpan di arsip dapat Anda gunakan kembali dan terbitkan ke kelas
                  lain.
                </p>
              </div>
            </div>

            {archives.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                <Archive className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Bank Soal belum terisi</p>
                <p className="text-xs text-slate-400 mt-1">
                  Saat Anda menerbitkan tugas atau UH baru, soal akan otomatis disimpan ke arsip
                  ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archives.map((arc) => (
                  <div
                    key={arc.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          {arc.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">{arc.subject}</span>
                      </div>

                      <h4 className="font-bold text-base text-slate-800">{arc.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{arc.topicBab}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {arc.questions?.length || 0} Soal Tersimpan
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          // Pre-fill creator with this archive
                          setFormTitle(arc.title);
                          setFormTaskType(arc.type);
                          setFormTopicBab(arc.topicBab);
                          setFormQuestions(arc.questions || []);
                          setFormMaterialContent(arc.materialContent || '');
                          setActiveTab('create_task');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Terbitkan ke Kelas Lain
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Hapus arsip soal ini?')) {
                            await api.deleteArchive(arc.id);
                            loadData();
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: GFORM-LIKE TASK & QUESTION CREATOR (Req 3, 6, 27, 39, 40)   */}
        {/* ================================================================ */}
        {activeTab === 'create_task' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Pembuat Materi & Tugas (GForm-Style)
                </h3>
                <p className="text-xs text-slate-500">
                  Rancang LKPD, Bank Soal Latihan, atau Evaluasi Ulangan Harian dengan dukungan gambar
                  dan esai.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handlePublishTask} className="space-y-6">
              {/* Card 1: Task Meta */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Task Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipe Penugasan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formTaskType}
                      onChange={(e) => setFormTaskType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="lkpd">LKPD (Lembar Kerja Peserta Didik)</option>
                      <option value="bank_soal">Bank Soal (Latihan Soal)</option>
                      <option value="evaluasi">Evaluasi (Ulangan Harian - UH)</option>
                    </select>
                  </div>

                  {/* Target Class */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kelas Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                      required
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.subject})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topic / Bab */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Topik / Bab Materi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTopicBab}
                      onChange={(e) => setFormTopicBab(e.target.value)}
                      placeholder="contoh: Bab 1: Struktur Sel"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Tugas / Evaluasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="contoh: Evaluasi Harian Struktur dan Fungsi Organel Sel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi / Petunjuk Pengerjaan:
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Tuliskan petunjuk umum pengerjaan bagi peserta didik..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                {/* LKPD Material content (if LKPD) */}
                {formTaskType === 'lkpd' && (
                  <div>
                    <label className="block text-xs font-bold text-purple-800 mb-1">
                      Materi Bacaan / Eksperimen LKPD:
                    </label>
                    <textarea
                      rows={4}
                      value={formMaterialContent}
                      onChange={(e) => setFormMaterialContent(e.target.value)}
                      placeholder="Tuliskan ringkasan materi, teori pengantar, atau langkah-langkah kerja praktikum..."
                      className="w-full p-3 rounded-xl border border-purple-200 bg-purple-50/30 text-xs leading-relaxed"
                    />
                  </div>
                )}

                {/* Schedule and Deadline (Req 6 & 17) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jadwal Rilis / Buka Soal:
                    </label>
                    <input
                      type="datetime-local"
                      value={formScheduledAt}
                      onChange={(e) => setFormScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tenggat Waktu (Deadline) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Question List (GForm-style with images & options) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                    Daftar Butir Soal ({formQuestions.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addQuestion('multiple_choice')}
                      className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Pilihan Ganda
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestion('essay')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Soal Esai
                    </button>
                  </div>
                </div>

                {formQuestions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 relative"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                          {q.questionNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Soal Esai'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400">Bobot:</span>
                          <input
                            type="number"
                            value={q.points}
                            onChange={(e) => {
                              const updated = [...formQuestions];
                              updated[qIndex].points = Number(e.target.value);
                              setFormQuestions(updated);
                            }}
                            className="w-16 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                          />
                          <span className="text-slate-400">Poin</span>
                        </div>

                        {formQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teks Pertanyaan Soal No. {q.questionNumber}:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={q.prompt}
                        onChange={(e) => {
                          const updated = [...formQuestions];
                          updated[qIndex].prompt = e.target.value;
                          setFormQuestions(updated);
                        }}
                        placeholder="Ketikkan teks soal di sini..."
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm leading-relaxed"
                      />
                    </div>

                    {/* Question Image Attachment (Req 27 & 40) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                        Unggah Gambar pada Soal (Opsional):
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleQuestionImageUpload(qIndex, file);
                        }}
                        className="text-xs text-slate-500"
                      />
                      {q.imageUrl && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={q.imageUrl}
                            alt="Soal Lampiran"
                            className="max-h-40 rounded-xl border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formQuestions];
                              updated[qIndex].imageUrl = undefined;
                              setFormQuestions(updated);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Multiple Choice Options with individual option images (Req 27 & 40) */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-slate-700">
                          Pilihan Jawaban (Tandai Kunci Jawaban Benar):
                        </label>

                        {q.options.map((opt, optIndex) => (
                          <div
                            key={opt.id}
                            className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctAnswer === opt.id}
                                onChange={() => {
                                  const updated = [...formQuestions];
                                  updated[qIndex].correctAnswer = opt.id;
                                  setFormQuestions(updated);
                                }}
                                className="w-4 h-4 text-purple-600"
                              />
                              <span className="font-bold text-xs text-slate-700 w-5">{opt.id}.</span>
                              <input
                                type="text"
                                required
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...formQuestions];
                                  if (updated[qIndex].options) {
                                    updated[qIndex].options![optIndex].text = e.target.value;
                                    setFormQuestions(updated);
                                  }
                                }}
                                placeholder={`Teks Pilihan ${opt.id}...`}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                              />
                            </div>

                            {/* Option image upload */}
                            <div className="pl-11 flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleOptionImageUpload(qIndex, optIndex, file);
                                }}
                                className="text-[11px] text-slate-400"
                              />
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt={`Gambar Opsi ${opt.id}`}
                                  className="max-h-16 rounded border"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-confirm-publish-task"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Terbitkan Tugas Sekarang
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: PENGUMUMAN SISWA (Req: Buat pengumuman untuk siswa)       */}
        {/* ================================================================ */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  Papan Pengumuman & Informasi Siswa
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Siarkan instruksi tugas, pengingat jadwal ulangan, atau materi pelajaran kepada siswa.
                  Pengumuman akan langsung memunculkan indikator merah pada lonceng notifikasi siswa
                  dan tampil di beranda mereka.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-create-announcement"
                onClick={() => setIsCreateAnnModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Buat Pengumuman Baru</span>
              </button>
            </div>

            {/* Notification feature explanation box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-indigo-900 block mb-0.5">
                  Sistem Lonceng & Indikator Merah Terintegrasi
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Setiap pengumuman yang Anda buat akan langsung memunculkan titik merah berdenyut
                  pada ikon lonceng siswa di pojok kanan atas. Ketika siswa mengeklik lonceng untuk
                  membaca pengumuman, tanda merah tersebut akan otomatis hilang.
                </p>
              </div>
            </div>

            {/* Success notification banner */}
            {annSuccessNotice && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{annSuccessNotice}</span>
              </div>
            )}

            {/* List of teacher announcements */}
            {announcements.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                  <Megaphone className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-700">
                    Belum Ada Pengumuman Aktif
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Buat pengumuman pertama Anda untuk memberikan pengarahan ke siswa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateAnnModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Buat Pengumuman Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {announcements.map((ann) => {
                  const isOwner = ann.senderId === currentUser.id || ann.senderRole === 'guru';
                  const isTeacher = ann.senderRole === 'guru';

                  return (
                    <div
                      key={ann.id}
                      className={`p-5 rounded-3xl border transition-all bg-white shadow-2xs ${
                        ann.priority === 'penting'
                          ? 'border-amber-300 ring-1 ring-amber-200/60'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wide uppercase ${
                              isTeacher
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isTeacher ? 'GURU PENGAMPU' : 'ADMIN SEKOLAH'}
                          </span>

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {ann.targetClassName
                              ? `Target: Kelas ${ann.targetClassName}`
                              : 'Target: Semua Siswa'}
                          </span>

                          {ann.priority === 'penting' && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              PRIORITAS PENTING
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Delete button */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Pengumuman Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900 mt-2.5">
                        {ann.title}
                      </h4>

                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                        {ann.content}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                        <span className="text-[11px]">
                          Pengirim: <strong className="text-slate-800">{ann.senderName}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif di Lonceng & Dashboard Siswa
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: VIEW CLASS STUDENTS & NOMOR ABSEN (Req 10) */}
      {selectedClassForStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-base text-slate-800">
                  Daftar Siswa Terdaftar: {selectedClassForStudents.name}
                </h4>
                <p className="text-xs text-purple-700 font-semibold">
                  Passkey Kelas: {selectedClassForStudents.passkey}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassForStudents(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1">
              {loadingStudents ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat daftar siswa...</div>
              ) : classStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada siswa yang bergabung ke kelas ini dengan passkey.
                </div>
              ) : (
                <div className="space-y-2">
                  {classStudents.map((std) => (
                    <div
                      key={std.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                          {std.nomorAbsen || '0'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{std.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Username: @{std.username} • Kelas: {std.kelas || '-'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedClassForStudents(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CLASS (Req 3) */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800">Buat Kelas Baru</h4>
              <button
                type="button"
                onClick={() => setIsCreateClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="contoh: X MIPA 1"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  placeholder="contoh: Biologi"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Passkey / Sandi Akses Masuk Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassPasskey}
                  onChange={(e) => setNewClassPasskey(e.target.value.toUpperCase())}
                  placeholder="contoh: BIO101"
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-300 text-xs font-mono font-bold tracking-wider uppercase bg-purple-50/40"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Siswa wajib memasukkan sandi ini untuk bergabung ke kelas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Kelas:
                </label>
                <textarea
                  rows={2}
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  placeholder="Keterangan singkat mengenai kelas..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-class"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan & Buat Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT PENGUMUMAN SISWA (Req: Buat pengumuman untuk siswa) */}
      {isCreateAnnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-800">
                    Buat Pengumuman Siswa
                  </h4>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Pengumuman akan muncul di lonceng & dashboard siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAnnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="py-4 space-y-4">
              {/* Judul */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="contoh: Jadwal Ulangan Harian Bab 2 & Bawa Alat Tulis Lengkap"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Target Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Penerima Pengumuman:
                </label>
                <select
                  value={annTargetClassId}
                  onChange={(e) => setAnnTargetClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                >
                  <option value="all">Semua Siswa (Seluruh Kelas Terdaftar)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Khusus Kelas: {cls.name} ({cls.mataPelajaran})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Pilih "Semua Siswa" atau kelas khusus yang Anda ampu.
                </span>
              </div>

              {/* Prioritas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tingkat Prioritas:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      annPriority === 'normal'
                        ? 'border-indigo-400 bg-indigo-50/60 text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="annPriority"
                      checked={annPriority === 'normal'}
                      onChange={() => setAnnPriority('normal')}
                      className="text-indigo-600"
                    />
                    <span>Informasi Normal</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      annPriority === 'penting'
                        ? 'border-rose-400 bg-rose-50/60 text-rose-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="annPriority"
                      checked={annPriority === 'penting'}
                      onChange={() => setAnnPriority('penting')}
                      className="text-rose-600"
                    />
                    <span className="text-rose-600">Penting (Ujian/Mendesak)</span>
                  </label>
                </div>
              </div>

              {/* Isi Pengumuman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Pesan Pengumuman <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Tuliskan arahan materi, catatan pengerjaan LKPD, atau ketentuan ujian secara jelas..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Highlight notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
                <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Catatan Notifikasi:</strong> Pengumuman ini akan memicu indikator merah
                  pada lonceng siswa. Indikator merah akan otomatis hilang saat siswa mengeklik lonceng.
                </span>
              </div>

              {/* Modal footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAnnModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAnn}
                  id="btn-submit-create-announcement"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingAnn ? 'Menyiarkan...' : 'Kirim Pengumuman ke Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TEACHER GRADING + MULTIMODAL AI ANALYSIS (Req 4, 15, 18, 22, 31) */}
      {activeSubmissionToGrade && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    Koreksi Guru
                  </span>
                  <span className="text-xs text-slate-500">
                    Siswa: <strong>{activeSubmissionToGrade.studentName}</strong> (Absen No.{' '}
                    {activeSubmissionToGrade.studentAbsen})
                  </span>
                </div>
                <h4 className="font-extrabold text-base text-slate-800 mt-0.5">
                  {activeSubmissionToGrade.taskTitle}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* AI Assistant Button (Req 15, 18, 31) */}
                <button
                  type="button"
                  id="btn-run-ai-analysis"
                  disabled={aiLoading}
                  onClick={() => handleRunAIAnalysis(activeSubmissionToGrade.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  title="Analisis Jawaban Teks & Lampiran Foto Siswa menggunakan Gemini AI"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiLoading ? 'Menganalisis Jawaban...' : 'Bantuan Analisis AI'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubmissionToGrade(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Cheating violations notification */}
              {activeSubmissionToGrade.totalCheatingCount > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>
                      Peringatan Kecurangan Terdeteksi: {activeSubmissionToGrade.totalCheatingCount}x
                      Keluar Layar
                    </span>
                  </div>
                  {activeSubmissionToGrade.cheatingIncidents?.map((inc, i) => (
                    <p key={i} className="text-rose-700 text-[11px]">
                      • Insiden #{i + 1}: Keluar layar saat Soal No. {inc.questionNumber} selama{' '}
                      {inc.durationSeconds} detik.
                    </p>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Siswa ini mengerjakan dengan integritas bersih (0 kali keluar layar).</span>
                </div>
              )}

              {/* AI Analysis Result Overview Box (Saran nilai & analisa kesesuaian soal vs jawaban, KHUSUS GURU) */}
              {aiAnalysisResult && (
                <div className="p-5 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50 border-2 border-indigo-200 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-indigo-950 text-sm">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <span>Hasil Analisis Kesesuaian Gemini AI (Khusus Tampilan Guru)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-800 bg-white px-3 py-1 rounded-full border border-indigo-300 shadow-2xs">
                        Rekomendasi Skor: {aiAnalysisResult.recommendedFinalScore ?? aiAnalysisResult.suggestedScore ?? 85} / 100
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const sc = aiAnalysisResult.recommendedFinalScore ?? aiAnalysisResult.suggestedScore ?? 85;
                          const fb = aiAnalysisResult.overallSummary ?? aiAnalysisResult.overallFeedback ?? '';
                          setGradeInput(sc);
                          if (fb) setFeedbackInput(fb);
                        }}
                        className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-2xs cursor-pointer"
                        title="Terapkan rekomendasi skor dan catatan ringkas AI ke form penilaian guru"
                      >
                        Terapkan ke Form Nilai
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-950 leading-relaxed font-medium bg-white/70 p-3 rounded-2xl border border-indigo-100">
                    {aiAnalysisResult.overallSummary || aiAnalysisResult.overallFeedback}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Strengths */}
                    <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200 space-y-1.5">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Hal yang Sangat Sesuai / Kekuatan Siswa:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                        {aiAnalysisResult.strengths?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses / Mistakes */}
                    <div className="p-3.5 bg-white/90 rounded-2xl border border-rose-200 space-y-1.5">
                      <span className="font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        Aspek yang Kurang Sesuai / Perlu Ditingkatkan:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                        {aiAnalysisResult.weaknesses?.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Comprehensive Question-by-Question Congruence Inspection (Soal vs Tulisan & Foto Siswa) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Analisis Kesesuaian Per Butir Soal vs Jawaban (Foto & Tulisan):
                  </h5>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Evaluasi multimodal AI mengaitkan soal dengan respon siswa
                  </span>
                </div>

                {(() => {
                  const activeTask = tasks.find((t) => t.id === activeSubmissionToGrade.taskId);
                  const questionsList = activeTask?.questions || [];

                  // If task not found directly in loaded state, build list from submission answers and AI evaluations
                  const displayItems =
                    questionsList.length > 0
                      ? questionsList.map((q) => {
                          const ans = activeSubmissionToGrade.answers[q.id];
                          const aiEval = aiAnalysisResult?.questionEvaluations?.find(
                            (ev) => ev.questionNumber === q.questionNumber
                          );
                          return { question: q, answer: ans, aiEval };
                        })
                      : Object.entries(activeSubmissionToGrade.answers || {}).map(([qId, rawAns], idx) => {
                          const ans = rawAns as StudentAnswer;
                          const qNum = idx + 1;
                          const aiEval = aiAnalysisResult?.questionEvaluations?.find(
                            (ev) => ev.questionNumber === qNum
                          );
                          return {
                            question: {
                              id: qId,
                              questionNumber: qNum,
                              type: aiEval?.questionType || 'essay',
                              prompt: aiEval?.questionPrompt || `Pertanyaan Soal No. ${qNum}`,
                              points: aiEval?.maxPoints || 20,
                            } as any,
                            answer: ans,
                            aiEval,
                          };
                        });

                  return (
                    <div className="space-y-5">
                      {displayItems.map(({ question: q, answer: ans, aiEval }) => {
                        const hasPhoto = Boolean(ans?.photoUrl);
                        const hasEssay = Boolean(ans?.essayText && ans.essayText.trim().length > 0);

                        return (
                          <div
                            key={q.id || q.questionNumber}
                            className="p-5 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-2xs transition-all hover:border-purple-200"
                          >
                            {/* Question Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center text-xs">
                                  {q.questionNumber}
                                </span>
                                <span className="font-bold text-slate-800">
                                  Soal No. {q.questionNumber}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                  {q.type}
                                </span>
                              </div>
                              <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md text-[11px]">
                                Bobot Maks: {q.points} Poin
                              </span>
                            </div>

                            {/* Section 1: Pertanyaan Soal dari Guru */}
                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                              <span className="font-bold text-slate-600 block text-[11px] uppercase tracking-wide">
                                Pertanyaan Soal:
                              </span>
                              <p className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line">
                                {q.prompt}
                              </p>
                              {q.rubricNotes && (
                                <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-purple-900 font-medium">
                                  <span className="font-bold">Rubrik / Kunci Guru:</span> {q.rubricNotes}
                                </div>
                              )}
                              {q.type === 'multiple_choice' && q.correctAnswer && (
                                <div className="mt-1 text-[11px] text-emerald-800 font-bold">
                                  Kunci Jawaban Resmi: Opsi {q.correctAnswer}
                                </div>
                              )}
                            </div>

                            {/* Section 2: Respon / Jawaban Siswa */}
                            <div className="space-y-3">
                              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                                Jawaban Siswa:
                              </span>

                              {/* Pilihan Ganda */}
                              {ans?.selectedOption && (
                                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-medium">Opsi Pilihan Siswa:</span>
                                  <span
                                    className={`px-3 py-1 rounded-lg font-black ${
                                      q.correctAnswer && ans.selectedOption === q.correctAnswer
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    Opsi {ans.selectedOption}
                                    {q.correctAnswer && (
                                      <span className="ml-2 text-[10px] font-bold">
                                        {ans.selectedOption === q.correctAnswer
                                          ? '(✓ Cocok dengan Kunci)'
                                          : '(✗ Berbeda dari Kunci)'}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {/* Jawaban Teks / Esai Siswa */}
                              {hasEssay ? (
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                                  <span className="font-bold text-slate-600 block text-[11px]">
                                    Uraian Tulisan Siswa:
                                  </span>
                                  <p className="text-slate-900 font-medium whitespace-pre-line leading-relaxed">
                                    {ans?.essayText}
                                  </p>
                                </div>
                              ) : (
                                !ans?.selectedOption &&
                                !hasPhoto && (
                                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl text-xs">
                                    Siswa tidak memberikan jawaban teks untuk nomor ini.
                                  </div>
                                )
                              )}

                              {/* Jawaban Foto Lembar Kerja Siswa */}
                              {hasPhoto && (
                                <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                                      Foto Lembar Jawaban Siswa (Hasil Jepretan / Upload):
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhotoUrl(ans?.photoUrl || null)}
                                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Maximize2 className="w-3 h-3" />
                                      Perbesar Foto Penuh
                                    </button>
                                  </div>
                                  <div className="relative group rounded-xl overflow-hidden border border-indigo-200 bg-black/5 max-w-sm">
                                    <img
                                      src={ans?.photoUrl}
                                      alt={`Foto Lembar Jawaban Soal No ${q.questionNumber}`}
                                      onClick={() => setPreviewPhotoUrl(ans?.photoUrl || null)}
                                      className="w-full max-h-60 object-contain cursor-zoom-in"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Section 3: Analisis Kesesuaian Gemini AI (Soal vs Jawaban Baik Foto Maupun Tulisan) */}
                            {aiEval && (
                              <div className="p-4 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 rounded-2xl border border-indigo-200 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Analisis Kesesuaian AI (Soal vs Jawaban):</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Congruence Level Badge */}
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                        aiEval.congruenceLevel === 'Sangat Sesuai'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : aiEval.congruenceLevel === 'Cukup Sesuai'
                                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                                          : aiEval.congruenceLevel === 'Kurang Sesuai'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : 'bg-rose-100 text-rose-800 border-rose-300'
                                      }`}
                                    >
                                      Kesesuaian: {aiEval.congruenceLevel}
                                    </span>
                                    <span className="text-xs font-black text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                                      Saran: {aiEval.pointsSuggested} / {q.points} Poin
                                    </span>
                                  </div>
                                </div>

                                {/* Text analysis detail */}
                                {aiEval.textAnalysis && (
                                  <div className="text-xs text-slate-800 bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                                    <span className="font-bold text-indigo-900 block text-[11px] mb-0.5">
                                      Analisis Kesesuaian Tulisan terhadap Soal:
                                    </span>
                                    <p className="leading-relaxed text-[11.5px]">{aiEval.textAnalysis}</p>
                                  </div>
                                )}

                                {/* Photo observations & congruence */}
                                {(aiEval.photoObservations || aiEval.photoCongruence) && (
                                  <div className="text-xs text-slate-800 bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                                    <span className="font-bold text-indigo-900 block text-[11px] mb-0.5 flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3 text-indigo-600" />
                                      Observasi & Kesesuaian Foto Lembar Jawaban:
                                    </span>
                                    {aiEval.photoObservations && (
                                      <p className="leading-relaxed text-[11.5px]">
                                        {aiEval.photoObservations}
                                      </p>
                                    )}
                                    {aiEval.photoCongruence && (
                                      <p className="mt-1 text-[11px] text-indigo-700 font-semibold">
                                        Relevansi Citra: {aiEval.photoCongruence}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Evaluation reasoning */}
                                {aiEval.reasoning && (
                                  <div className="text-[11px] text-slate-600 italic bg-purple-100/40 p-2 rounded-xl">
                                    <span className="font-bold not-italic text-purple-950">
                                      Pertimbangan Guru:
                                    </span>{' '}
                                    {aiEval.reasoning}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Teacher Decision Form (Req 18: Guru menentukan nilai akhir & feedback keseluruhan) */}
              <div className="p-5 bg-purple-50/70 border-2 border-purple-200 rounded-3xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Penetapan Nilai Akhir & Catatan Guru (Untuk Siswa)
                  </h5>
                  <span className="text-[11px] font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                    Otoritas Penuh di Tangan Guru
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nilai Akhir (0 - 100):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradeInput}
                      onChange={(e) => setGradeInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 text-base font-black text-purple-900 bg-white shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Feedback / Masukan Keseluruhan untuk Siswa:
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Berikan masukan motivasi atau koreksi agar siswa memahami kekurangannya..."
                      className="w-full p-2.5 rounded-xl border border-purple-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSubmissionToGrade(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-save-teacher-grade"
                onClick={handleSubmitTeacherGrade}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Simpan Penilaian & Kirim Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col items-center justify-center shadow-2xl relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Pratinjau Foto Lembar Jawaban Siswa
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="py-2 overflow-auto max-h-[75vh]">
              <img
                src={previewPhotoUrl}
                alt="Pratinjau Foto Lembar Siswa Penuh"
                className="max-h-[72vh] object-contain rounded-xl"
              />
            </div>
            <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Resolusi penuh tangkapan kamera siswa</span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
