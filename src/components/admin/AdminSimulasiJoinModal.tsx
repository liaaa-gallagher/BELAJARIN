import React, { useState } from 'react';
import { ClassRoom, User } from '../../types.js';
import { api } from '../../services/api.js';
import { KeyRound, CheckCircle2, AlertCircle, Users, ArrowRight, ShieldCheck } from 'lucide-react';

interface AdminSimulasiJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassRoom | null;
  studentsList: User[];
  onJoinSuccess: () => void;
}

export const AdminSimulasiJoinModal: React.FC<AdminSimulasiJoinModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  studentsList = [],
  onJoinSuccess,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !targetClass) return null;

  const nonEnrolledStudents = (studentsList || []).filter(
    (s) => !(targetClass.studentIds || []).includes(s.id)
  );

  const handleExecuteJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setResult({ success: false, message: 'Silakan pilih siswa terlebih dahulu.' });
      return;
    }

    const key = (passkeyInput || targetClass.passkey).trim().toUpperCase();
    if (!key) {
      setResult({ success: false, message: 'Passkey kelas wajib diisi.' });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.joinClass(selectedStudentId, key);
      setResult({
        success: true,
        message: res.message || `Siswa berhasil bergabung ke kelas ${targetClass.name}!`,
      });
      onJoinSuccess();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Gagal menggabungkan siswa ke kelas.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Fitur Bergabung Kelas
            </span>
            <h4 className="font-bold text-base text-slate-800">
              Uji Coba & Gabung Siswa ke Kelas
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

        {/* Info Box */}
        <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-1">
          <div className="font-bold text-indigo-950 flex items-center justify-between">
            <span>Kelas: {targetClass.name}</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
              {targetClass.passkey}
            </span>
          </div>
          <p className="text-indigo-800 text-[11px]">
            Mata Pelajaran: {targetClass.subject} • Guru: {targetClass.teacherName}
          </p>
          <p className="text-slate-600 text-[11px] mt-1 pt-1 border-t border-indigo-100/60">
            Siswa dapat bergabung mandiri dari portal siswa menggunakan passkey di atas. Sebagai Admin, Anda dapat menguji alur bergabung atau mendaftarkan siswa secara langsung di bawah ini.
          </p>
        </div>

        <form onSubmit={handleExecuteJoin} className="py-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Pilih Siswa yang Akan Bergabung:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white"
              required
            >
              <option value="">-- Pilih Siswa Belum Terdaftar --</option>
              {(nonEnrolledStudents?.length || 0) === 0 ? (
                <option value="" disabled>
                  (Semua siswa sudah terdaftar di kelas ini)
                </option>
              ) : (
                nonEnrolledStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Absen: {s.nomorAbsen || '-'} • Kelas Asal: {s.kelas || '-'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Passkey Masuk Kelas (Otomatis Sesuai Kelas):
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={passkeyInput || targetClass.passkey}
                onChange={(e) => setPasskeyInput(e.target.value.toUpperCase())}
                placeholder="Passkey..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-indigo-200 bg-slate-50 font-mono font-bold uppercase tracking-wider text-indigo-900"
              />
            </div>
          </div>

          {result && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={loading || (nonEnrolledStudents?.length || 0) === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span>{loading ? 'Memproses...' : 'Gabungkan Siswa ke Kelas'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
