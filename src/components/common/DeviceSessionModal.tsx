import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';

interface DeviceSessionModalProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
}

export const DeviceSessionModal: React.FC<DeviceSessionModalProps> = ({
  isOpen,
  message,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Sesi Perangkat Telah Berakhir
        </h3>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {message ||
            'Akun Anda terdeteksi baru saja login di perangkat lain. Sesuai aturan keamanan 1 Akun 1 Perangkat, sesi pada browser ini telah dinonaktifkan secara otomatis.'}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
};
