import React, { useState } from 'react';
import { User, UserRole } from '../../types.js';
import { api } from '../../services/api.js';
import {
  GraduationCap,
  BookOpen,
  Shield,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Smartphone,
  Info,
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [activeRole, setActiveRole] = useState<UserRole>('siswa');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // Siswa
  const [kelas, setKelas] = useState('X MIPA 1');
  const [nomorAbsen, setNomorAbsen] = useState('01');
  // Guru
  const [nip, setNip] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('Biologi');
  // Admin
  const [adminCode, setAdminCode] = useState('ADM-2026');

  // Status & error handling
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUsernameSuggestions([]);
    setSuccessMessage(null);
    setLoading(true);

    const deviceName = `${navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Desktop'} Browser`;

    try {
      if (mode === 'login') {
        const res = await api.login(username, password, deviceName);
        onLoginSuccess(res.user, res.sessionToken);
      } else {
        // Register
        const res = await api.register({
          username,
          password,
          name,
          role: activeRole,
          kelas: activeRole === 'siswa' ? kelas : undefined,
          nomorAbsen: activeRole === 'siswa' ? nomorAbsen : undefined,
          nip: activeRole === 'guru' ? nip : undefined,
          mataPelajaran: activeRole === 'guru' ? mataPelajaran : undefined,
          adminCode: activeRole === 'admin' ? adminCode : undefined,
          deviceName,
        });
        setSuccessMessage('Akun berhasil dibuat! Otomatis mengarahkan ke dashboard...');
        setTimeout(() => {
          onLoginSuccess(res.user, res.sessionToken);
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
      if (err.suggestions && Array.isArray(err.suggestions)) {
        setUsernameSuggestions(err.suggestions);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative subtle gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        {/* Brand Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/25">
          B
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
          belajarin
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform Pembelajaran & Ujian Terintegrasi 1 Akun 1 Perangkat
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="bg-white py-7 px-6 sm:px-10 shadow-xl shadow-slate-200/70 rounded-3xl border border-slate-200/80">
          {/* Top Mode Toggle: Masuk vs Daftar */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              id="tab-mode-login"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setUsernameSuggestions([]);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk Akun (Login)
            </button>
            <button
              type="button"
              id="tab-mode-register"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setUsernameSuggestions([]);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Role selector for registration or context */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Peran Pengguna ({mode === 'login' ? 'Tipe Akun' : 'Daftar Sebagai'}):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="role-btn-siswa"
                onClick={() => setActiveRole('siswa')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeRole === 'siswa'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeRole === 'siswa' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs">Siswa</span>
              </button>

              <button
                type="button"
                id="role-btn-guru"
                onClick={() => setActiveRole('guru')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeRole === 'guru'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeRole === 'guru' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs">Guru</span>
              </button>

              <button
                type="button"
                id="role-btn-admin"
                onClick={() => setActiveRole('admin')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeRole === 'admin'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs">Admin</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    activeRole === 'siswa'
                      ? 'contoh: Ahmad Fauzan'
                      : activeRole === 'guru'
                        ? 'contoh: Dr. Budi Santoso, M.Pd'
                        : 'contoh: Administrator Sekolah'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            {/* Siswa Registration Specific Fields */}
            {mode === 'register' && activeRole === 'siswa' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-kelas"
                    required
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="X MIPA 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Absen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="input-absen"
                    required
                    value={nomorAbsen}
                    onChange={(e) => setNomorAbsen(e.target.value)}
                    placeholder="05"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Guru Registration Specific Fields */}
            {mode === 'register' && activeRole === 'guru' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Guru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-nip"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19850412..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-mapel"
                    required
                    value={mataPelajaran}
                    onChange={(e) => setMataPelajaran(e.target.value)}
                    placeholder="Biologi / Fisika / dll"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Admin Registration Specific Fields */}
            {mode === 'register' && activeRole === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Otoritas Admin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-admin-code"
                  required
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="ADM-2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="input-username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Username conflict suggestions */}
              {usernameSuggestions.length > 0 && (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <div className="font-semibold text-amber-800 flex items-center gap-1 mb-1">
                    <Info className="w-3.5 h-3.5" />
                    Saran Username Unik yang Tersedia:
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {usernameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setUsername(sug);
                          setUsernameSuggestions([]);
                        }}
                        className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  id="input-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Error and Success Alerts */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              id="btn-auth-submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Memproses...'
              ) : mode === 'login' ? (
                <>
                  <span>Masuk ke Belajarin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Daftarkan Akun Sekarang</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security feature note */}
          <div className="mt-6 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-100">
            <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Proteksi 1 Akun 1 Perangkat:</strong> Login baru pada gawai lain otomatis
              mengeluarkan akun dari perangkat sebelumnya.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
