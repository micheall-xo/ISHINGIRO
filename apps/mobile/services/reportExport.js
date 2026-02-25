import { Platform, Share } from 'react-native';

function num(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(digits);
}

function safeName(name) {
  return String(name || 'student')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function buildTermReportText(report, term) {
  const student = report?.student || {};
  const yearly = report?.yearly || {};
  const target =
    term ||
    (Array.isArray(report?.terms) && report.terms.length ? report.terms[0] : null) ||
    null;

  const lines = [];
  lines.push('STUDENT REPORT CARD');
  lines.push('===================');
  lines.push(`Student: ${student.fullName || '-'}`);
  lines.push(`Student ID: ${student.studentId || '-'}`);
  lines.push(`Class: ${student.className || '-'}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push('');

  if (target) {
    lines.push(`${target.title || target.term || 'Term Report'}`);
    lines.push('-------------------');
    lines.push(`Overall Score: ${num(target.overallScore)}%`);
    lines.push(`Overall Grade: ${target.overallGrade || 'N/A'}`);
    lines.push('');
    lines.push('Subjects:');
    const subjects = Array.isArray(target.subjects) ? target.subjects : [];
    if (!subjects.length) {
      lines.push('- No subject records');
    } else {
      subjects.forEach((subject) => {
        lines.push(
          `- ${subject.name}: Formative ${subject.formativeScore ?? '-'} | Exam ${subject.examScore ?? '-'} | Final ${num(
            subject.score,
            1
          )}% | Grade ${subject.grade || 'N/A'}`
        );
      });
    }
    lines.push('');
  }

  lines.push('Yearly Summary');
  lines.push('--------------');
  lines.push(`Average: ${num(yearly.average)}%`);
  lines.push(`Grade: ${yearly.grade || 'N/A'}`);
  lines.push(`GPA: ${num(yearly.gpa)}`);
  lines.push(`Status: ${yearly.status || 'N/A'}`);
  lines.push('');

  return lines.join('\n');
}

export async function exportTermReport(report, term) {
  const text = buildTermReportText(report, term);
  const fileName = `${safeName(report?.student?.fullName || 'student')}_${safeName(
    term?.term || term?.title || 'report'
  )}_report.txt`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: 'Student Report Card',
    message: text,
  });
}
