function extractEnrollmentYear(academicYear, fallbackDate = new Date()) {
  const text = String(academicYear || '').trim();
  const match = text.match(/(20\d{2})/);
  if (match) return match[1];

  const parsed = new Date(fallbackDate);
  const year = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  return String(year);
}

function isStudentIdFormat(value) {
  return /^STU\d{6,12}$/.test(String(value || '').trim().toUpperCase());
}

function isStudentIdStrictFormat(value) {
  return /^STU\d{10}$/.test(String(value || '').trim().toUpperCase());
}

async function generateUniqueStudentId({
  academicYear = '',
  fallbackDate = new Date(),
  exists = async () => false,
}) {
  const year = extractEnrollmentYear(academicYear, fallbackDate);
  for (let i = 0; i < 60; i += 1) {
    const suffix = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    const candidate = `STU${year}${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  const timestampTail = String(Date.now()).slice(-6);
  return `STU${year}${timestampTail}`;
}

module.exports = {
  extractEnrollmentYear,
  isStudentIdFormat,
  isStudentIdStrictFormat,
  generateUniqueStudentId,
};
