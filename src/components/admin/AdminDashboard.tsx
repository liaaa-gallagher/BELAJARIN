import React, { useState, useEffect } from 'react';
import {
  User,
  ClassRoom,
  LearningTask,
  TaskSubmission,
  AuditLog,
  SystemAnnouncement,
  UserRole,
  UserPermissions,
  DatabaseStats,
} from '../../types.js';
import { api } from '../../services/api.js';
import {
  Shield,
  Users,
  BookOpen,
  Smartphone,
  Trash2,
  KeyRound,
  Bell,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Activity,
  UserPlus,
  Edit3,
  Sliders,
  Check,
  X,
  UserCheck,
  Lock,
  GraduationCap,
  Sparkles,
  Layers,
  Copy,
  FolderPlus,
  Eye,
  Database,
  Cloud,
  Download,
  Upload,
  HardDrive,
  Server,
  FileCheck,
  Megaphone,
  FileQuestion,
  ShieldCheck,
} from 'lucide-react';
import { AdminManagedTeachersTab } from './AdminManagedTeachersTab.js';
import { AdminBantuPengumumanModal } from './AdminBantuPengumumanModal.js';
import { AdminBantuSoalModal } from './AdminBantuSoalModal.js';
import { AdminSimulasiJoinModal } from './AdminSimulasiJoinModal.js';

interface AdminDashboardProps {
  currentUser: User;
}

