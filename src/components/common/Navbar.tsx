import React, { useState, useEffect } from 'react';
import { User, SystemAnnouncement } from '../../types.js';
import {
  GraduationCap,
  Shield,
  BookOpen,
  UserCheck,
  LogOut,
  Bell,
  Smartphone,
  CheckCircle2,
  X,
  AlertCircle,
  Megaphone,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  announcements?: SystemAnnouncement[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  announcements = [],
}) => {
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('belajarin_read_announcements_' + currentUser.id);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate unread count based on announcements not yet marked read
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const unreadCount = safeAnnouncements.filter((a) => !readIds.includes(a.id)).length;

  const handleOpenBell = () => {
    setShowAnnounceModal(true);
    // As per user requirement: apabila lonceng siswa sudah dibuka merah2 atau tandanya akan hilang
    const allIds = safeAnnouncements.map((a) => a.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem('belajarin_read_announcements_' + currentUser.id, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    window.dispatchEvent(new CustomEvent('belajarin_announcements_read', { detail: { readIds: updated } }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'siswa':
        return {
          label: 'Siswa',
          icon: <BookOpen className="w-3.5 h-3.5" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
        };
      case 'guru':
        return {
          label: 'Guru Pengampu',
          icon: <GraduationCap className="w-3.5 h-3.5" />,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
        };
      case 'admin':
        return {
          label: 'Administrator',
          icon: <Shield className="w-3.5 h-3.5" />,
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
      default:
        return {
          label: role,
          icon: <UserCheck className="w-3.5 h-3.5" />,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20 tracking-tight">
            B
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
              belajarin
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              LMS & Ujian Integritas
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Device protection indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-700 text-xs font-medium">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>1 Akun 1 Device Aktif</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          </div>

          {/* Announcement bell with red indicator */}
          <button
            type="button"
            id="navbar-bell-button"
            onClick={handleOpenBell}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              unreadCount > 0
                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
            }`}
            title={unreadCount > 0 ? `${unreadCount} pengumuman baru` : 'Pengumuman'}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
              </span>
            )}
          </button>

          {/* User Profile info */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-medium ${badge.color}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
                {currentUser.kelas && (
                  <span className="font-semibold text-slate-600">({currentUser.kelas})</span>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-logout"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Announcements Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">
                    Pengumuman & Informasi Sekolah
                  </h4>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Pemberitahuan dari guru pengampu & pihak sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnounceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {safeAnnouncements.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Tidak ada pengumuman baru</p>
                  <p className="text-[11px] text-slate-400">
                    Pengumuman dari guru atau sekolah akan muncul di sini.
                  </p>
                </div>
              ) : (
                safeAnnouncements.map((ann) => {
                  const isTeacher = ann.senderRole === 'guru';
                  return (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        ann.priority === 'penting'
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              isTeacher
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {isTeacher ? 'GURU PENGAMPU' : 'ADMIN SEKOLAH'}
                          </span>
                          {ann.targetClassName && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {ann.targetClassName}
                            </span>
                          )}
                          {ann.priority === 'penting' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" />
                              Penting
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <h5 className="font-extrabold text-sm text-slate-800">{ann.title}</h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Pengirim: <strong className="text-slate-700">{ann.senderName}</strong></span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Telah Dibaca
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {safeAnnouncements.length} pengumuman tersimpan
              </span>
              <button
                type="button"
                onClick={() => setShowAnnounceModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
