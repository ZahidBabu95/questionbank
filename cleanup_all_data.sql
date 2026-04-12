-- ╔══════════════════════════════════════════════════════════════╗
-- ║  QuestionShaper — Complete Data Cleanup SQL                 ║
-- ║  সকল প্রশ্ন, ক্লাস, বিষয়, অধ্যায়, টপিক ডিলিট করবে              ║
-- ║  ⚠ সতর্কতা: এই কুয়েরি চালালে সব ডেটা মুছে যাবে!               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Foreign key check বন্ধ (ডিলিট ক্রম সমস্যা এড়াতে)
SET FOREIGN_KEY_CHECKS = 0;

-- ═══ Step 1: পরীক্ষা সংক্রান্ত ডেটা ═══
-- (প্রশ্ন ডিলিটের আগে পরীক্ষার রেকর্ড ক্লিন করতে হবে)
DELETE FROM exam_result_answers;
DELETE FROM exam_results;
DELETE FROM exam_questions;
DELETE FROM exam_generation_rules;
DELETE FROM exam_sections;
DELETE FROM exams;

-- ═══ Step 2: লেকচার সংক্রান্ত ডেটা ═══
DELETE FROM lecture_questions;

-- ═══ Step 3: প্রশ্ন ও সম্পর্কিত ডেটা ═══
DELETE FROM question_sources;
DELETE FROM question_options;
DELETE FROM questions;

-- ═══ Step 4: একাডেমিক কাঠামো ═══
DELETE FROM topics;
DELETE FROM chapters;
DELETE FROM class_subjects;
DELETE FROM subjects;
DELETE FROM academic_classes;

-- Foreign key check আবার চালু
SET FOREIGN_KEY_CHECKS = 1;

-- ═══ যাচাই ═══
SELECT 'questions' AS table_name, COUNT(*) AS remaining FROM questions
UNION ALL SELECT 'question_options', COUNT(*) FROM question_options
UNION ALL SELECT 'question_sources', COUNT(*) FROM question_sources
UNION ALL SELECT 'exams', COUNT(*) FROM exams
UNION ALL SELECT 'academic_classes', COUNT(*) FROM academic_classes
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL SELECT 'class_subjects', COUNT(*) FROM class_subjects
UNION ALL SELECT 'chapters', COUNT(*) FROM chapters
UNION ALL SELECT 'topics', COUNT(*) FROM topics;