type AdminTab =
  | 'a1_users'
  | 'a2_classes'
  | 'a3_access'
  | 'managed_teachers'
  | 'database'
  | 'announcements'
  | 'audit_logs';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('a1_users');
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Managed Teachers State (Max 5 constraint)
  const [managedTeacherIds, setManagedTeacherIds] = useState<string[]>([]);
  const [managedTeachers, setManagedTeachers] = useState<User[]>([]);
  const [loadingManagedTeachers, setLoadingManagedTeachers] = useState(false);

  // Assistance Modals
  const [isBantuAnnounceModalOpen, setIsBantuAnnounceModalOpen] = useState(false);
  const [bantuInitialTeacherId, setBantuInitialTeacherId] = useState<string | undefined>(undefined);

  const [isBantuSoalModalOpen, setIsBantuSoalModalOpen] = useState(false);
  const [bantuSoalInitialTeacherId, setBantuSoalInitialTeacherId] = useState<string | undefined>(undefined);

  // Class Join Simulation / Execution Modal
  const [simulasiClass, setSimulasiClass] = useState<ClassRoom | null>(null);
  const [isSimulasiJoinOpen, setIsSimulasiJoinOpen] = useState(false);

  // Database & Cloud Persistence State
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loadingDbStats, setLoadingDbStats] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbOperationMessage, setDbOperationMessage] = useState<string | null>(null);

  // Search & Filters for Users (A1)
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'suspended'>('all');

  // Search & Filters for Classes (A2)
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // Modals States
  // ---------------------------------------------------------------------------
  // Modal: Create User (A1)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123456');
  const [newUserRole, setNewUserRole] = useState<UserRole>('siswa');
  const [newUserClass, setNewUserClass] = useState('X MIPA 1');
  const [newUserAbsen, setNewUserAbsen] = useState('1');
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserMapel, setNewUserMapel] = useState('');
  const [newUserError, setNewUserError] = useState<string | null>(null);

  // Modal: Edit User (A1)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAbsen, setEditAbsen] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editMapel, setEditMapel] = useState('');

  // Modal: Reset Password (A1)
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Modal: Create Class (A2)
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Kelas 10');
  const [newClassTeacherId, setNewClassTeacherId] = useState('');
  const [newClassPasskey, setNewClassPasskey] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [createClassError, setCreateClassError] = useState<string | null>(null);

  // Modal: Edit Class (A2)
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassSubject, setEditClassSubject] = useState('');
  const [editClassGrade, setEditClassGrade] = useState('');
  const [editClassTeacherId, setEditClassTeacherId] = useState('');
  const [editClassPasskey, setEditClassPasskey] = useState('');
  const [editClassDescription, setEditClassDescription] = useState('');

  // Modal: Manage Class Enrolled Students (A2)
  const [activeClassForStudents, setActiveClassForStudents] = useState<ClassRoom | null>(null);
  const [classEnrolledStudents, setClassEnrolledStudents] = useState<User[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');

  // Tab A3: Access Control State
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [permRole, setPermRole] = useState<UserRole>('siswa');
  const [permCanCreateTasks, setPermCanCreateTasks] = useState(false);
  const [permCanGradeSubmissions, setPermCanGradeSubmissions] = useState(false);
  const [permCanManageClasses, setPermCanManageClasses] = useState(false);
  const [permCanViewIntegrityLogs, setPermCanViewIntegrityLogs] = useState(false);
  const [permIsSuspended, setPermIsSuspended] = useState(false);

  // Modal: Announcement
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceTarget, setAnnounceTarget] = useState<'all' | 'siswa' | 'guru'>('all');

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const loadDbStats = async () => {
    setLoadingDbStats(true);
    try {
      const stats = await api.getDatabaseStats();
      setDbStats(stats);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setLoadingDbStats(false);
    }
  };

  const handleSyncDatabase = async () => {
    setIsSyncingDb(true);
    setDbOperationMessage(null);
    try {
      const res = await api.syncDatabase();
      showToast(res.message || 'Basis data berhasil disinkronkan ke server.');
      setDbOperationMessage('Sinkronisasi tuntas. Data tersimpan aman di server awan.');
      await loadDbStats();
      await loadAllData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menyinkronkan basis data');
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const fullSnapshot = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(fullSnapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `belajarin_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Cadangan basis data berhasil diunduh dalam format JSON.');
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor basis data');
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        'PERINGATAN: Memulihkan basis data akan menimpa data yang ada saat ini dengan data dari cadangan JSON. Lanjutkan pemulihan?'
      )
    ) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);

      if (!parsedData.users || !parsedData.tasks || !parsedData.classes) {
        throw new Error('Format file cadangan tidak valid (wajib memiliki users, tasks, dan classes).');
      }

      await api.restoreDatabase(parsedData);
      showToast('Basis data berhasil dipulihkan dari berkas cadangan!');
      await loadDbStats();
      await loadAllData();
    } catch (err: any) {
      alert(`Gagal memulihkan database: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [uList, cList, tList, sList, aLogs, annList, stats, managedRes] = await Promise.all([
        api.getAdminUsers(),
        api.getClasses(),
        api.getTasks(),
        api.getSubmissions(),
        api.getAuditLogs(),
        api.getAnnouncements(),
        api.getDatabaseStats().catch(() => null),
        api.getManagedTeachers(currentUser.id).catch(() => null),
      ]);
      setUsers(uList);
      setClasses(cList);
      setTasks(tList);
      setSubmissions(sList);
      setAuditLogs(aLogs);
      setAnnouncements(annList);
      if (stats) setDbStats(stats);
      if (managedRes) {
        setManagedTeacherIds(managedRes.managedTeacherIds || []);
        setManagedTeachers(managedRes.managedTeachers || []);
      }

      // default teacher id for class creation if not set
      const teachers = uList.filter((u) => u.role === 'guru');
      if (teachers.length > 0 && !newClassTeacherId) {
        setNewClassTeacherId(teachers[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddTeacherByCode = async (code: string) => {
    const res = await api.addManagedTeacher(currentUser.id, code);
    setManagedTeacherIds(res.managedTeacherIds || []);
    setManagedTeachers(res.managedTeachers || []);
    showToast(res.message || 'Guru berhasil diadminkan!');
    await loadAllData(true);
  };

  const handleRemoveTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Apakah Anda yakin ingin melepas guru ${teacherName} dari daftar binaan admin?`)) return;
    try {
      const res = await api.removeManagedTeacher(currentUser.id, teacherId);
      setManagedTeacherIds(res.managedTeacherIds || []);
      setManagedTeachers(res.managedTeachers || []);
      showToast(`Guru ${teacherName} berhasil dilepaskan dari binaan admin.`);
      await loadAllData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal melepas guru');
    }
  };

  const handleOpenBantuAnnouncement = (teacher?: User) => {
    setBantuInitialTeacherId(teacher?.id);
    setIsBantuAnnounceModalOpen(true);
  };

  const handleOpenBantuSoal = (teacher?: User) => {
    setBantuSoalInitialTeacherId(teacher?.id);
    setIsBantuSoalModalOpen(true);
  };

  const handleOpenSimulasiJoin = (cls: ClassRoom) => {
    setSimulasiClass(cls);
    setIsSimulasiJoinOpen(true);
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // When selecting user for permissions in A3
  useEffect(() => {
    if (selectedUserForPermissions) {
      setPermRole(selectedUserForPermissions.role);
      setPermCanCreateTasks(
        selectedUserForPermissions.permissions?.canCreateTasks ??
          (selectedUserForPermissions.role === 'guru' || selectedUserForPermissions.role === 'admin')
      );
      setPermCanGradeSubmissions(
        selectedUserForPermissions.permissions?.canGradeSubmissions ??
          (selectedUserForPermissions.role === 'guru' || selectedUserForPermissions.role === 'admin')
      );
      setPermCanManageClasses(
        selectedUserForPermissions.permissions?.canManageClasses ??
          (selectedUserForPermissions.role === 'guru' || selectedUserForPermissions.role === 'admin')
      );
      setPermCanViewIntegrityLogs(
        selectedUserForPermissions.permissions?.canViewIntegrityLogs ??
          (selectedUserForPermissions.role === 'guru' || selectedUserForPermissions.role === 'admin')
      );
      setPermIsSuspended(Boolean(selectedUserForPermissions.permissions?.isSuspended));
    }
  }, [selectedUserForPermissions]);

  // Load students for active class
  const handleOpenClassStudents = async (cls: ClassRoom) => {
    setActiveClassForStudents(cls);
    setLoadingClassStudents(true);
    try {
      const studs = await api.getClassStudents(cls.id);
      setClassEnrolledStudents(studs);
    } catch (err) {
      console.error('Failed to load class students:', err);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleAddStudentToClass = async () => {
    if (!activeClassForStudents || !selectedStudentToAdd) return;
    try {
      await api.addClassStudent(activeClassForStudents.id, selectedStudentToAdd);
      showToast('Siswa berhasil didaftarkan ke dalam kelas.');
      setSelectedStudentToAdd('');
      // Reload class students & main data
      const updatedStudents = await api.getClassStudents(activeClassForStudents.id);
      setClassEnrolledStudents(updatedStudents);
      loadAllData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan siswa ke kelas');
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string, studentName: string) => {
    if (!activeClassForStudents) return;
    if (confirm(`Keluarkan siswa "${studentName}" dari kelas "${activeClassForStudents.name}"?`)) {
      try {
        await api.removeClassStudent(activeClassForStudents.id, studentId);
        showToast(`Siswa ${studentName} telah dikeluarkan.`);
        const updatedStudents = await api.getClassStudents(activeClassForStudents.id);
        setClassEnrolledStudents(updatedStudents);
        loadAllData(true);
      } catch (err: any) {
        alert(err.message || 'Gagal mengeluarkan siswa');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // A1: User Management Actions
  // ---------------------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError(null);
    try {
      await api.createAdminUser({
        name: newUserName,
        username: newUserUsername,
        password: newUserPassword,
        role: newUserRole,
        kelas: newUserRole === 'siswa' ? newUserClass : undefined,
        nomorAbsen: newUserRole === 'siswa' ? newUserAbsen : undefined,
        nip: newUserRole === 'guru' ? newUserNip : undefined,
        mataPelajaran: newUserRole === 'guru' ? newUserMapel : undefined,
        permissions: {
          canCreateTasks: newUserRole === 'guru' || newUserRole === 'admin',
          canGradeSubmissions: newUserRole === 'guru' || newUserRole === 'admin',
          canManageClasses: newUserRole === 'guru' || newUserRole === 'admin',
          canViewIntegrityLogs: newUserRole === 'guru' || newUserRole === 'admin',
          isSuspended: false,
        },
      });

      setIsCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('123456');
      showToast('Akun pengguna baru berhasil didaftarkan!');
      loadAllData();
    } catch (err: any) {
      setNewUserError(err.message || 'Gagal membuat pengguna');
    }
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditClass(user.kelas || '');
    setEditAbsen(String(user.nomorAbsen || ''));
    setEditNip(user.nip || '');
    setEditMapel(user.mataPelajaran || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateAdminUser(editingUser.id, {
        name: editName,
        username: editUsername,
        kelas: editingUser.role === 'siswa' ? editClass : undefined,
        nomorAbsen: editingUser.role === 'siswa' ? editAbsen : undefined,
        nip: editingUser.role === 'guru' ? editNip : undefined,
        mataPelajaran: editingUser.role === 'guru' ? editMapel : undefined,
      });
      setEditingUser(null);
      showToast('Perubahan data pengguna berhasil disimpan!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data pengguna');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      await api.resetUserPassword(resettingUser.id, newPasswordInput);
      showToast(`Kata sandi untuk ${resettingUser.name} berhasil direset.`);
      setResettingUser(null);
      setNewPasswordInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal mereset kata sandi');
    }
  };

  const handleKickSession = async (userId: string, userName: string) => {
    if (
      confirm(
        `Putus sesi gawai aktif untuk "${userName}"? Akun akan ter-logout otomatis dari gawainya.`
      )
    ) {
      await api.kickUserSession(userId);
      showToast(`Sesi perangkat ${userName} berhasil diputus.`);
      loadAllData();
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (confirm(`Hapus pengguna "${userName}" secara permanen dari sistem?`)) {
      await api.deleteAdminUser(userId);
      showToast(`Pengguna ${userName} telah dihapus.`);
      loadAllData();
    }
  };

  // ---------------------------------------------------------------------------
  // A2: Class Management Actions
  // ---------------------------------------------------------------------------
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClassError(null);
    try {
      const teacher = users.find((u) => u.id === newClassTeacherId);
      await api.createClass({
        name: newClassName,
        subject: newClassSubject,
        gradeLevel: newClassGrade,
        teacherId: newClassTeacherId,
        teacherName: teacher ? teacher.name : 'Guru Pengampu',
        passkey: newClassPasskey.toUpperCase().trim(),
        description: newClassDescription,
        studentIds: [],
      });
      setIsCreateClassModalOpen(false);
      setNewClassName('');
      setNewClassSubject('');
      setNewClassPasskey('');
      setNewClassDescription('');
      showToast('Kelas baru berhasil dibuat!');
      loadAllData();
    } catch (err: any) {
      setCreateClassError(err.message || 'Gagal membuat kelas');
    }
  };

  const handleOpenEditClass = (cls: ClassRoom) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassSubject(cls.subject);
    setEditClassGrade(cls.gradeLevel || 'Kelas 10');
    setEditClassTeacherId(cls.teacherId);
    setEditClassPasskey(cls.passkey);
    setEditClassDescription(cls.description || '');
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      const teacher = users.find((u) => u.id === editClassTeacherId);
      await api.updateClass(editingClass.id, {
        name: editClassName,
        subject: editClassSubject,
        gradeLevel: editClassGrade,
        teacherId: editClassTeacherId,
        teacherName: teacher ? teacher.name : editingClass.teacherName,
        passkey: editClassPasskey.toUpperCase().trim(),
        description: editClassDescription,
      });
      setEditingClass(null);
      showToast('Data kelas berhasil diperbarui!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui kelas');
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (confirm(`Hapus kelas "${className}" secara permanen? Semua siswa akan keluar dari kelas ini.`)) {
      await api.deleteClass(classId);
      showToast(`Kelas "${className}" telah dihapus.`);
      loadAllData();
    }
  };

  // ---------------------------------------------------------------------------
  // A3: Access Control Actions
  // ---------------------------------------------------------------------------
  const handleSaveUserPermissions = async () => {
    if (!selectedUserForPermissions) return;
    try {
      const updated = await api.updateAdminUser(selectedUserForPermissions.id, {
        role: permRole,
        permissions: {
          canCreateTasks: permCanCreateTasks,
          canGradeSubmissions: permCanGradeSubmissions,
          canManageClasses: permCanManageClasses,
          canViewIntegrityLogs: permCanViewIntegrityLogs,
          isSuspended: permIsSuspended,
        },
      });
      setSelectedUserForPermissions(updated);
      showToast(`Hak akses untuk ${updated.name} berhasil diperbarui.`);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui hak akses pengguna');
    }
  };

  // ---------------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------------
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAnnouncement({
        title: announceTitle,
        content: announceContent,
        targetRole: announceTarget,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
      });
      setIsAnnounceModalOpen(false);
      setAnnounceTitle('');
      setAnnounceContent('');
      showToast('Pengumuman sekolah berhasil disiarkan!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat pengumuman');
    }
  };

  // Filtered lists
  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'online'
          ? Boolean(u.activeSessionId)
          : Boolean(u.permissions?.isSuspended);
    const q = (userSearchQuery || '').toLowerCase();
    const matchQuery =
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      Boolean(u.kelas && u.kelas.toLowerCase().includes(q)) ||
      Boolean(u.nip && u.nip.toLowerCase().includes(q));
    return matchRole && matchStatus && matchQuery;
  });

  const filteredClasses = (classes || []).filter((cls) => {
    if (!cls) return false;
    const q = (classSearchQuery || '').toLowerCase();
    return (
      (cls.name || '').toLowerCase().includes(q) ||
      (cls.subject || '').toLowerCase().includes(q) ||
      (cls.teacherName || '').toLowerCase().includes(q) ||
      (cls.passkey || '').toLowerCase().includes(q)
    );
  });

  const activeDeviceCount = (users || []).filter((u) => Boolean(u?.activeSessionId)).length;
  const suspendedUserCount = (users || []).filter((u) => Boolean(u?.permissions?.isSuspended)).length;
  const teachersList = (users || []).filter((u) => u?.role === 'guru');
  const studentsList = (users || []).filter((u) => u?.role === 'siswa');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 pb-20">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Portal Administrasi Terpusat
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  Rubrik Penilaian Lengkap
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-800">
                Pusat Kendali Pengguna, Kelas & Hak Akses
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadAllData(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>

              <button
                type="button"
                id="btn-open-announcement-modal"
                onClick={() => setIsAnnounceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                Siarkan Pengumuman
              </button>
            </div>
          </div>

          {/* Rubrik Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 border-t border-slate-100 pt-3 mt-3 text-xs">
            {/* Rubrik A1 */}
            <button
              type="button"
              id="admin-tab-a1-users"
              onClick={() => setActiveTab('a1_users')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'a1_users'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>A1 • Pengelolaan Akun Pengguna</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'a1_users' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Bobot: 5
              </span>
            </button>

            {/* Rubrik A2 */}
            <button
              type="button"
              id="admin-tab-a2-classes"
              onClick={() => setActiveTab('a2_classes')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'a2_classes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>A2 • Pengelolaan Kelas</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'a2_classes' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Bobot: 5
              </span>
            </button>

            {/* Rubrik A3 */}
            <button
              type="button"
              id="admin-tab-a3-access"
              onClick={() => setActiveTab('a3_access')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'a3_access'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>A3 • Pengaturan Hak Akses</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'a3_access' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Bobot: 5
              </span>
            </button>

            {/* Tab Guru Binaan (Bantu Soal & Pengumuman, Maks 5 Guru) */}
            <button
              type="button"
              id="admin-tab-managed-teachers"
              onClick={() => setActiveTab('managed_teachers')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'managed_teachers'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-purple-900 hover:bg-purple-50 bg-white border border-purple-200'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>🤝 Guru Binaan (Bantu Guru)</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'managed_teachers'
                    ? 'bg-purple-900 text-purple-100'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {managedTeacherIds?.length || 0}/5 Guru
              </span>
            </button>

            {/* Cloud Database & Non-Localhost Persistence Tab */}
            <button
              type="button"
              id="admin-tab-database"
              onClick={() => {
                setActiveTab('database');
                loadDbStats();
              }}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'database'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Penyimpanan Cloud & Basis Data</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'database' ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Multi-Perangkat
              </span>
            </button>

            {/* System Announcements */}
            <button
              type="button"
              id="admin-tab-announcements"
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'announcements'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Siaran Pengumuman ({announcements?.length || 0})</span>
            </button>

            {/* Audit Logs */}
            <button
              type="button"
              id="admin-tab-audit"
              onClick={() => setActiveTab('audit_logs')}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                activeTab === 'audit_logs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Log Audit & Integritas</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* TAB A1: PENGELOLAAN AKUN PENGGUNA (Bobot: 5)                              */}
        {/* ========================================================================= */}
        {activeTab === 'a1_users' && (
          <div className="space-y-6">
            {/* Rubrik Badge Banner */}
            <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-mono text-[11px] font-bold uppercase">
                  Rubrik Kisi-Kisi: A1 • Bobot 5
                </span>
                <h3 className="text-lg font-black mt-1">Indikator: Pengelolaan Akun Pengguna</h3>
                <p className="text-xs text-blue-100 mt-0.5 max-w-2xl">
                  Fitur menyeluruh untuk pendaftaran akun siswa/guru/admin, pembaruan biodata akademik,
                  reset kata sandi, pemutusan sesi gawai (1 akun 1 perangkat), dan penghapusan akun.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-create-user-modal"
                onClick={() => {
                  setNewUserError(null);
                  setIsCreateUserModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Pengguna
                </span>
                <div className="text-2xl font-black text-slate-800 mt-1">{users?.length || 0}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Seluruh akun terdaftar</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Siswa Terdaftar
                </span>
                <div className="text-2xl font-black text-blue-600 mt-1">{studentsList?.length || 0}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Akun pelajar</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Guru Pengampu
                </span>
                <div className="text-2xl font-black text-purple-600 mt-1">{teachersList?.length || 0}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Pendidik mata pelajaran</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sesi Gawai Aktif
                </span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{activeDeviceCount}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">1 Akun 1 Perangkat</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Akun Dibekukan
                </span>
                <div className="text-2xl font-black text-rose-600 mt-1">{suspendedUserCount}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Akses dinonaktifkan</span>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama, username, kelas, atau NIP..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
                >
                  <option value="all">Semua Peran (Role)</option>
                  <option value="siswa">Peran: Siswa</option>
                  <option value="guru">Peran: Guru</option>
                  <option value="admin">Peran: Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="online">Sedang Terhubung (Online)</option>
                  <option value="suspended">Dibekukan (Suspended)</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Pengguna</th>
                      <th className="p-4">Peran (Role)</th>
                      <th className="p-4">Informasi Akademik</th>
                      <th className="p-4">Sesi Gawai (1 Device)</th>
                      <th className="p-4">Status Akun</th>
                      <th className="p-4 text-right">Aksi Kelola (A1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Tidak ada data pengguna yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                u.role === 'admin'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : u.role === 'guru'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {u.role === 'siswa' ? (
                              <span>
                                Kelas: <strong>{u.kelas || '-'}</strong> • Absen: No.{' '}
                                {u.nomorAbsen || '-'}
                              </span>
                            ) : u.role === 'guru' ? (
                              <span>
                                Mapel: <strong>{u.mataPelajaran || '-'}</strong> • NIP: {u.nip || '-'}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Super Administrator</span>
                            )}
                          </td>
                          <td className="p-4">
                            {u.activeSessionId ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                  {u.lastDeviceName || 'Online'}
                                </span>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {u.lastLoginAt
                                    ? new Date(u.lastLoginAt).toLocaleTimeString('id-ID')
                                    : 'Terhubung'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Offline / Belum login</span>
                            )}
                          </td>
                          <td className="p-4">
                            {u.permissions?.isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                Dibekukan
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit User */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="Edit Biodata Pengguna"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => {
                                  setResettingUser(u);
                                  setNewPasswordInput('');
                                }}
                                className="p-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
                                title="Reset Kata Sandi"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Kick Session */}
                              {u.activeSessionId && (
                                <button
                                  type="button"
                                  onClick={() => handleKickSession(u.id, u.name)}
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold cursor-pointer"
                                  title="Putus sesi gawai aktif"
                                >
                                  Putus Sesi
                                </button>
                              )}

                              {/* Delete User */}
                              {u.id !== currentUser.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB A2: PENGELOLAAN KELAS (Bobot: 5)                                      */}
        {/* ========================================================================= */}
        {activeTab === 'a2_classes' && (
          <div className="space-y-6">
            {/* Rubrik Badge Banner */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-mono text-[11px] font-bold uppercase">
                  Rubrik Kisi-Kisi: A2 • Bobot 5
                </span>
                <h3 className="text-lg font-black mt-1">Indikator: Pengelolaan Kelas</h3>
                <p className="text-xs text-purple-100 mt-0.5 max-w-2xl">
                  Fitur komprehensif pembuatan kelas baru, pengaturan guru pengampu, pengelolaan passkey
                  sandi masuk kelas, serta penambahan dan pengeluaran anggota siswa di kelas.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-create-class-modal"
                onClick={() => {
                  setCreateClassError(null);
                  setIsCreateClassModalOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Kelas Baru</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Ruang Kelas
                </span>
                <div className="text-2xl font-black text-indigo-700 mt-1">{classes.length}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Kelas aktif di sistem</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Guru Pengampu Mengajar
                </span>
                <div className="text-2xl font-black text-purple-700 mt-1">{teachersList.length}</div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Tersedia untuk ditugaskan</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Siswa Terdaftar di Kelas
                </span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {classes.reduce((sum, c) => sum + (c.studentIds?.length || 0), 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Akumulasi anggota seluruh kelas
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  placeholder="Cari kelas berdasarkan nama kelas, mata pelajaran, nama guru, atau passkey..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  Tidak ada kelas yang ditemukan.
                </div>
              ) : (
                filteredClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-purple-300 transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {cls.subject}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {cls.gradeLevel || 'Kelas'}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900">{cls.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                        <span>Guru: {cls.teacherName}</span>
                      </p>

                      {cls.description && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-xl italic">
                          &ldquo;{cls.description}&rdquo;
                        </p>
                      )}

                      {/* Passkey & Fitur Bergabung Kelas */}
                      <div className="mt-4 p-3 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                            <span>Passkey Masuk Kelas:</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-black text-purple-700 tracking-wider bg-white px-2 py-0.5 rounded border border-purple-200">
                              {cls.passkey}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cls.passkey);
                                showToast(`Passkey ${cls.passkey} berhasil disalin!`);
                              }}
                              className="p-1 hover:bg-white text-purple-600 rounded cursor-pointer"
                              title="Salin Passkey"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Tombol Fitur Bergabung Kelas */}
                        <button
                          type="button"
                          onClick={() => handleOpenSimulasiJoin(cls)}
                          className="w-full py-1.5 bg-white hover:bg-purple-100/70 border border-purple-200 text-purple-800 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          title="Uji coba atau daftarkan siswa bergabung ke kelas ini menggunakan passkey"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>🔑 Uji / Input Gabung Siswa</span>
                        </button>
                      </div>

                      {/* Student Count */}
                      <div className="mt-3 text-xs text-slate-600 font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cls.studentIds?.length || 0} Siswa Terdaftar</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                          Hak Admin: Edit Manual
                        </span>
                      </div>
                    </div>

                    {/* Class Action Buttons */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenClassStudents(cls)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        title="Edit manual siapa saja yang ditambahkan atau dikeluarkan dari kelas (Hak Istimewa Admin)"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Kelola Siswa Manual ({cls.studentIds?.length || 0})</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const t = users.find((u) => u.id === cls.teacherId);
                            handleOpenBantuAnnouncement(t);
                          }}
                          className="p-1.5 border border-purple-200 hover:bg-purple-50 text-purple-700 rounded-lg cursor-pointer"
                          title="Bantu Pengumuman untuk Kelas Ini"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const t = users.find((u) => u.id === cls.teacherId);
                            handleOpenBantuSoal(t);
                          }}
                          className="p-1.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg cursor-pointer"
                          title="Bantu Buat Soal untuk Kelas Ini"
                        >
                          <FileQuestion className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditClass(cls)}
                          className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB A3: PENGATURAN HAK AKSES (Bobot: 5)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'a3_access' && (
          <div className="space-y-6">
            {/* Rubrik Badge Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-mono text-[11px] font-bold uppercase">
                  Rubrik Kisi-Kisi: A3 • Bobot 5
                </span>
                <h3 className="text-lg font-black mt-1">Indikator: Pengaturan Hak Akses</h3>
                <p className="text-xs text-emerald-100 mt-0.5 max-w-2xl">
                  Matriks otorisasi peran (Siswa, Guru, Admin), kendali izin granular per akun (pembuatan
                  materi, penilaian AI, pembuatan kelas), serta pembekuan/penonaktifan akses akun.
                </p>
              </div>
            </div>

            {/* Sub-Section 1: Role Permission Matrix (Req A3) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-800">
                  Matriks Standar Hak Akses Sistem Berdasarkan Peran (Role Matrix)
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                Tabel referensi hak akses default sistem untuk masing-masing tingkatan pengguna. Admin dapat
                menyesuaikan izin secara spesifik per pengguna di bawah.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-2xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="p-3 border-b border-slate-200">Modul & Kemampuan Fitur</th>
                      <th className="p-3 border-b border-slate-200 text-center bg-blue-50/50">
                        Siswa
                      </th>
                      <th className="p-3 border-b border-slate-200 text-center bg-purple-50/50">Guru</th>
                      <th className="p-3 border-b border-slate-200 text-center bg-indigo-50/50">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Akses LKPD, Bank Soal, & Evaluasi UH
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Buka & Kerjakan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Pratinjau & Buat</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Akses Penuh</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Pembuatan Kelas & Sandi Masuk (Passkey)
                      </td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Tidak Diizinkan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Koreksi Jawaban & Analisis Multimodal AI Gemini
                      </td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Khusus Pendidik</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Pengelolaan Anggota Kelas Siswa
                      </td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Hanya Bergabung</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Kelola Kelas Sendiri</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Kelola Semua Kelas</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Pengelolaan Akun Pengguna & Reset Password (A1)
                      </td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Tidak Diizinkan</td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Tidak Diizinkan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        Pengaturan Hak Akses & Pembekuan Akun (A3)
                      </td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Tidak Diizinkan</td>
                      <td className="p-3 text-center text-rose-500 font-bold">✕ Tidak Diizinkan</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓ Diizinkan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-Section 2: Granular Access Editor per User (A3) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Pengaturan Hak Akses Spesifik Per Pengguna
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pilih akun pengguna untuk mengubah peran atau mengatur hak akses secara granular.
                  </p>
                </div>

                <div className="min-w-[280px]">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Pilih Pengguna yang Diatur:
                  </label>
                  <select
                    value={selectedUserForPermissions?.id || ''}
                    onChange={(e) => {
                      const found = users.find((u) => u.id === e.target.value);
                      setSelectedUserForPermissions(found || null);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Pilih Akun Pengguna --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username}) - [{u.role.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUserForPermissions ? (
                <div className="space-y-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-slate-900">
                          {selectedUserForPermissions.name}
                        </h5>
                        <span className="text-xs text-slate-400">
                          (@{selectedUserForPermissions.username})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ID: <code className="font-mono">{selectedUserForPermissions.id}</code>
                      </p>
                    </div>

                    {/* Role Switcher */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Peran Akun:</span>
                      <select
                        value={permRole}
                        onChange={(e) => setPermRole(e.target.value as UserRole)}
                        className="px-3 py-1.5 rounded-xl border border-indigo-300 text-xs font-bold bg-white text-indigo-700"
                      >
                        <option value="siswa">Siswa</option>
                        <option value="guru">Guru</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  {/* Granular Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start gap-3 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={permCanCreateTasks}
                        onChange={(e) => setPermCanCreateTasks(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          Izin Pembuatan & Penjadwalan Tugas (LKPD / Bank Soal / UH)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Pengguna dapat membuat materi dan sesi ujian baru.
                        </span>
                      </div>
                    </label>

                    <label className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start gap-3 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={permCanGradeSubmissions}
                        onChange={(e) => setPermCanGradeSubmissions(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          Izin Koreksi & Analisis Gemini AI
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Pengguna berhak menilai lembar jawaban siswa dan melihat analisis AI.
                        </span>
                      </div>
                    </label>

                    <label className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start gap-3 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={permCanManageClasses}
                        onChange={(e) => setPermCanManageClasses(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          Izin Pembuatan & Pengelolaan Kelas
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Pengguna dapat membuat ruang kelas serta menetapkan sandi passkey masuk.
                        </span>
                      </div>
                    </label>

                    <label className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start gap-3 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={permCanViewIntegrityLogs}
                        onChange={(e) => setPermCanViewIntegrityLogs(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          Izin Pemantauan Log Integritas & Kecurangan
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Pengguna dapat melihat rekam jejak keluar layar (blur/tab pindah) saat ujian.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Account Status Toggle: Active vs Suspended */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        Status Aktivasi Akun Pengguna
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Jika akun dibekukan (suspended), pengguna tidak akan diizinkan login ke dalam sistem.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPermIsSuspended(!permIsSuspended)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        permIsSuspended
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {permIsSuspended ? 'Status: Akun Dibekukan' : 'Status: Akun Aktif'}
                    </button>
                  </div>

                  {/* Save Permissions */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveUserPermissions}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan Hak Akses (A3)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Silakan pilih salah satu akun pengguna pada menu dropdown di atas untuk mengonfigurasi
                  hak akses secara detail.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB GURU BINAAN: DAMPINGI GURU (BANTU SOAL, PENGUMUMAN, MAKS 5 GURU)       */}
        {/* ========================================================================= */}
        {activeTab === 'managed_teachers' && (
          <AdminManagedTeachersTab
            currentUser={currentUser}
            managedTeachers={managedTeachers}
            allTeachers={teachersList}
            classesList={classes}
            onAddTeacherByCode={handleAddTeacherByCode}
            onRemoveTeacher={handleRemoveTeacher}
            onOpenBantuAnnouncement={handleOpenBantuAnnouncement}
            onOpenBantuSoal={handleOpenBantuSoal}
            loading={loadingManagedTeachers}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: ANNOUNCEMENTS                                                        */}
        {/* ========================================================================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-800">Daftar Siaran Pengumuman Sekolah</h3>
                <p className="text-xs text-slate-500">
                  Pesan siaran langsung akan muncul pada notifikasi siswa dan guru sesuai target peran.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAnnounceModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Pengumuman Baru</span>
              </button>
            </div>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                  Belum ada pengumuman yang disiarkan.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span className="font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                          Target: {ann.targetRole}
                        </span>
                        <span>•</span>
                        <span>{new Date(ann.createdAt).toLocaleString('id-ID')}</span>
                        <span>•</span>
                        <span>Oleh: {ann.senderName}</span>
                      </div>
                      <h4 className="font-bold text-base text-slate-800">{ann.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.content}</p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Hapus pengumuman ini?')) {
                          await api.deleteAnnouncement(ann.id);
                          showToast('Pengumuman berhasil dihapus.');
                          loadAllData();
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: DATABASE & CLOUD PERSISTENCE (NON-LOCALHOST PROOF)                    */}
        {/* ========================================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Box */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Cloud className="w-64 h-64" />
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-700/80 border border-indigo-500/50 text-xs font-bold text-indigo-200">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Penyimpanan Terpusat Server • Multi-Perangkat</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    Pusat Basis Data & Persistensi Cloud Server
                  </h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    Sistem Belajarin menggunakan arsitektur backend server terpusat. Seluruh data akun,
                    kelas, soal ujian, jawaban lembar kerja siswa, lampiran foto, serta catatan analisis AI
                    disimpan pada server, dapat diakses dari perangkat manapun, dan tidak hilang saat browser
                    ditutup.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={loadDbStats}
                    disabled={loadingDbStats}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs border border-white/20"
                    title="Muat Ulang Statistik Basis Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDbStats ? 'animate-spin' : ''}`} />
                    <span>Periksa Status</span>
                  </button>

                  <button
                    type="button"
                    id="btn-sync-database"
                    onClick={handleSyncDatabase}
                    disabled={isSyncingDb}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDb ? 'animate-spin' : ''}`} />
                    <span>{isSyncingDb ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {dbOperationMessage && (
                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-xs text-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{dbOperationMessage}</span>
                </div>
              )}
            </div>

            {/* 4 Primary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Arsitektur Penyimpanan</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base font-black text-slate-800">
                  {dbStats?.storageType || 'Cloud Server Engine'}
                </div>
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Non-Localhost (Server Persistent)
                </p>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Ukuran Basis Data</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base font-black text-slate-800">
                  {dbStats?.formattedFileSize || 'Menghitung...'}
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate" title={dbStats?.databaseFilePath}>
                  {dbStats?.databaseFilePath || 'data/belajarin_db.json'}
                </p>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Waktu Sinkronisasi Terakhir</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base font-black text-slate-800">
                  {dbStats?.lastSyncedAt
                    ? new Date(dbStats.lastSyncedAt).toLocaleTimeString('id-ID')
                    : 'Real-time Terhubung'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {dbStats?.lastSyncedAt
                    ? new Date(dbStats.lastSyncedAt).toLocaleDateString('id-ID')
                    : 'Tersimpan otomatis'}
                </p>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Total Entitas Dokumen</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <HardDrive className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base font-black text-slate-800">
                  {(dbStats?.entityCounts?.users ?? users.length) +
                    (dbStats?.entityCounts?.tasks ?? tasks.length) +
                    (dbStats?.entityCounts?.submissions ?? submissions.length) +
                    (dbStats?.entityCounts?.classes ?? classes.length)}{' '}
                  Data
                </div>
                <p className="text-[11px] text-blue-600 font-bold">
                  Tersedia untuk Siswa & Guru
                </p>
              </div>
            </div>

            {/* Collection Breakdown Grid */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Rincian Entitas Data Tersimpan di Server Backend
                  </h4>
                  <p className="text-xs text-slate-500">
                    Setiap entitas terkelola dalam struktur database terpusat yang dapat diakses multi-user secara simultan.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  7 Koleksi Aktif
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Akun Pengguna</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.users ?? users.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Guru, Siswa, Admin</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Kelas Belajar</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.classes ?? classes.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Rombel Aktif</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tugas & LKPD</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.tasks ?? tasks.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Format Google Form</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Jawaban Siswa</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.submissions ?? submissions.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Foto & Uraian</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Arsip Tugas</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.archivedTasks ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Penyimpanan Lama</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Pengumuman</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.announcements ?? announcements.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Siaran Sekolah</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Log Audit</span>
                  <span className="text-lg font-black text-indigo-900 block mt-1">
                    {dbStats?.entityCounts?.auditLogs ?? auditLogs.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Keamanan Ujian</span>
                </div>
              </div>
            </div>

            {/* Action Tools: Backup & Restore */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup / Export */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Unduh Cadangan Basis Data Penuh (Export JSON)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Unduh salinan berkas snapshot seluruh isi basis data aplikasi (seluruh akun siswa & guru, tugas,
                    lampiran jawaban, dan riwayat evaluasi) untuk arsip cadangan sekolah atau migrasi server.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-export-database"
                  onClick={handleExportDatabase}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Cadangan (.json)</span>
                </button>
              </div>

              {/* Restore / Import */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Pulihkan Basis Data dari Berkas Cadangan (Restore JSON)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Unggah berkas snapshot cadangan JSON untuk memulihkan seluruh data aplikasi. Seluruh koleksi akan
                    diverifikasi integritasnya sebelum diterapkan ke server backend.
                  </p>
                </div>

                <label className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Pilih Berkas Cadangan (.json)</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleRestoreDatabase}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Architecture Explanation Card */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Bukti Keamanan & Alur Data Non-Localhost:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">
                    1. Pengiriman Tugas Siswa
                  </span>
                  <p className="text-[11.5px] leading-relaxed">
                    Saat siswa menekan tombol "Kirim Jawaban", payload jawaban (termasuk teks esai dan foto lembar kerja)
                    dikirim melalui HTTP POST ke endpoint server <code className="text-indigo-600 font-mono">/api/submissions</code>.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">
                    2. Persistensi Server Terpusat
                  </span>
                  <p className="text-[11.5px] leading-relaxed">
                    Data langsung dicatat ke <code className="text-indigo-600 font-mono">DatabaseManager</code> backend dan
                    diteruskan ke storage permanen server di <code className="text-indigo-600 font-mono">/data/belajarin_db.json</code>.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">
                    3. Koreksi Multi-Perangkat Guru
                  </span>
                  <p className="text-[11.5px] leading-relaxed">
                    Guru membuka dashboard di perangkat atau laptop lain, sistem otomatis melakukan sinkronisasi berkala
                    sehingga jawaban siswa langsung muncul di tab "Tanggungan Guru" untuk dikoreksi dan dinilai AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: AUDIT LOGS & INTEGRITY                                               */}
        {/* ========================================================================= */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Rekam Jejak Keamanan Sistem & Integritas Ujian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mencatat seluruh aksi penting: pembuatan akun, perubahan hak akses, pemutusan sesi 1
                  device, dan deteksi kecurangan saat ujian.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-400">
                {auditLogs.length} Total Rekaman
              </span>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada log rekam jejak keamanan yang tercatat.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                          {log.action}
                        </span>
                        <span className="text-slate-600 font-semibold">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          [{log.userRole}]
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(log.timestamp).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE USER (A1)                                                 */}
      {/* ========================================================================= */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Rubrik A1</span>
                <h4 className="font-bold text-base text-slate-800">Tambah Akun Pengguna Baru</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {newUserError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {newUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Peran Pengguna (Role): <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['siswa', 'guru', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUserRole(r)}
                      className={`py-2 rounded-xl font-bold uppercase text-xs cursor-pointer border ${
                        newUserRole === r
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Username: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().trim())}
                    placeholder="contoh: budi_santoso"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi Awal: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              {/* Conditional Fields based on Role */}
              {newUserRole === 'siswa' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block font-bold text-blue-900 mb-1">Kelas Siswa:</label>
                    <input
                      type="text"
                      value={newUserClass}
                      onChange={(e) => setNewUserClass(e.target.value)}
                      placeholder="contoh: X MIPA 1"
                      className="w-full px-3 py-1.5 rounded-xl border border-blue-200 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-900 mb-1">Nomor Absen:</label>
                    <input
                      type="number"
                      value={newUserAbsen}
                      onChange={(e) => setNewUserAbsen(e.target.value)}
                      placeholder="contoh: 1"
                      className="w-full px-3 py-1.5 rounded-xl border border-blue-200 bg-white font-semibold"
                    />
                  </div>
                </div>
              )}

              {newUserRole === 'guru' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">NIP Guru:</label>
                    <input
                      type="text"
                      value={newUserNip}
                      onChange={(e) => setNewUserNip(e.target.value)}
                      placeholder="contoh: 19800101..."
                      className="w-full px-3 py-1.5 rounded-xl border border-purple-200 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Mata Pelajaran:</label>
                    <input
                      type="text"
                      value={newUserMapel}
                      onChange={(e) => setNewUserMapel(e.target.value)}
                      placeholder="contoh: Biologi"
                      className="w-full px-3 py-1.5 rounded-xl border border-purple-200 bg-white font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Daftarkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER BIODATA (A1)                                           */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800">Edit Data Pengguna</h4>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username:</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().trim())}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-semibold"
                />
              </div>

              {editingUser.role === 'siswa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kelas:</label>
                    <input
                      type="text"
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nomor Absen:</label>
                    <input
                      type="number"
                      value={editAbsen}
                      onChange={(e) => setEditAbsen(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                </div>
              )}

              {editingUser.role === 'guru' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIP:</label>
                    <input
                      type="text"
                      value={editNip}
                      onChange={(e) => setEditNip(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran:</label>
                    <input
                      type="text"
                      value={editMapel}
                      onChange={(e) => setEditMapel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD (A1)                                              */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800">Reset Kata Sandi</h4>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Tetapkan kata sandi baru untuk akun <strong>{resettingUser.name}</strong> (@
                {resettingUser.username}):
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru:</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Ketik password baru..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Perbarui Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE CLASS (A2)                                                */}
      {/* ========================================================================= */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase">Rubrik A2</span>
                <h4 className="font-bold text-base text-slate-800">Buat Ruang Kelas Baru</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createClassError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {createClassError}
              </div>
            )}

            <form onSubmit={handleCreateClass} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kelas: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="contoh: X MIPA 1"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mata Pelajaran: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="contoh: Biologi"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat Kelas:</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="Kelas 10">Kelas 10</option>
                    <option value="Kelas 11">Kelas 11</option>
                    <option value="Kelas 12">Kelas 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Guru Pengampu: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newClassTeacherId}
                  onChange={(e) => setNewClassTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'} • {t.mataPelajaran || 'Umum'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Passkey Masuk Kelas: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassPasskey}
                  onChange={(e) => setNewClassPasskey(e.target.value.toUpperCase())}
                  placeholder="contoh: BIO101"
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-300 font-mono font-bold tracking-wider uppercase bg-purple-50/40 text-purple-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Siswa wajib memasukkan sandi ini untuk bergabung ke dalam kelas.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat:</label>
                <textarea
                  rows={2}
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  placeholder="Keterangan mata pelajaran, kompetensi dasar, dll..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT CLASS (A2)                                                  */}
      {/* ========================================================================= */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800">Edit Data Kelas</h4>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditClass} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kelas:</label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran:</label>
                  <input
                    type="text"
                    required
                    value={editClassSubject}
                    onChange={(e) => setEditClassSubject(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat:</label>
                  <input
                    type="text"
                    value={editClassGrade}
                    onChange={(e) => setEditClassGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Guru Pengampu:</label>
                <select
                  value={editClassTeacherId}
                  onChange={(e) => setEditClassTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Passkey Sandi Masuk:</label>
                <input
                  type="text"
                  required
                  value={editClassPasskey}
                  onChange={(e) => setEditClassPasskey(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-300 font-mono font-bold uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={editClassDescription}
                  onChange={(e) => setEditClassDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: MANAGE CLASS ENROLLED STUDENTS (A2)                              */}
      {/* ========================================================================= */}
      {activeClassForStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">
                  Manajemen Siswa Kelas (Rubrik A2)
                </span>
                <h4 className="font-bold text-base text-slate-800">
                  Daftar Siswa Kelas: {activeClassForStudents.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Mapel: {activeClassForStudents.subject} • Passkey: {activeClassForStudents.passkey}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveClassForStudents(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Banner Perbedaan Guru vs Admin */}
            <div className="my-3 p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Perbedaan Hak Akses Guru vs Admin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSimulasiJoin(activeClassForStudents);
                  }}
                  className="px-2 py-1 bg-white hover:bg-purple-100 border border-indigo-200 text-indigo-700 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3 text-purple-600" />
                  <span>Uji Gabung Siswa via Passkey</span>
                </button>
              </div>
              <p className="text-indigo-800 text-[11px] leading-relaxed">
                Guru biasa hanya membagikan passkey dan menunggu siswa bergabung sendiri. Sebagai <strong>Admin</strong>, Anda dapat <strong>mengedit manual siapa saja yang ditambahkan atau dikeluarkan</strong> pada kelas ini secara langsung seketika tanpa perlu siswa memasukkan kode.
              </p>
            </div>

            {/* Add Student to Class Section */}
            <div className="py-4 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tambahkan Siswa ke Kelas Ini:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStudentToAdd}
                  onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="">-- Pilih Siswa yang Belum Terdaftar --</option>
                  {studentsList
                    .filter((s) => !activeClassForStudents.studentIds?.includes(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Absen: {s.nomorAbsen || '-'} • Kelas Asal: {s.kelas || '-'})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedStudentToAdd}
                  onClick={handleAddStudentToClass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  + Tambahkan
                </button>
              </div>
            </div>

            {/* Students List in this Class */}
            <div className="py-3 flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>Siswa Terdaftar ({classEnrolledStudents.length})</span>
                <span>Tindakan</span>
              </div>

              {loadingClassStudents ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat anggota kelas...</div>
              ) : classEnrolledStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Belum ada siswa yang bergabung di kelas ini.
                </div>
              ) : (
                classEnrolledStudents.map((stud) => (
                  <div
                    key={stud.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{stud.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Absen No: <strong>{stud.nomorAbsen || '-'}</strong> • Username: @
                        {stud.username}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStudentFromClass(stud.id, stud.name)}
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Keluarkan
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveClassForStudents(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: BROADCAST ANNOUNCEMENT                                           */}
      {/* ========================================================================= */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800">Siarkan Pengumuman Sekolah</h4>
              <button
                type="button"
                onClick={() => setIsAnnounceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Penerima:</label>
                <select
                  value={announceTarget}
                  onChange={(e) => setAnnounceTarget(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  <option value="all">Semua Pengguna (Siswa & Guru)</option>
                  <option value="siswa">Khusus Siswa</option>
                  <option value="guru">Khusus Guru</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Pengumuman:</label>
                <input
                  type="text"
                  required
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="contoh: Jadwal Ujian Tengah Semester Dimulai"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Isi Pesan:</label>
                <textarea
                  rows={4}
                  required
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  placeholder="Tuliskan pesan yang akan disiarkan ke seluruh gawai pengguna..."
                  className="w-full p-3 rounded-xl border border-slate-300 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Siarkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: BANTU GURU MEMBUAT PENGUMUMAN                                    */}
      {/* ========================================================================= */}
      <AdminBantuPengumumanModal
        isOpen={isBantuAnnounceModalOpen}
        onClose={() => setIsBantuAnnounceModalOpen(false)}
        currentUser={currentUser}
        managedTeachers={managedTeachers}
        allTeachers={teachersList}
        classes={classes}
        initialTeacherId={bantuInitialTeacherId}
        onSuccess={(msg) => {
          showToast(msg);
          loadAllData(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 9: BANTU GURU MEMBUAT SOAL & TUGAS                                  */}
      {/* ========================================================================= */}
      <AdminBantuSoalModal
        isOpen={isBantuSoalModalOpen}
        onClose={() => setIsBantuSoalModalOpen(false)}
        currentUser={currentUser}
        managedTeachers={managedTeachers}
        allTeachers={teachersList}
        classes={classes}
        initialTeacherId={bantuSoalInitialTeacherId}
        onSuccess={(msg) => {
          showToast(msg);
          loadAllData(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 10: UJI / INPUT GABUNG SISWA KE KELAS (SIMULASI PASSKEY)            */}
      {/* ========================================================================= */}
      <AdminSimulasiJoinModal
        isOpen={isSimulasiJoinOpen}
        onClose={() => {
          setIsSimulasiJoinOpen(false);
          setSimulasiClass(null);
        }}
        currentUser={currentUser}
        classes={classes}
        students={studentsList}
        initialClass={simulasiClass}
        onSuccess={(msg) => {
          showToast(msg);
          loadAllData(true);
        }}
      />
    </div>
  );
};
