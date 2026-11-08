import { Question, QuestionSource, SubjectId, SubjectInfo } from '../types';

// Dynamically discover and eagerly import all .json files in /src/data/questions/
const questionFiles = import.meta.glob('/src/data/questions/*.json', { eager: true });

function normalizeSubjectId(raw: unknown): SubjectId | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toLowerCase().replace(/[\s_.]+/g, '-');
  if (clean === 'prc-1' || clean === 'prc1') return 'prc-1';
  if (clean === 'prc-2' || clean === 'prc2') return 'prc-2';
  if (
    clean === 'prc-3-v1' ||
    clean === 'prc3-v1' ||
    clean === 'prc3v1' ||
    clean === 'prc-3-1' ||
    clean === 'prc3.1'
  ) {
    return 'prc-3-v1';
  }
  if (
    clean === 'prc-3-v2' ||
    clean === 'prc3-v2' ||
    clean === 'prc3v2' ||
    clean === 'prc-3-2' ||
    clean === 'prc3.2'
  ) {
    return 'prc-3-v2';
  }
  return null;
}

function loadAllGlobQuestions(): Question[] {
  const questionMap = new Map<string, Question>();

  for (const path in questionFiles) {
    const fileModule = questionFiles[path] as Record<string, unknown> | unknown[] | unknown;
    // Vite eager JSON imports provide the parsed JSON as .default or directly as the module object
    const rawData =
      fileModule && typeof fileModule === 'object' && 'default' in fileModule
        ? (fileModule as { default: unknown }).default
        : fileModule;

    if (!rawData) continue;

    const list = Array.isArray(rawData) ? rawData : [rawData];

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<Question>;
      if (!candidate.id || !candidate.questionText) continue;

      const normSubject = normalizeSubjectId(candidate.subjectId);
      if (!normSubject) continue;

      const rawOptions = Array.isArray(candidate.options) ? candidate.options : [];
      if (rawOptions.length === 0) continue;

      const options = rawOptions.map((opt: { id?: string; text?: string }, idx: number) => ({
        id: String(opt?.id || String.fromCharCode(65 + idx)).trim().toUpperCase(),
        text: String(opt?.text ?? ''),
      }));

      const chapterId = Number(candidate.chapterId) || 1;
      const chapterName = candidate.chapterName
        ? String(candidate.chapterName).trim()
        : `Chapter ${chapterId}`;
      const validSources: QuestionSource[] = ['self-test', 'apq', 'practice-set'];
      const source: QuestionSource =
        candidate.source && validSources.includes(candidate.source)
          ? candidate.source
          : 'self-test';

      const correctOption = candidate.correctOption
        ? String(candidate.correctOption).trim().toUpperCase()
        : 'A';

      const q: Question = {
        id: String(candidate.id).trim(),
        subjectId: normSubject,
        chapterId,
        chapterName,
        source,
        questionText: String(candidate.questionText),
        options,
        correctOption,
      };

      // Deduplicate by unique question ID
      questionMap.set(q.id, q);
    }
  }

  return Array.from(questionMap.values());
}

const ALL_GLOB_QUESTIONS = loadAllGlobQuestions();

export const STATIC_QUESTIONS_BY_SUBJECT: Record<SubjectId, Question[]> = {
  'prc-1': ALL_GLOB_QUESTIONS.filter((q) => q.subjectId === 'prc-1'),
  'prc-2': ALL_GLOB_QUESTIONS.filter((q) => q.subjectId === 'prc-2'),
  'prc-3-v1': ALL_GLOB_QUESTIONS.filter((q) => q.subjectId === 'prc-3-v1'),
  'prc-3-v2': ALL_GLOB_QUESTIONS.filter((q) => q.subjectId === 'prc-3-v2'),
};

export function getAllStaticQuestions(): Question[] {
  return ALL_GLOB_QUESTIONS;
}

