import React, { useState, useEffect } from 'react';
import { User, ClassRoom, Question, TaskType } from '../../types.js';
import { api } from '../../services/api.js';
import {
  FileQuestion,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  GraduationCap,
} from 'lucide-react';

interface AdminBantuSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachersList: User[];
  classesList: ClassRoom[];
  initialTeacherId?: string;
  onSuccess: (msg: string) => void;
}

export const AdminBantuSoalModal: React.FC<AdminBantuSoalModalProps> = ({
  isOpen,
  onClose,
  teachersList = [],
  classesList = [],
  initialTeacherId,
  onSuccess,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [topicBab, setTopicBab] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('evaluasi');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [deadline, setDeadline] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    } else if ((teachersList?.length || 0) > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachersList[0].id);
    }
  }, [initialTeacherId, teachersList]);

  // Set default deadline (3 days from now)
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDeadline(d.toISOString().slice(0, 16));
  }, []);

  // Update selected class when teacher changes
  useEffect(() => {
    const availableClasses = (classesList || []).filter(
      (c) => !selectedTeacherId || c.teacherId === selectedTeacherId
    );
    if ((availableClasses?.length || 0) > 0) {
      setSelectedClassId(availableClasses[0].id);
    } else if ((classesList?.length || 0) > 0) {
      setSelectedClassId(classesList[0].id);
    }
  }, [selectedTeacherId, classesList]);

  if (!isOpen) return null;

  const currentTeacher = (teachersList || []).find((t) => t.id === selectedTeacherId);
  const availableClasses = (classesList || []).filter(
    (c) => !selectedTeacherId || c.teacherId === selectedTeacherId
  );
  const currentClass = (classesList || []).find((c) => c.id === selectedClassId);

  const handleAddMultipleChoice = () => {
    const qNum = (questions?.length || 0) + 1;
    const newQ: Question = {
      id: 'q-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      questionNumber: qNum,
      type: 'multiple_choice',
      prompt: `Pertanyaan Pilihan Ganda No. ${qNum}...`,
      options: [
        { id: 'A', text: 'Opsi Jawaban A' },
        { id: 'B', text: 'Opsi Jawaban B' },
        { id: 'C', text: 'Opsi Jawaban C' },
        { id: 'D', text: 'Opsi Jawaban D' },
      ],
      correctAnswer: 'A',
      points: 20,
    };
    setQuestions([...questions, newQ]);
  };

  const handleAddEssay = () => {
    const qNum = (questions?.length || 0) + 1;
    const newQ: Question = {
      id: 'q-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      questionNumber: qNum,
      type: 'essay',
      prompt: `Jelaskan secara mendalam tentang... (Soal Esai No. ${qNum})`,
      rubricNotes: 'Kriteria penilaian: Siswa mampu menjabarkan konsep dasar dan contoh konkret.',
      points: 40,
    };
    setQuestions([...(questions || []), newQ]);
  };

  const handleRemoveQuestion = (id: string) => {
    const filtered = (questions || []).filter((q) => q.id !== id);
    const renumbered = filtered.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    setQuestions(renumbered);
  };

  const handleLoadSampleQuestions = () => {
    const subject = currentClass?.subject || currentTeacher?.mataPelajaran || 'Biologi & Sains';
    const samples: Question[] = [
      {
        id: 'q-s-1',
        questionNumber: 1,
        type: 'multiple_choice',
        prompt: `Organel sel yang berfungsi sebagai pusat pembentukan energi (ATP) melalui proses respirasi seluler adalah...`,
        options: [
          { id: 'A', text: 'Mitokondria' },
          { id: 'B', text: 'Ribosom' },
          { id: 'C', text: 'Badan Golgi' },
          { id: 'D', text: 'Lisosom' },
        ],
        correctAnswer: 'A',
        points: 30,
      },
      {
        id: 'q-s-2',
        questionNumber: 2,
        type: 'multiple_choice',
        prompt: `Peristiwa perpindahan molekul pelarut (seperti air) melewati membran semipermeabel dari larutan berkonsentrasi rendah ke pekat disebut...`,
        options: [
          { id: 'A', text: 'Difusi Terfasilitasi' },
          { id: 'B', text: 'Osmosis' },
          { id: 'C', text: 'Endositosis' },
          { id: 'D', text: 'Transpor Aktif' },
        ],
        correctAnswer: 'B',
        points: 30,
      },
      {
        id: 'q-s-3',
        questionNumber: 3,
        type: 'essay',
        prompt: `Jelaskan perbedaan mendasar antara sel tumbuhan dan sel hewan disertai dengan minimal 3 organel pembeda beserta fungsinya!`,
        rubricNotes:
          'Kunci: Dinding sel (bentuk tetap), kloroplas (fotosintesis), vakuola sentral besar, lisosom (hewan), sentriol (hewan).',
        points: 40,
      },
    ];
    setQuestions(samples);
    setTaskTitle(`Evaluasi Kompetensi: ${subject}`);
    setTopicBab('Bab 1: Struktur & Fungsi Sel Organisme');
    setDescription(
      'Ujian pemahaman konsep materi sel untuk mengukur capaian belajar siswa secara komprehensif.'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError('Pilih kelas tujuan terlebih dahulu.');
      return;
    }
    if (!taskTitle.trim() || !topicBab.trim()) {
      setError('Judul tugas dan bab/topik wajib diisi.');
      return;
    }
    if ((questions?.length || 0) === 0) {
      setError('Wajib menambahkan minimal 1 butir soal (Pilihan Ganda atau Esai).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetClass = (classesList || []).find((c) => c.id === selectedClassId);
      const teacher = (teachersList || []).find((t) => t.id === selectedTeacherId);

      const totalPoints = (questions || []).reduce((sum, q) => sum + (q.points || 0), 0);

      await api.createTask({
        classId: selectedClassId,
        className: targetClass?.name,
        subject: targetClass?.subject || teacher?.mataPelajaran || 'Umum',
        title: taskTitle.trim(),
        topicBab: topicBab.trim(),
        description: description.trim(),
        type: taskType,
        teacherId: teacher?.id || targetClass?.teacherId,
        teacherName: teacher?.name || targetClass?.teacherName,
        questions,
        totalPoints,
        deadline: new Date(deadline).toISOString(),
        durationMinutes: Number(durationMinutes),
        publishDate: new Date().toISOString(),
      });

      onSuccess(
        `Tugas/Soal "${taskTitle}" atas nama Guru [${
          teacher?.name || 'Pengampu'
        }] berhasil diterbitkan di kelas ${targetClass?.name || ''} dan disimpan di Bank Soal!`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat tugas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5" />
              Bantuan Guru • Pembuat Soal & Bank Soal
            </span>
            <h4 className="font-bold text-base text-slate-800">
              Bantu Guru Membuat Soal & Tugas Pembelajaran
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

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Teacher & Class Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Guru Pengampu yang Dibantu:
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                required
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Kode: {t.teacherCode || t.nip || t.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kelas Tujuan:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                required
              >
                {(availableClasses?.length || 0) === 0 ? (
                  <option value="">(Guru ini belum memiliki kelas - buat kelas dulu)</option>
                ) : (
                  availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subject} - Passkey: {c.passkey})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Task Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Judul Tugas / Soal:</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="contoh: Evaluasi Bab 2: Struktur Jaringan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipe Instrumen:</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="evaluasi">Evaluasi / Ulangan Harian</option>
                <option value="bank_soal">Bank Soal Interaktif</option>
                <option value="lkpd">LKPD Terstruktur</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Topik / Bab Materi:</label>
              <input
                type="text"
                required
                value={topicBab}
                onChange={(e) => setTopicBab(e.target.value)}
                placeholder="contoh: Bab 2: Jaringan Tumbuhan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Durasi Pengerjaan (Menit):</label>
              <input
                type="number"
                min="5"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Batas Waktu (Deadline):</label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Petunjuk Pengerjaan:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruksi untuk siswa saat mengerjakan tugas..."
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          {/* Question Builder Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h5 className="font-bold text-slate-900 text-xs">
                  Daftar Butir Soal ({questions?.length || 0} Butir • Total{' '}
                  {(questions || []).reduce((sum, q) => sum + (q.points || 0), 0)} Poin)
                </h5>
                <span className="text-[11px] text-slate-500">
                  Buat soal pilihan ganda atau esai yang langsung tersinkron ke siswa & bank soal guru.
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadSampleQuestions}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1 border border-amber-200 cursor-pointer"
                  title="Otomatis masukkan 3 butir soal standar biologi/sains"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Muat 3 Contoh Soal</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Pilihan Ganda</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center gap-1 border border-purple-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Esai / Uraian</span>
                </button>
              </div>
            </div>

            {(questions?.length || 0) === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <FileQuestion className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p className="font-semibold text-xs text-slate-600">Belum ada butir soal dibuat</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik tombol &quot;+ Pilihan Ganda&quot;, &quot;+ Esai&quot;, atau gunakan &quot;⚡ Muat 3 Contoh Soal&quot; untuk memulai.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10px]">
                          NO. {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs uppercase">
                          {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Uraian / Esai'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500 font-semibold">Bobot:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.points}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].points = Number(e.target.value);
                              setQuestions(updated);
                            }}
                            className="w-14 px-2 py-0.5 rounded border border-slate-300 font-bold text-center bg-white"
                          />
                          <span className="text-[11px] text-slate-500">Poin</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          title="Hapus soal ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].prompt = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="Tuliskan teks pertanyaan soal..."
                        className="w-full p-2 bg-white rounded-xl border border-slate-200 font-medium text-xs"
                      />
                    </div>

                    {/* If multiple choice: options and correct answer */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...questions];
                                updated[idx].correctAnswer = opt.id;
                                setQuestions(updated);
                              }}
                              className={`w-6 h-6 rounded font-black text-xs cursor-pointer ${
                                q.correctAnswer === opt.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={`Pilih ${opt.id} sebagai kunci jawaban benar`}
                            >
                              {opt.id}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updated = [...questions];
                                if (updated[idx].options) {
                                  updated[idx].options![optIdx].text = e.target.value;
                                  setQuestions(updated);
                                }
                              }}
                              className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* If essay: rubric notes */}
                    {q.type === 'essay' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Rubrik / Panduan Jawaban Guru:
                        </label>
                        <input
                          type="text"
                          value={q.rubricNotes || ''}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].rubricNotes = e.target.value;
                            setQuestions(updated);
                          }}
                          placeholder="Kata kunci yang diharapkan..."
                          className="w-full px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              disabled={loading || (questions?.length || 0) === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Menerbitkan...' : 'Terbitkan Soal & Simpan ke Bank Soal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
