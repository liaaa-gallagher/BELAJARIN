import React, { useState } from 'react';
import { User, ClassRoom } from '../../types.js';
import {
  GraduationCap,
  KeyRound,
  PlusCircle,
  Megaphone,
  FileQuestion,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react';

interface AdminManagedTeachersTabProps {
  currentUser: User;
  managedTeachers: User[];
  allTeachers: User[];
  classesList: ClassRoom[];
  onAddTeacherByCode: (code: string) => Promise<void>;
  onRemoveTeacher: (teacherId: string, teacherName: string) => Promise<void>;
  onOpenBantuAnnouncement: (teacher: User) => void;
  onOpenBantuSoal: (teacher: User) => void;
  loading: boolean;
}

export const AdminManagedTeachersTab: React.FC<AdminManagedTeachersTabProps> = ({
  currentUser,
  managedTeachers = [],
  allTeachers = [],
  classesList = [],
  onAddTeacherByCode,
  onRemoveTeacher,
  onOpenBantuAnnouncement,
  onOpenBantuSoal,
  loading,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const MAX_TEACHERS = 5;
  const isLimitReached = (managedTeachers?.length || 0) >= MAX_TEACHERS;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      setErrorMsg('Masukkan kode guru terlebih dahulu.');
      return;
    }
    if (isLimitReached) {
      setErrorMsg('Batas maksimal tercapai: Admin hanya dapat memegang akun maksimal 5 orang guru.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddTeacherByCode(codeInput.trim());
      setCodeInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan guru');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate 5 slot items (filled + empty placeholders)
  const slots = Array.from({ length: MAX_TEACHERS }).map((_, index) => {
    const teacher = managedTeachers[index] || null;
    return { slotNumber: index + 1, teacher };
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-mono text-[11px] font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sistem Bimbingan & Dampingan Guru
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black tracking-wide uppercase">
              Maksimal 5 Guru per Admin
            </span>
          </div>
          <h3 className="text-xl font-black mt-2">Dampingi & Kelola Akun Guru Binaan</h3>
          <p className="text-xs text-purple-100 mt-1 max-w-2xl leading-relaxed">
            Admin dapat menginput kode guru untuk memegang akun guru binaan (maksimal 5 akun guru).
            Melalui wewenang ini, Admin dapat membantu guru membuat pengumuman, menerbitkan soal dan
            tugas pembelajaran, serta memantau progres kelas.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-2xl text-center min-w-[140px]">
          <span className="text-[11px] text-purple-200 uppercase tracking-wider font-bold block">
            Kapasitas Akun
          </span>
          <div className="text-3xl font-black text-white mt-0.5">
            {managedTeachers?.length || 0} <span className="text-base font-medium text-purple-200">/ 5</span>
          </div>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isLimitReached ? 'bg-rose-500/80 text-white' : 'bg-emerald-500/30 text-emerald-200'
            }`}
          >
            {isLimitReached ? 'Kapasitas Penuh (5/5)' : `${MAX_TEACHERS - (managedTeachers?.length || 0)} Slot Tersisa`}
          </span>
        </div>
      </div>

      {/* Input Kode Guru Form */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-600" />
              Input Kode Guru yang Akan Diadminkan
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan Kode Guru resmi (contoh: <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono">GURU-1004</code>) atau NIP guru untuk menambahkan akun guru ke binaan Anda.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Kapasitas Slot:{' '}
            <strong className="text-purple-700 font-bold">
              {managedTeachers?.length || 0} dari 5 Guru
            </strong>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled={isLimitReached || submitting}
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder={
                  isLimitReached
                    ? 'Batas maksimal 5 orang guru telah tercapai. Lepaskan guru terlebih dahulu.'
                    : 'Ketik Kode Guru / NIP (contoh: GURU-1004 atau 198204122008011004)...'
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs uppercase tracking-wider focus:outline-none focus:border-purple-600 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLimitReached || submitting || !codeInput.trim()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Memeriksa Kode...' : '+ Adminkan Guru Ini'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLimitReached && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Batas Maksimal 5 Guru Tercapai:</strong> Admin saat ini telah memegang batas maksimum 5 akun guru. Jika ingin mengadminkan guru baru, klik &quot;Lepas Binaan&quot; pada salah satu kartu guru di bawah.
              </span>
            </div>
          )}
        </form>
      </div>

      {/* 5 Slots Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-slate-900 text-sm">
            5 Slot Akun Guru Binaan yang Dipegang
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            Slot 1 sampai 5 (Kapasitas Eksklusif Admin)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(({ slotNumber, teacher }) => {
            if (!teacher) {
              return (
                <div
                  key={`slot-empty-${slotNumber}`}
                  className="p-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center min-h-[220px] transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs mb-2">
                    #{slotNumber}
                  </div>
                  <span className="text-xs font-bold text-slate-500">Slot Guru Tersedia</span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Ketik kode guru pada form di atas untuk mengisi slot bimbingan ke-{slotNumber}.
                  </p>
                </div>
              );
            }

            const teacherClasses = classesList.filter((c) => c.teacherId === teacher.id);
            const teacherCode =
              teacher.teacherCode ||
              (teacher.nip ? `GURU-${teacher.nip.slice(-4)}` : `GURU-${teacher.id.slice(-4).toUpperCase()}`);

            return (
              <div
                key={teacher.id}
                className="p-5 bg-white rounded-3xl border border-purple-200 hover:border-purple-300 shadow-sm flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                      Slot #{slotNumber} Terisi
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(teacherCode)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                      title="Salin Kode Guru"
                    >
                      <KeyRound className="w-3 h-3 text-purple-600" />
                      <span>{teacherCode}</span>
                      {copiedCode === teacherCode ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex items-start gap-3 mt-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center shrink-0">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-900 text-sm truncate leading-snug">
                        {teacher.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 truncate">
                        NIP: {teacher.nip || '-'} • Mapel: {teacher.mataPelajaran || 'Umum'}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold">
                        <BookOpen className="w-3 h-3" />
                        <span>{teacherClasses?.length || 0} Kelas Aktif Diampu</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assistance Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Aksi Bantuan Admin:
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenBantuAnnouncement(teacher)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="Buat pengumuman atas nama guru ini"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Bantu Pengumuman</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenBantuSoal(teacher)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="Buat instrumen soal / tugas atas nama guru ini"
                    >
                      <FileQuestion className="w-3.5 h-3.5" />
                      <span>Bantu Buat Soal</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveTeacher(teacher.id, teacher.name)}
                    className="w-full py-1 text-rose-500 hover:bg-rose-50 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Lepas dari Binaan Admin</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory of System Teachers & Codes */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              Direktori Guru Terdaftar & Kode Akses ({allTeachers?.length || 0} Guru)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin dapat langsung menyalin kode guru atau mengklik tombol &quot;+ Adminkan&quot; untuk memasukkan guru ke daftar binaan.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Nama Guru</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">NIP</th>
                <th className="py-2.5 px-3">Kode Guru</th>
                <th className="py-2.5 px-3">Status Dikelola</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allTeachers.map((t) => {
                const isManaged = managedTeachers.some((m) => m.id === t.id);
                const code =
                  t.teacherCode ||
                  (t.nip ? `GURU-${t.nip.slice(-4)}` : `GURU-${t.id.slice(-4).toUpperCase()}`);

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center">
                        {t.name.charAt(0)}
                      </div>
                      <span>{t.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{t.mataPelajaran || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{t.nip || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isManaged ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Sedang Diadminkan
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Belum Diadminkan</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isManaged ? (
                        <button
                          type="button"
                          onClick={() => onRemoveTeacher(t.id, t.name)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Lepas
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLimitReached}
                          onClick={() => onAddTeacherByCode(code)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          + Adminkan
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
