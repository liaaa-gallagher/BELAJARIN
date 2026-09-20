import React, { useState, useEffect } from 'react';
import {
  User,
  LearningTask,
  TaskSubmission,
  ClassRoom,
  TaskType,
  SystemAnnouncement,
} from '../../types.js';
import { api } from '../../services/api.js';
import { StudentTaskPlayer } from './StudentTaskPlayer.js';
import { exportSubmissionToPdf } from '../pdf/exportPdf.js';
import {
  LayoutDashboard,
  BookOpen,
  CheckCircle2,
  Lock,
  Download,
  Clock,
  KeyRound,
  FileCheck,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Eye,
  Award,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Megaphone,
  Bell,
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
  announcements?: SystemAnnouncement[];
}

type StudentTab = 'overview' | 'tasks' | 'progress' | 'classes';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  announcements: initialAnnouncements = [],
}) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(initialAnnouncements);
  const [readAnnounceIds, setReadAnnounceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('belajarin_read_announcements_' + currentUser.id);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync announcements from props or load fresh
  useEffect(() => {
    if (initialAnnouncements && initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
    } else {
      api
        .getAnnouncements()
        .then((data) => {
          const relevant = data.filter(
            (a) => a.targetRole === 'all' || a.targetRole === 'siswa'
          );
          setAnnouncements(relevant);
        })
        .catch(console.error);
    }
  }, [initialAnnouncements]);

  // Listen to bell open / mark-as-read events from Navbar
  useEffect(() => {
    const handleReadEvent = (e: any) => {
      if (e.detail?.readIds) {
        setReadAnnounceIds(e.detail.readIds);
      } else {
        try {
          const saved = localStorage.getItem('belajarin_read_announcements_' + currentUser.id);
          if (saved) setReadAnnounceIds(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener('belajarin_announcements_read', handleReadEvent);
    return () => window.removeEventListener('belajarin_announcements_read', handleReadEvent);
  }, [currentUser.id]);

  // Active task player state
  const [selectedTaskForExam, setSelectedTaskForExam] = useState<LearningTask | null>(null);

  // Recap Modal state (Req 29 & 30: Read-only review of submitted work with questions, answers, photos, scores)
  const [recapSubmission, setRecapSubmission] = useState<TaskSubmission | null>(null);
  const [recapTask, setRecapTask] = useState<LearningTask | null>(null);

  // Join Class state
  const [joinPasskey, setJoinPasskey] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter for tasks tab
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | TaskType>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsData, taskData, subData] = await Promise.all([
        api.getClasses({ studentId: currentUser.id }),
        api.getTasks({ role: 'siswa', studentId: currentUser.id }),
        api.getSubmissions({ studentId: currentUser.id }),
      ]);
      setClasses(clsData);
      setTasks(taskData);
      setSubmissions(subData);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  // Handle Join Class
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPasskey.trim()) return;

    setJoinLoading(true);
    setJoinMessage(null);
    try {
      const res = await api.joinClass(joinPasskey.trim(), currentUser.id);
      setJoinMessage({ type: 'success', text: res.message });
      setJoinPasskey('');
      loadData();
    } catch (err: any) {
      setJoinMessage({ type: 'error', text: err.message || 'Gagal bergabung ke kelas' });
    } finally {
      setJoinLoading(false);
    }
  };

  // ----------------------------------------------------
  // Sequential Access Locking Logic (Req 13 & 24):
  // LKPD -> Bank Soal -> Evaluasi per Bab
  // Once Evaluasi is completed for that Bab, unlock everything for that Bab!
  // ----------------------------------------------------
  const getTaskLockStatus = (task: LearningTask): { isLocked: boolean; reason?: string } => {
    // Check if task is already submitted
    const isSubmitted = submissions.some((s) => s.taskId === task.id);
    if (isSubmitted) {
      return { isLocked: false }; // Already done, can view recap
    }

    // Find all tasks in the same class & topicBab
    const babTasks = tasks.filter(
      (t) => t.classId === task.classId && t.topicBab === task.topicBab
    );

    // Check if Evaluasi for this bab has already been submitted by this student
    const evalTask = babTasks.find((t) => t.type === 'evaluasi');
    const isEvalCompleted = evalTask
      ? submissions.some((s) => s.taskId === evalTask.id)
      : false;

    // If evaluasi has been reached/completed, lock is lifted! (Req 24)
    if (isEvalCompleted) {
      return { isLocked: false };
    }

    // Rule: LKPD is first (unlocked by default)
    if (task.type === 'lkpd') {
      return { isLocked: false };
    }

    // Rule: Bank Soal requires LKPD in same bab to be submitted first
    if (task.type === 'bank_soal') {
      const lkpdTask = babTasks.find((t) => t.type === 'lkpd');
      if (lkpdTask) {
        const lkpdDone = submissions.some((s) => s.taskId === lkpdTask.id);
        if (!lkpdDone) {
          return {
            isLocked: true,
            reason: `Selesaikan ${lkpdTask.title} (LKPD) terlebih dahulu sebelum membuka Bank Soal ini.`,
          };
        }
      }
      return { isLocked: false };
    }

    // Rule: Evaluasi requires Bank Soal in same bab to be submitted first
    if (task.type === 'evaluasi') {
      const bankTask = babTasks.find((t) => t.type === 'bank_soal');
      if (bankTask) {
        const bankDone = submissions.some((s) => s.taskId === bankTask.id);
        if (!bankDone) {
          return {
            isLocked: true,
            reason: `Selesaikan ${bankTask.title} (Bank Soal) terlebih dahulu sebelum mengikuti Evaluasi (UH).`,
          };
        }
      }
      return { isLocked: false };
    }

    return { isLocked: false };
  };

  // Progress Calculations (Req 12)
  const totalTasksCount = tasks.length;
  const submittedTasksCount = tasks.filter((t) =>
    submissions.some((s) => s.taskId === t.id)
  ).length;
  const pendingTasksCount = Math.max(0, totalTasksCount - submittedTasksCount);
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((submittedTasksCount / totalTasksCount) * 100) : 0;

  // Open Recap Modal (Req 29 & 30)
  const handleOpenRecap = (submission: TaskSubmission) => {
    const originalTask = tasks.find((t) => t.id === submission.taskId);
    setRecapSubmission(submission);
    setRecapTask(originalTask || null);
  };

  // If in active exam mode, show task player
  if (selectedTaskForExam) {
    return (
      <StudentTaskPlayer
        task={selectedTaskForExam}
        currentUser={currentUser}
        onBack={() => {
          setSelectedTaskForExam(null);
          loadData();
        }}
        onSubmitSuccess={() => {
          setSelectedTaskForExam(null);
          loadData();
          setActiveTab('progress');
        }}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex">
      {/* SIDEBAR NAVIGATION (Requirement 23: menu berada pada sisi samping tampilan halaman) */}
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-6">
          {/* User Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-800 truncate">
                  {currentUser.name}
                </h4>
                <p className="text-[11px] text-blue-600 font-medium">
                  {currentUser.kelas || 'Siswa'} • Absen {currentUser.nomorAbsen || '-'}
                </p>
              </div>
            </div>

            {/* Mini Progress Ring */}
            <div className="mt-3 pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Penyelesaian:</span>
              <span className="font-bold text-blue-700">{completionPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            <button
              type="button"
              id="sidebar-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Beranda & Progres</span>
            </button>

            <button
              type="button"
              id="sidebar-tab-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                <span>Materi & Tugas</span>
              </div>
              {pendingTasksCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    activeTab === 'tasks' ? 'bg-white text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              type="button"
              id="sidebar-tab-progress"
              onClick={() => setActiveTab('progress')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Progres Diri & Rekap</span>
            </button>

            <button
              type="button"
              id="sidebar-tab-classes"
              onClick={() => setActiveTab('classes')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Gabung Kelas Baru</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500">
          <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            Keamanan 1 Gawai
          </div>
          Akun Anda aktif secara eksklusif pada gawai ini.
        </div>
      </aside>

      {/* Mobile Top Navigation Pills */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 p-2 flex overflow-x-auto gap-1 fixed top-16 z-20 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Beranda
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Tugas ({pendingTasksCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            activeTab === 'progress' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Progres Diri
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            activeTab === 'classes' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Gabung Kelas
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full md:mt-0 mt-12">
        {/* TAB 1: OVERVIEW & PROGRES (Req 2 & 12) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-600/15 relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold tracking-wide uppercase">
                  Portal Siswa Belajarin
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 leading-tight">
                  Halo, {currentUser.name}! 👋
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Mari lanjutkan pembelajaran Anda secara runtut: selesaikan LKPD, lanjutkan ke Bank
                  Soal, lalu ikuti Evaluasi Ujian Harian.
                </p>
              </div>
            </div>

            {/* Metric Cards Grid (Req 12: Hal belum dikerjakan & persentase) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Persentase Selesai */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Persentase Selesai
                  </span>
                  <div className="text-3xl font-black text-blue-600 mt-1">
                    {completionPercentage}%
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {submittedTasksCount} dari {totalTasksCount} tugas selesai
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Hal yang Belum Dikerjakan */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Belum Dikerjakan
                  </span>
                  <div className="text-3xl font-black text-rose-600 mt-1">
                    {pendingTasksCount}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Tugas & ujian aktif
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Kelas Terdaftar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kelas Diikuti
                  </span>
                  <div className="text-3xl font-black text-purple-600 mt-1">
                    {classes.length}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Mata pelajaran aktif
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Announcement Section on Student Dashboard (Req: muncul didashboard siswa & lonceng) */}
            {(() => {
              const studentAnnouncements = announcements.filter((ann) => {
                if (ann.targetRole && ann.targetRole !== 'all' && ann.targetRole !== 'siswa') {
                  return false;
                }
                if (ann.targetClassId) {
                  const enrolled = classes.some((c) => c.id === ann.targetClassId);
                  const classMatch =
                    currentUser.kelas &&
                    ann.targetClassName &&
                    currentUser.kelas.toLowerCase().includes(ann.targetClassName.toLowerCase());
                  return enrolled || classMatch;
                }
                return true;
              });

              const unreadDashboardAnnouncements = studentAnnouncements.filter(
                (a) => !readAnnounceIds.includes(a.id)
              );

              const handleMarkDashboardAnnouncementRead = (id: string) => {
                const updated = Array.from(new Set([...readAnnounceIds, id]));
                setReadAnnounceIds(updated);
                try {
                  localStorage.setItem(
                    'belajarin_read_announcements_' + currentUser.id,
                    JSON.stringify(updated)
                  );
                } catch {}
                window.dispatchEvent(
                  new CustomEvent('belajarin_announcements_read', { detail: { readIds: updated } })
                );
              };

              const handleMarkAllDashboardRead = () => {
                const allIds = studentAnnouncements.map((a) => a.id);
                const updated = Array.from(new Set([...readAnnounceIds, ...allIds]));
                setReadAnnounceIds(updated);
                try {
                  localStorage.setItem(
                    'belajarin_read_announcements_' + currentUser.id,
                    JSON.stringify(updated)
                  );
                } catch {}
                window.dispatchEvent(
                  new CustomEvent('belajarin_announcements_read', { detail: { readIds: updated } })
                );
              };

              return (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          Pengumuman & Arahan Guru
                          {unreadDashboardAnnouncements.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                              {unreadDashboardAnnouncements.length} Baru
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Informasi jadwal ujian, modul materi, dan arahan tugas dari guru pengampu
                        </p>
                      </div>
                    </div>

                    {unreadDashboardAnnouncements.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllDashboardRead}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tandai Semua Dibaca</span>
                      </button>
                    )}
                  </div>

                  {studentAnnouncements.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                      <Bell className="w-7 h-7 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Belum Ada Pengumuman</p>
                      <p className="text-[11px] text-slate-400">
                        Pengumuman resmi dari guru atau pihak sekolah akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {studentAnnouncements.map((ann) => {
                        const isUnread = !readAnnounceIds.includes(ann.id);
                        const isTeacher = ann.senderRole === 'guru';

                        return (
                          <div
                            key={ann.id}
                            onClick={() => {
                              if (isUnread) handleMarkDashboardAnnouncementRead(ann.id);
                            }}
                            className={`p-4 rounded-2xl border transition-all relative cursor-pointer ${
                              isUnread
                                ? 'border-indigo-300 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-200/50'
                                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            {isUnread && (
                              <span className="absolute top-3.5 right-3.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 mb-2 flex-wrap pr-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  isTeacher
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {isTeacher ? 'GURU PENGAMPU' : 'SEKOLAH'}
                              </span>

                              {ann.targetClassName && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  Kelas: {ann.targetClassName}
                                </span>
                              )}

                              {ann.priority === 'penting' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  PENTING
                                </span>
                              )}

                              <span className="text-[11px] text-slate-400 ml-auto">
                                {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-sm text-slate-800 leading-snug">
                              {ann.title}
                            </h4>

                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                              {ann.content}
                            </p>

                            <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">
                                Pengirim: {ann.senderName}
                              </span>
                              {isUnread ? (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Belum Dibaca
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dibaca
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pending Tasks Quick List (Req 12) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  Daftar Tugas Menunggu Dikerjakan ({pendingTasksCount})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  Lihat Semua
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {tasks.filter((t) => !submissions.some((s) => s.taskId === t.id)).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  🎉 Luar biasa! Semua tugas dan evaluasi telah Anda selesaikan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks
                    .filter((t) => !submissions.some((s) => s.taskId === t.id))
                    .slice(0, 4)
                    .map((task) => {
                      const lockStatus = getTaskLockStatus(task);
                      const isExpired = new Date().getTime() > new Date(task.deadline).getTime();

                      return (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-blue-300 transition-all flex items-center justify-between gap-3 bg-slate-50/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                {task.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {task.className} • {task.topicBab}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 truncate">
                              {task.title}
                            </h4>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>
                                Tenggat: {new Date(task.deadline).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div>
                            {lockStatus.isLocked ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                                <Lock className="w-3.5 h-3.5" />
                                Terkunci
                              </span>
                            ) : isExpired ? (
                              <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-semibold">
                                Lewat Tenggat
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedTaskForExam(task)}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                Kerjakan
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MATERI & TUGAS (LKPD, BANK SOAL, EVALUASI) (Req 2, 13, 24) */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Materi Pembelajaran & Tugas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ikuti alur pengerjaan secara runtut (LKPD → Bank Soal → Evaluasi UH).
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="lkpd">LKPD Sahaja</option>
                  <option value="bank_soal">Bank Soal (Latihan)</option>
                  <option value="evaluasi">Evaluasi (UH)</option>
                </select>
              </div>
            </div>

            {/* Task list grouped or filtered */}
            {tasks.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Belum ada tugas di kelas Anda</p>
                <p className="text-xs text-slate-400 mt-1">
                  Guru Anda belum menerbitkan materi atau tugas untuk saat ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks
                  .filter((t) => selectedTypeFilter === 'all' || t.type === selectedTypeFilter)
                  .map((task) => {
                    const submission = submissions.find((s) => s.taskId === task.id);
                    const isSubmitted = Boolean(submission);
                    const lockStatus = getTaskLockStatus(task);
                    const isExpired =
                      new Date().getTime() > new Date(task.deadline).getTime() && !isSubmitted;

                    return (
                      <div
                        key={task.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isSubmitted
                            ? 'bg-white border-emerald-200/90 shadow-xs'
                            : lockStatus.isLocked
                              ? 'bg-slate-50/80 border-slate-200 opacity-80'
                              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                  task.type === 'lkpd'
                                    ? 'bg-blue-100 text-blue-700'
                                    : task.type === 'bank_soal'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {task.type === 'lkpd'
                                  ? 'LKPD'
                                  : task.type === 'bank_soal'
                                    ? 'Bank Soal'
                                    : 'Evaluasi UH'}
                              </span>

                              <span className="text-xs font-semibold text-slate-500">
                                {task.className}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-400 font-medium">
                                {task.topicBab}
                              </span>
                            </div>

                            <h3 className="font-bold text-base text-slate-900 leading-snug">
                              {task.title}
                            </h3>

                            {task.description && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Tenggat: {new Date(task.deadline).toLocaleString('id-ID')}
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <Award className="w-3.5 h-3.5 text-slate-400" />
                                {task.questions?.length || 0} Soal • {task.totalPoints} Poin
                              </span>
                            </div>
                          </div>

                          {/* Action Button on the right */}
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {isSubmitted ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Sudah Dikerjakan
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecap(submission!)}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Lihat Rekap
                                </button>
                              </div>
                            ) : lockStatus.isLocked ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold">
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  Terkunci
                                </span>
                                <p className="text-[11px] text-amber-600 mt-1 max-w-xs font-medium">
                                  {lockStatus.reason}
                                </p>
                              </div>
                            ) : isExpired ? (
                              <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                                Tenggat Berakhir
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedTaskForExam(task)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-98"
                              >
                                Kerjakan Sekarang
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROGRES DIRI & REKAP (Req 2, 7, 25, 29, 30) */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Progres Diri & Lembar Jawaban</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Buka kembali lembar pekerjaan Anda, unduh hasil dalam PDF, dan periksa umpan balik
                guru.
              </p>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                <FileCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Belum ada tugas yang dikumpulkan</p>
                <p className="text-xs text-slate-400 mt-1">
                  Kerjakan LKPD, Bank Soal, atau Evaluasi untuk memantau progres diri Anda di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((sub) => {
                  const task = tasks.find((t) => t.id === sub.taskId);

                  return (
                    <div
                      key={sub.id}
                      className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {sub.taskType.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(sub.submittedAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 leading-snug">
                          {sub.taskTitle}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sub.topicBab}</p>

                        {/* Status & Scores */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[11px] block">Status Koreksi:</span>
                            <span
                              className={`font-bold ${
                                sub.status === 'graded' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {sub.status === 'graded' ? 'Sudah Diperiksa Guru' : 'Menunggu Koreksi'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-400 text-[11px] block">Nilai:</span>
                            <span className="text-base font-black text-indigo-700">
                              {sub.finalScore !== undefined ? sub.finalScore : '-'}
                              <span className="text-xs text-slate-400 font-normal"> / 100</span>
                            </span>
                          </div>
                        </div>

                        {/* Cheating Log summary if any */}
                        {sub.totalCheatingCount > 0 && (
                          <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Terdeteksi {sub.totalCheatingCount}x pindah layar saat ujian</span>
                          </div>
                        )}

                        {/* Teacher Feedback snippet if available */}
                        {sub.teacherFeedback && (
                          <div className="mt-2.5 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-slate-700">
                            <span className="font-bold text-indigo-900 block text-[11px]">
                              Catatan Guru:
                            </span>
                            <p className="italic text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                              &ldquo;{sub.teacherFeedback}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons (Req 7, 25: Download single-item PDF only & View Recap) */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenRecap(sub)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Buka Lembar Rekap
                        </button>

                        <button
                          type="button"
                          onClick={() => exportSubmissionToPdf(sub, task)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          title="Unduh Lembar Ini dalam Format PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GABUNG KELAS BARU (Req 3) */}
        {activeTab === 'classes' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gabung Kelas Mata Pelajaran</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan passkey atau sandi yang diberikan oleh guru pengampu kelas Anda.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <form onSubmit={handleJoinClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Passkey / Sandi Kelas:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={joinPasskey}
                      onChange={(e) => setJoinPasskey(e.target.value.toUpperCase())}
                      placeholder="contoh: BIO101"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold tracking-wider uppercase focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {joinMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      joinMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {joinMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{joinMessage.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={joinLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {joinLoading ? 'Memeriksa Passkey...' : 'Gabung ke Kelas Sekarang'}
                </button>
              </form>
            </div>

            {/* List of enrolled classes */}
            <div className="mt-8">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Kelas yang Sedang Anda Ikuti ({classes.length})
              </h3>
              <div className="space-y-2.5">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{c.name}</h4>
                      <p className="text-xs text-slate-500">
                        {c.subject} • Pengampu: {c.teacherName}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                      Terdaftar
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RECAP MODAL (Req 29 & 30: Read-only submitted work with answers, photos, feedback - CANNOT BE EDITED) */}
        {recapSubmission && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      Rekap Pengerjaan (Read-Only)
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(recapSubmission.submittedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-800 mt-1">
                    {recapSubmission.taskTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportSubmissionToPdf(recapSubmission, recapTask || undefined)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Unduh PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecapSubmission(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Score & Integrity Alert Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider block">
                      Hasil Penilaian Guru:
                    </span>
                    <div className="text-2xl font-black text-indigo-900 mt-0.5">
                      {recapSubmission.finalScore !== undefined
                        ? `${recapSubmission.finalScore} / 100`
                        : 'Menunggu Nilai'}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 block">
                      Integritas Layar Ujian:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        recapSubmission.totalCheatingCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {recapSubmission.totalCheatingCount > 0
                        ? `⚠️ ${recapSubmission.totalCheatingCount}x Keluar Layar`
                        : '✓ Integritas Sempurna (0 Pelanggaran)'}
                    </span>
                  </div>
                </div>

                {/* Teacher Feedback Card */}
                {recapSubmission.teacherFeedback && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">
                      Catatan & Umpan Balik Guru ({recapSubmission.gradedBy || 'Guru Pengampu'}):
                    </span>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {recapSubmission.teacherFeedback}
                    </p>
                  </div>
                )}

                {/* Cheating Incidents Breakdown (Req 32) */}
                {(recapSubmission.cheatingIncidents?.length || 0) > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                      <span className="font-bold text-rose-800 block">
                        Rincian Waktu Pelanggaran Pindah Layar:
                      </span>
                      {recapSubmission.cheatingIncidents.map((inc, i) => (
                        <p key={i} className="text-rose-700">
                          • Insiden #{i + 1}: Terdeteksi pada Soal No. {inc.questionNumber} selama{' '}
                          {inc.durationSeconds} detik.
                        </p>
                      ))}
                    </div>
                  )}

                {/* Question & Answer Details (Read-only, answers cannot be edited!) */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-800 border-b pb-2">
                    Daftar Soal & Jawaban yang Telah Dikirimkan:
                  </h4>

                  {recapTask?.questions.map((q) => {
                    const ans = recapSubmission.answers?.[q.id];

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-slate-800">
                            Soal No. {q.questionNumber} ({q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Esai'})
                          </span>
                          <span>{q.points} Poin</span>
                        </div>

                        <p className="text-sm font-medium text-slate-800">{q.prompt}</p>

                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt="Soal"
                            className="max-h-48 rounded-xl object-contain border border-slate-200"
                          />
                        )}

                        {/* Student Choice / Text */}
                        <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                          <div className="font-semibold text-slate-700">
                            Jawaban Anda:{' '}
                            <span className="font-bold text-indigo-700">
                              {q.type === 'multiple_choice'
                                ? ans?.selectedOption || '(Tidak Dijawab)'
                                : ans?.essayText || '(Tidak Ada Teks Jawaban)'}
                            </span>
                          </div>
                        </div>

                        {/* Embedded Student Answer Photo if attached (Req 30 & 31) */}
                        {ans?.photoUrl && (
                          <div className="mt-2 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-700 block mb-2">
                              Foto Jawaban yang Anda Unggah:
                            </span>
                            <img
                              src={ans.photoUrl}
                              alt={`Foto Jawaban No ${q.questionNumber}`}
                              className="max-h-60 rounded-lg object-contain border border-indigo-200"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setRecapSubmission(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup Lembar Rekap
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
