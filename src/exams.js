/* পরীক্ষার কাউন্টডাউন + সিলেবাস কভারেজের হিসাব */
export const EXAM_TYPES = ["CT", "মিড", "ফাইনাল", "কুইজ", "ল্যাব/ভাইভা", "অন্যান্য"];

const toDate = ds => new Date(ds + "T00:00:00");
export const diffDays = (a, b) => Math.round((toDate(a) - toDate(b)) / 864e5);

/*
  ex = { id, courseId, type, date, time, syllabus:[topicId...] (ফাঁকা = পুরো কোর্স), note, score, total }
  done = { "courseId__topicId": true } (Courses ট্যাবের টিক)
*/
export function examStats(ex, courses, done, today) {
  const c = courses.find(x => x.id === ex.courseId) || { id: ex.courseId, topics: [] };
  const ids = ex.syllabus && ex.syllabus.length ? new Set(ex.syllabus) : null;
  const topics = (c.topics || []).filter(t => !ids || ids.has(t.id));
  const remaining = topics.filter(t => !done[`${c.id}__${t.id}`]);
  const total = topics.length, doneCount = total - remaining.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const daysLeft = diffDays(ex.date, today);
  // পরীক্ষার আগের দিন পর্যন্ত পড়ার সময়: আজ থেকে daysLeft দিন
  const pace = remaining.length === 0 ? 0 : daysLeft >= 1 ? remaining.length / daysLeft : remaining.length;
  let level = "ok";
  if (remaining.length > 0) level = daysLeft <= 0 ? "late" : pace > 3 ? "hard" : pace > 1.5 ? "push" : "ok";
  return { course: c, topics, remaining, total, doneCount, pct, daysLeft, pace, level };
}

export const upcoming = (exams, today) => exams.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
export const past = (exams, today) => exams.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
