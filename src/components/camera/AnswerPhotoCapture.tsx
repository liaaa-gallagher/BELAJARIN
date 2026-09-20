import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, RefreshCw, X, Eye } from 'lucide-react';

interface AnswerPhotoCaptureProps {
  questionNumber: number;
  currentPhotoUrl?: string;
  onPhotoSaved: (photoUrl: string | undefined) => void;
  readOnly?: boolean;
}

export const AnswerPhotoCapture: React.FC<AnswerPhotoCaptureProps> = ({
  questionNumber,
  currentPhotoUrl,
  onPhotoSaved,
  readOnly = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start live camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung oleh browser Anda.');
      }

      // Try environment/back camera first, fallback to any video
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
      setIsCameraOpen(true);
    }
  };

  // Attach stream to video element when stream or isCameraOpen changes
  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [isCameraOpen, stream]);

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Capture frame from video
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Compress to high quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onPhotoSaved(dataUrl);
      stopCamera();
    }
  };

  // File upload handler (from gallery / file manager)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onPhotoSaved(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    onPhotoSaved(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">
            Lampiran Foto Jawaban (Soal No. {questionNumber})
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Gunakan kamera untuk memfoto catatan/tulisan tangan Anda atau unggah file foto.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id={`btn-open-cam-${questionNumber}`}
              onClick={startCamera}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Buka Kamera
            </button>

            <button
              type="button"
              id={`btn-upload-file-${questionNumber}`}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              Pilih File
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Photo Preview Container */}
      {currentPhotoUrl ? (
        <div className="mt-3 flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
          <div className="relative group w-16 h-16 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img
              src={currentPhotoUrl}
              alt={`Jawaban Soal ${questionNumber}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Perbesar Foto"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Foto jawaban tersimpan untuk soal ini
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Hanya berlaku untuk nomor {questionNumber}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              Lihat
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={removePhoto}
                className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Hapus Foto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-400 italic bg-white/70 rounded-lg p-2.5 border border-dashed border-slate-200 text-center">
          Belum ada foto yang dilampirkan untuk soal ini.
        </div>
      )}

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h4 className="font-semibold text-slate-800 text-sm">
                  Kamera Aktif: Foto Jawaban No. {questionNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[420px] overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-white max-w-xs">
                  <p className="text-sm font-medium text-rose-400 mb-3">{cameraError}</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Anda juga dapat memilih tombol &ldquo;Pilih File&rdquo; untuk mengunggah foto dari penyimpanan.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                  {/* Viewfinder crosshairs */}
                  <div className="absolute inset-8 border border-white/40 rounded-xl pointer-events-none" />
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>

              {!cameraError && (
                <button
                  type="button"
                  id={`btn-capture-photo-${questionNumber}`}
                  onClick={capturePhoto}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Ambil Foto Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {isPreviewModalOpen && currentPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 text-sm">
                Detail Foto Jawaban (Soal No. {questionNumber})
              </h4>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={currentPhotoUrl}
                alt="Foto Jawaban Full"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
