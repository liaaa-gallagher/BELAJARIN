import { jsPDF } from 'jspdf';
import { TaskSubmission, LearningTask } from '../../types.js';

export function exportSubmissionToPdf(submission: TaskSubmission, task?: LearningTask) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 16;
    }
  };

  // 1. Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(14, y, pageWidth - 28, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BELAJARIN - LEMBAR HASIL PEKERJAAN SISWA', pageWidth / 2, y + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Platform Pembelajaran & Integritas Ujian Cerdas', pageWidth / 2, y + 13, { align: 'center' });

  y += 24;

  // 2. Identity Card Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 32, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Informasi Siswa & Tugas:', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Left Column
  doc.text(`Nama Siswa   : ${submission.studentName}`, 18, y + 13);
  doc.text(`Kelas / Absen : ${submission.studentClass} / No. ${submission.studentAbsen}`, 18, y + 19);
  doc.text(`Judul Tugas   : ${submission.taskTitle}`, 18, y + 25);

  // Right Column
  const dateStr = new Date(submission.submittedAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Waktu Kumpul : ${dateStr}`, 110, y + 13);
  doc.text(`Tipe Dokumen : ${submission.taskType.toUpperCase()}`, 110, y + 19);
  doc.text(`Topik / Bab   : ${submission.topicBab}`, 110, y + 25);

  y += 36;

  // 3. Score & Integrity Summary Banner
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  // Score badge
  const scoreText = submission.finalScore !== undefined ? `${submission.finalScore} / 100` : 'Menunggu Koreksi Guru';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(67, 56, 202);
  doc.text(`Nilai Akhir: ${scoreText}`, 18, y + 8);

  // Cheating incidents badge
  const cheatCount = submission.totalCheatingCount || 0;
  if (cheatCount > 0) {
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(`⚠️ Terdeteksi Meninggalkan Halaman: ${cheatCount} kali`, 18, y + 15);
  } else {
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text(`✓ Integritas Sempurna: 0 Pelanggaran Pindah Layar`, 18, y + 15);
  }

  y += 28;

  // 4. Detailed Cheating Incident breakdown if any
  if (submission.cheatingIncidents && submission.cheatingIncidents.length > 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(190, 18, 60);
    doc.text('Rincian Log Deteksi Integritas Browser:', 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    submission.cheatingIncidents.forEach((inc, idx) => {
      checkPageBreak(6);
      doc.text(
        `• Insiden #${idx + 1}: Terdeteksi keluar layar saat pengerjaan Soal No. ${inc.questionNumber} selama ${inc.durationSeconds} detik.`,
        18,
        y
      );
      y += 5;
    });
    y += 4;
  }

  // 5. Teacher Feedback if any
  if (submission.teacherFeedback) {
    checkPageBreak(22);
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'FD');

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Catatan & Feedback Guru (${submission.gradedBy || 'Guru Pengampu'}):`, 18, y + 6);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    const feedbackLines = doc.splitTextToSize(submission.teacherFeedback, pageWidth - 40);
    doc.text(feedbackLines, 18, y + 11);

    y += 22;
  }

  // 6. Question by Question Responses
  checkPageBreak(15);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Rincian Jawaban Soal:', 14, y);
  y += 7;

  const questions = task?.questions || [];

  if (questions.length === 0) {
    // If questions object not fully passed, render from answers keys
    const answerEntries = Object.entries(submission.answers || {});
    answerEntries.forEach(([qId, ans], idx) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Soal #${idx + 1} (${qId}):`, 14, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      if (ans.selectedOption) {
        doc.text(`Jawaban Pilihan Ganda: ${ans.selectedOption}`, 18, y);
        y += 5;
      }
      if (ans.essayText) {
        const essayLines = doc.splitTextToSize(`Jawaban Esai: ${ans.essayText}`, pageWidth - 36);
        doc.text(essayLines, 18, y);
        y += essayLines.length * 4 + 2;
      }
      if (ans.photoUrl) {
        try {
          doc.text(`[Lampiran Foto Jawaban Terlampir]`, 18, y);
          y += 5;
          doc.addImage(ans.photoUrl, 'JPEG', 18, y, 60, 45);
          y += 50;
        } catch (e) {
          doc.text(`(Foto jawaban tersimpan)`, 18, y);
          y += 5;
        }
      }
      y += 4;
    });
  } else {
    questions.forEach((q) => {
      const ans = submission.answers?.[q.id];
      checkPageBreak(30);

      // Question Prompt
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const promptLines = doc.splitTextToSize(`Soal No. ${q.questionNumber} (${q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Esai'} - ${q.points} Poin):`, pageWidth - 28);
      doc.text(promptLines, 14, y);
      y += promptLines.length * 4 + 1;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const fullPrompt = doc.splitTextToSize(q.prompt, pageWidth - 32);
      doc.text(fullPrompt, 18, y);
      y += fullPrompt.length * 4 + 2;

      // Student Answer
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);

      if (q.type === 'multiple_choice') {
        const studentChoice = ans?.selectedOption || 'Tidak dijawab';
        doc.text(`Jawaban Siswa: [ ${studentChoice} ]`, 18, y);
        y += 5;
        if (q.correctAnswer) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Kunci Jawaban Guru: ${q.correctAnswer}`, 18, y);
          y += 5;
        }
      } else {
        const essayAns = ans?.essayText || '(Tidak ada jawaban tertulis)';
        doc.text(`Jawaban Esai Siswa:`, 18, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const essayLines = doc.splitTextToSize(essayAns, pageWidth - 36);
        doc.text(essayLines, 20, y);
        y += essayLines.length * 4 + 2;
      }

      // Check for photo answer
      if (ans?.photoUrl) {
        checkPageBreak(55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(99, 102, 241);
        doc.text(`Lampiran Foto Jawaban Siswa (Soal No. ${q.questionNumber}):`, 18, y);
        y += 4;

        try {
          // Add image to PDF
          doc.addImage(ans.photoUrl, 'JPEG', 18, y, 65, 45);
          y += 50;
        } catch (imgErr) {
          console.error('Failed to embed photo into PDF:', imgErr);
          doc.setFont('helvetica', 'italic');
          doc.text('[Foto jawaban siswa terlampir pada sistem]', 18, y);
          y += 6;
        }
      }

      y += 5;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dicetak dari Portal Belajarin | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger download
  const cleanFilename = `${submission.taskTitle.replace(/[^a-z0-9]/gi, '_')}_${submission.studentName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(cleanFilename);
}
