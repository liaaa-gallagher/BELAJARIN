import React, { useState, useEffect } from 'react';
import { User, ClassRoom } from '../../types.js';
import { api } from '../../services/api.js';
import { Megaphone, AlertCircle, Bell, Sparkles, GraduationCap, Shield } from 'lucide-react';

interface AdminBantuPengumumanModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: User;
  teachersList: User[];
  classesList: ClassRoom[];
  initialTeacherId?: string;
  onSuccess: (msg: string) => void;
}

export const AdminBantuPengumumanModal: React.FC<AdminBantuPengumumanModalProps> = ({
  isOpen,
  onClose,
  adminUser,
  teachersList = [],
  classesList = [],
  initialTeacherId,
  onSuccess,
}) => {
  const [senderMode, setSenderMode] = useState<'guru' | 'admin'>('guru');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'penting'>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTeacherId) {
      setSenderMode('guru');
      setSelectedTeacherId(initialTeacherId);
    } else if ((teachersList?.length || 0) > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachersList[0].id);
    }
  }, [initialTeacherId, teachersList]);

  if (!isOpen) return null;

  const currentTeacher = (teachersList || []).find((t) => t.id === selectedTeacherId);
  const teacherClasses = (classesList || []).filter(
    (c) => senderMode === 'admin' || c.teacherId === selectedTeacherId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Judul dan isi pengumuman wajib diisi!');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetClass = (classesList || []).find((c) => c.id === selectedClassId);

      const senderName =
        senderMode === 'guru' && currentTeacher
          ? currentTeacher.name
          : `${adminUser.name} (Admin Sekolah)`;
      const senderId =
        senderMode === 'guru' && currentTeacher ? currentTeacher.id : adminUser.id;
      const senderRole = senderMode === 'guru' ? 'guru' : 'admin';

      await api.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        senderRole,
        senderName,
        senderId,
        targetRole: 'siswa',
        targetClassId: selectedClassId !== 'all' ? selectedClassId : undefined,
        targetClassName: targetClass ? targetClass.name : undefined,
        priority,
      });

      onSuccess(
        `Pengumuman atas nama ${senderName} berhasil disiarkan${
          targetClass ? ` ke kelas ${targetClass.name}` : ' ke semua siswa'
        }!`
      );
      onClose();
      setTitle('');
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Gagal menyiarkan pengumuman');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5" />
              Bantuan Guru • Siaran Pengumuman
            </span>
            <h4 className="font-bold text-base text-slate-800">
              Bantu Guru Membuat Pengumuman Siswa
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Pengirim */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Siarkan Pengumuman Atas Nama:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSenderMode('guru')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  senderMode === 'guru'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <div className="text-xs">Guru Pengampu</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Mewakili akun guru binaan
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSenderMode('admin')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  senderMode === 'admin'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-xs">Admin Sekolah</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pengumuman resmi institusi
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Pilih Guru jika mode guru */}
          {senderMode === 'guru' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pilih Guru yang Dibantu:
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setSelectedClassId('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                required
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Kode: {t.teacherCode || t.nip || t.id}) • {t.mataPelajaran || 'Umum'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sasaran Kelas */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Penerima Pengumuman:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
            >
              <option value="all">📢 Seluruh Siswa (Siaran Luas)</option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas: {c.name} ({c.subject} - Guru: {c.teacherName})
                </option>
              ))}
            </select>
          </div>

          {/* Prioritas & Judul */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Judul Pengumuman:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="contoh: Jadwal Pengumpulan Tugas Portofolio"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prioritas:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="normal">Normal</option>
                <option value="penting">🚨 PENTING</option>
              </select>
            </div>
          </div>

          {/* Isi Pengumuman */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Isi Lengkap Pengumuman:</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan isi pengumuman untuk siswa..."
              className="w-full p-3 rounded-xl border border-slate-300 font-medium"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{loading ? 'Menyiarkan...' : 'Siarkan Pengumuman'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
