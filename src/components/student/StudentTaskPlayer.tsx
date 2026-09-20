import React, { useState, useEffect, useRef } from 'react';
import {
  LearningTask,
  Question,
  StudentAnswer,
  CheatingIncident,
  User,
} from '../../types.js';
import { api } from '../../services/api.js';
import { AnswerPhotoCapture } from '../camera/AnswerPhotoCapture.js';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ShieldAlert,
  HelpCircle,
  X,
} from 'lucide-react';

interface StudentTaskPlayerProps {
  task: LearningTask;
  currentUser: User;
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export const StudentTaskPlayer: React.FC<StudentTaskPlayerProps> = ({
  task,
  currentUser,
  onBack,
  onSubmitSuccess,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [cheatingLog, setCheatingLog] = useState<CheatingIncident[]>([]);

  // Cheating detector states
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [lastViolation, setLastViolation] = useState<{ qNum: number; duration: number } | null>(null);
  const leaveTimeRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const questions = task?.questions || [];
  const currentQ: Question | undefined = questions[currentIdx];

  // Check deadline
  const isDeadlinePassed = task?.deadline ? new Date().getTime() > new Date(task.deadline).getTime() : false;

  // ----------------------------------------------------
  // Cheating Detection (Visibility Change & Blur)
  // ----------------------------------------------------
  useEffect(() => {
    const handleLeave = () => {
      if (isSubmittingRef.current || isDeadlinePassed) return;
      if (leaveTimeRef.current === null) {
        leaveTimeRef.current = Date.now();
      }
    };

    const handleReturn = () => {
      if (isSubmittingRef.current || isDeadlinePassed) return;
      if (leaveTimeRef.current !== null) {
        const durationSec = Math.max(1, Math.round((Date.now() - leaveTimeRef.current) / 1000));
        leaveTimeRef.current = null;

        const currentQNum = questions[currentIdx]?.questionNumber || currentIdx + 1;
        const incident: CheatingIncident = {
          questionNumber: currentQNum,
          durationSeconds: durationSec,
          timestamp: new Date().toISOString(),
        };

        setCheatingLog((prev) => [...prev, incident]);
        setLastViolation({ qNum: currentQNum, duration: durationSec });
        setShowCheatWarning(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLeave();
      } else {
        handleReturn();
      }
    };

    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentIdx, questions, isDeadlinePassed]);

  // Answer updater helpers
  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        selectedOption: optionId,
        essayText: prev[currentQ.id]?.essayText || '',
        photoUrl: prev[currentQ.id]?.photoUrl,
      },
    }));
  };

  const handleEssayChange = (text: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        selectedOption: prev[currentQ.id]?.selectedOption,
        essayText: text,
        photoUrl: prev[currentQ.id]?.photoUrl,
      },
    }));
  };

  const handlePhotoSaved = (photoUrl: string | undefined) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        selectedOption: prev[currentQ.id]?.selectedOption,
        essayText: prev[currentQ.id]?.essayText || '',
        photoUrl: photoUrl,
      },
    }));
  };

  // Check if a question is answered
  const isQuestionAnswered = (q: Question) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'multiple_choice') {
      return Boolean(ans.selectedOption || ans.photoUrl);
    }
    return Boolean((ans.essayText && ans.essayText.trim().length > 0) || ans.photoUrl);
  };

  const answeredCount = questions.filter(isQuestionAnswered).length;

  // Final Submit
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    isSubmittingRef.current = true;
    setErrorMessage(null);

    try {
      await api.createSubmission({
        taskId: task.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentAbsen: currentUser.nomorAbsen || '0',
        studentClass: currentUser.kelas || task.className || 'Umum',
        answers: answers,
        cheatingIncidents: cheatingLog,
      });

      setIsSubmitModalOpen(false);
      onSubmitSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirimkan lembar ujian');
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (isDeadlinePassed) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-xl">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Tenggat Waktu Pengerjaan Berakhir</h2>
          <p className="text-sm text-slate-600 mt-2">
            Tugas &ldquo;{task.title}&rdquo; telah melewati batas tenggat pada{' '}
            {new Date(task.deadline).toLocaleString('id-ID')}. Sesuai peraturan, Anda tidak dapat
            lagi mengerjakan atau mengumpulkan tugas ini.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl cursor-pointer"
            >
              Kembali ke Beranda Tugas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 pb-12">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {task.type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">{task.topicBab}</span>
              </div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                {task.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cheating badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                (cheatingLog?.length || 0) > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>
                {(cheatingLog?.length || 0) > 0
                  ? `${cheatingLog.length}x Pindah Layar`
                  : 'Sistem Integritas Aktif'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              id="btn-open-submit-modal"
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Selesai & Kumpulkan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left / Top: Question Slider & Card (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* LKPD Material Instructions Accordion if available */}
          {task.materialContent && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wider mb-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Instruksi Pembelajaran / LKPD</span>
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {task.materialContent}
              </div>
            </div>
          )}

          {/* Active Question Card */}
          {currentQ ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/50 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                    {currentQ.questionNumber}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Soal No. {currentQ?.questionNumber || (currentIdx + 1)} dari {questions?.length || 0}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tipe: {currentQ?.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Esai'} •{' '}
                      {currentQ?.points || 0} Poin
                    </span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  {isQuestionAnswered(currentQ) ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Sudah Dijawab
                    </span>
                  ) : (
                    <span className="text-slate-400">Belum Dijawab</span>
                  )}
                </div>
              </div>

              {/* Question Prompt */}
              <div className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed mb-6">
                {currentQ.prompt}
              </div>

              {/* Question Image if uploaded by teacher */}
              {currentQ.imageUrl && (
                <div className="mb-6 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center">
                  <img
                    src={currentQ.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-72 rounded-xl object-contain"
                  />
                </div>
              )}

              {/* Multiple Choice Options */}
              {currentQ.type === 'multiple_choice' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id]?.selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        id={`btn-opt-${currentQ.questionNumber}-${opt.id}`}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium leading-snug">{opt.text}</span>
                          {/* Image Option */}
                          {opt.imageUrl && (
                            <div className="mt-2">
                              <img
                                src={opt.imageUrl}
                                alt={`Pilihan ${opt.id}`}
                                className="max-h-36 rounded-lg object-contain border border-slate-200"
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Essay Input */}
              {currentQ.type === 'essay' && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tuliskan Jawaban Anda:
                  </label>
                  <textarea
                    rows={5}
                    id={`textarea-essay-${currentQ.questionNumber}`}
                    value={answers[currentQ.id]?.essayText || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    placeholder="Ketik jawaban esai Anda di sini..."
                    className="w-full p-4 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all leading-relaxed"
                  />
                </div>
              )}

              {/* Per-Question Isolated Camera Photo Capture (Req 9, 19, 20, 26) */}
              <AnswerPhotoCapture
                questionNumber={currentQ.questionNumber}
                currentPhotoUrl={answers[currentQ.id]?.photoUrl}
                onPhotoSaved={handlePhotoSaved}
              />

              {/* Bottom Carousel / Slider Step Controls */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  id="btn-prev-question"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Soal Sebelumnya
                </button>

                <div className="text-xs text-slate-400 font-semibold hidden sm:block">
                  {currentIdx + 1} dari {questions.length} Soal
                </div>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    id="btn-next-question"
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    Soal Berikutnya
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-review-submit"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    Kumpulkan Tugas
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-3xl text-center text-slate-400">
              Tidak ada soal dalam tugas ini.
            </div>
          )}
        </div>

        {/* Right Sidebar: Number Grid Navigation (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md shadow-slate-200/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Navigasi Nomor Soal
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Klik nomor untuk langsung berpindah soal.
            </p>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const answered = isQuestionAnswered(q);
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    id={`nav-q-${q.questionNumber}`}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600 text-white shadow-sm'
                        : answered
                          ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-600 ring-1 ring-indigo-600" />
                <span>Sedang Dikerjakan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300" />
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                <span>Belum Dijawab ({questions.length - answeredCount})</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Kumpulkan Jawaban
              </button>
            </div>
          </div>

          {/* Integrity info box */}
          <div className="p-4 bg-slate-100 rounded-2xl text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Catatan Integritas Ujian:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Sistem mencatat setiap perpindahan tab, minimize jendela, atau aplikasi lain. Waktu
              dan nomor soal saat terjadi pelanggaran akan dilaporkan kepada guru.
            </p>
          </div>
        </div>
      </div>

      {/* Cheating Warning Popup Modal */}
      {showCheatWarning && lastViolation && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-400 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Peringatan Integritas Browser!
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Terdeteksi meninggalkan halaman pengerjaan pada{' '}
              <strong>Soal No. {lastViolation.qNum}</strong> selama{' '}
              <strong>{lastViolation.duration} detik</strong>.
            </p>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">
              Catatan pelanggaran ini telah disimpan dan akan ditampilkan pada hasil akhir guru.
            </p>

            <div className="mt-5">
              <button
                type="button"
                id="btn-dismiss-cheat-warning"
                onClick={() => setShowCheatWarning(false)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Saya Mengerti & Lanjutkan Mengerjakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Konfirmasi Pengumpulan Tugas</h3>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-700">
                  <span>Total Soal:</span>
                  <span className="font-bold">{questions.length} nomor</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Sudah Dijawab:</span>
                  <span className="font-bold">{answeredCount} nomor</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Belum Dijawab:</span>
                  <span className="font-bold">{questions.length - answeredCount} nomor</span>
                </div>
              </div>

              {(cheatingLog?.length || 0) > 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Perhatian: Log Kecurangan Terdeteksi!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sistem mendeteksi {cheatingLog?.length || 0} kali Anda keluar dari layar ujian.
                    Rincian nomor soal dan durasi akan disertakan dalam lembar pengumpulan.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tidak terdeteksi pelanggaran perpindahan layar.</span>
                </div>
              )}

              {questions.length - answeredCount > 0 && (
                <p className="text-amber-600 text-[11px] font-medium">
                  Masih terdapat {questions.length - answeredCount} soal yang belum Anda jawab. Anda
                  tetap yakin ingin mengumpulkan sekarang?
                </p>
              )}

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                id="btn-confirm-final-submit"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Mengirimkan...' : 'Ya, Kumpulkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
