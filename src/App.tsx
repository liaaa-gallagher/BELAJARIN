/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, SystemAnnouncement } from './types.js';
import { api } from './services/api.js';
import { AuthPage } from './components/auth/AuthPage.js';
import { Navbar } from './components/common/Navbar.js';
import { DeviceSessionModal } from './components/common/DeviceSessionModal.js';
import { StudentDashboard } from './components/student/StudentDashboard.js';
import { TeacherDashboard } from './components/teacher/TeacherDashboard.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('belajarin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('belajarin_token');
  });

  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Periodic 1-Account-1-Device Verification (Req 5: jika login dari device berbeda salah satunya harus terlogout otomatis)
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const checkSession = async () => {
      try {
        const res = await api.verifySession(currentUser.id, sessionToken);
        if (!res.valid) {
          setSessionExpiredMessage(
            res.message ||
              'Akun Anda terdeteksi login pada perangkat lain. Sesi pada perangkat ini telah dihentikan secara otomatis.'
          );
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
    };

    // Check immediately and poll every 8 seconds
    checkSession();
    const interval = setInterval(checkSession, 8000);
    return () => clearInterval(interval);
  }, [currentUser, sessionToken]);

  // Load announcements for top navbar & dashboards with periodic polling
  const refreshAnnouncements = useCallback(() => {
    if (!currentUser) return;
    api
      .getAnnouncements()
      .then((data) => {
        // Filter announcements targeted to user role or all
        const list = Array.isArray(data) ? data : [];
        const relevant = list.filter(
          (a) => a && (a.targetRole === 'all' || a.targetRole === currentUser.role)
        );
        setAnnouncements(relevant);
      })
      .catch((err) => console.error(err));
  }, [currentUser]);

  useEffect(() => {
    refreshAnnouncements();
    // Poll every 12 seconds so new announcements made by teachers appear automatically on students' bells
    const interval = setInterval(refreshAnnouncements, 12000);
    return () => clearInterval(interval);
  }, [refreshAnnouncements]);

  const handleLoginSuccess = useCallback((user: User, token: string) => {
    setCurrentUser(user);
    setSessionToken(token);
    localStorage.setItem('belajarin_user', JSON.stringify(user));
    localStorage.setItem('belajarin_token', token);
    setSessionExpiredMessage(null);
  }, []);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      try {
        await api.logout(currentUser.id);
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentUser(null);
    setSessionToken(null);
    localStorage.removeItem('belajarin_user');
    localStorage.removeItem('belajarin_token');
    setSessionExpiredMessage(null);
  }, [currentUser]);

  // Render Auth Page if not logged in
  if (!currentUser || !sessionToken) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-purple-100 selection:text-purple-900">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        announcements={announcements}
      />

      {/* Main Role-Based Dashboard View */}
      <div className="flex-1">
        {currentUser.role === 'siswa' && (
          <StudentDashboard currentUser={currentUser} announcements={announcements} />
        )}
        {currentUser.role === 'guru' && (
          <TeacherDashboard
            currentUser={currentUser}
            onAnnouncementCreated={refreshAnnouncements}
          />
        )}
        {currentUser.role === 'admin' && <AdminDashboard currentUser={currentUser} />}
      </div>

      {/* 1-Account-1-Device Invalidation Modal */}
      <DeviceSessionModal
        isOpen={Boolean(sessionExpiredMessage)}
        message={sessionExpiredMessage || undefined}
        onConfirm={handleLogout}
      />
    </div>
  );
}