export const BASE_SUBJECTS: SubjectInfo[] = [
  {
    id: 'prc-1',
    code: 'PRC 1',
    title: 'PRC 1: Fundamentals of Accounting',
    shortTitle: 'Fundamentals of Accounting',
    description:
      'Double-entry bookkeeping, books of prime entry, bank reconciliations, accruals and prepayments, bad debts, IAS 16 PPE, and IAS 2 Inventories.',
    defaultDurationMinutes: 30,
    defaultQuestionCount: 20,
    passingPercentage: 50,
    chapters: [
      { id: 1, name: 'Accounting Fundamentals & Double Entry' },
      { id: 2, name: 'Books of Prime Entry & Trial Balance' },
      { id: 3, name: 'Bank Reconciliation Statements' },
      { id: 4, name: 'Accruals and Prepayments' },
      { id: 5, name: 'IAS 16 Property, Plant & Equipment and IAS 2 Inventories' },
    ],
  },
  {
    id: 'prc-2',
    code: 'PRC 2',
    title: 'PRC 2: Quantitative Analysis for Business & Statistics',
    shortTitle: 'Quantitative Analysis & Statistics',
    description:
      'Linear programming, financial mathematics (annuities, NPV, IRR), central tendency, regression, and probability distributions.',
    defaultDurationMinutes: 25,
    defaultQuestionCount: 20,
    passingPercentage: 50,
    chapters: [
      { id: 1, name: 'Linear Equations, Coordinate Geometry & Linear Programming' },
      { id: 2, name: 'Financial Mathematics: Compounding, Annuities & NPV' },
      { id: 3, name: 'Measures of Central Tendency & Dispersion' },
      { id: 4, name: 'Correlation, Regression & Index Numbers' },
      { id: 5, name: 'Probability, Binomial, Poisson & Normal Distributions' },
    ],
  },
  {
    id: 'prc-3-v1',
    code: 'PRC 3 (Vol 1)',
    title: 'PRC 3 (Vol 1): Business Insights',
    shortTitle: 'Business Insights',
    description:
      'Corporate governance, stakeholder mapping, organization structures, HR motivation theories, information systems, and ICAP ethics.',
    defaultDurationMinutes: 15,
    defaultQuestionCount: 20,
    passingPercentage: 50,
    chapters: [
      { id: 1, name: 'Nature of Business, Stakeholders & Governance' },
      { id: 2, name: 'Organization Structure, Culture & Human Resources' },
      { id: 3, name: 'Marketing, Operations & Information Systems' },
      { id: 4, name: 'Professional Ethics & Corporate Social Responsibility' },
    ],
  },
  {
    id: 'prc-3-v2',
    code: 'PRC 3 (Vol 2)',
    title: 'PRC 3 (Vol 2): Economic Insights',
    shortTitle: 'Economic Insights',
    description:
      'Price & cross elasticity of demand, market structures, National Income accounting (GDP/NNP), Keynesian multiplier, and monetary policy.',
    defaultDurationMinutes: 15,
    defaultQuestionCount: 20,
    passingPercentage: 50,
    chapters: [
      { id: 1, name: 'Microeconomics: Demand, Supply & Elasticity' },
      { id: 2, name: 'Cost of Production & Market Structures' },
      { id: 3, name: 'National Income Accounting & Keynesian Multiplier' },
      { id: 4, name: 'Money, Banking, Inflation & Balance of Payments' },
    ],
  },
];

// Dynamically populate chapters for each subject based on loaded questions
export const SUBJECTS: SubjectInfo[] = BASE_SUBJECTS.map((baseSubj) => {
  const questions = STATIC_QUESTIONS_BY_SUBJECT[baseSubj.id] || [];
  const chapterMap = new Map<number, string>();

  // 1. Seed with base syllabus chapters
  baseSubj.chapters.forEach((ch) => chapterMap.set(ch.id, ch.name));

  // 2. Dynamically add or enrich chapters found in the loaded JSON questions
  questions.forEach((q) => {
    if (q.chapterId) {
      if (!chapterMap.has(q.chapterId)) {
        chapterMap.set(q.chapterId, q.chapterName || `Chapter ${q.chapterId}`);
      } else if (
        q.chapterName &&
        (!chapterMap.get(q.chapterId) || chapterMap.get(q.chapterId)!.startsWith('Chapter '))
      ) {
        chapterMap.set(q.chapterId, q.chapterName);
      }
    }
  });

  const resolvedChapters = Array.from(chapterMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id - b.id);

  return {
    ...baseSubj,
    chapters: resolvedChapters,
  };
});

export const SOURCE_LABELS: Record<
  QuestionSource,
  { label: string; shortLabel: string; description: string }
> = {
  'self-test': {
    label: 'ICAP Self-Test',
    shortLabel: 'Self-Test',
    description: 'Official end-of-chapter ICAP Study Text self-test MCQs',
  },
  'apq': {
    label: 'ICAP APQ',
    shortLabel: 'ICAP APQ',
    description: 'Additional Practice Questions issued by ICAP',
  },
  'practice-set': {
    label: 'Teacher / Practice Set',
    shortLabel: 'Practice Set',
    description: 'Exam-standard faculty mock & practice sets',
  },
};
