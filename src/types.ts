export type SubjectId = 'prc-1' | 'prc-2' | 'prc-3-v1' | 'prc-3-v2';

export type QuestionSource = 'self-test' | 'apq' | 'practice-set';

export type OptionId = string; // Supports any option string e.g. 'A', 'B', 'C', 'D', 'E', 'F'

export interface QuestionOption {
  id: OptionId;
  text: string;
}

export interface Question {
  id: string; // e.g., "PRC1-CH04-ST-001"
  subjectId: SubjectId;
  chapterId: number;
  chapterName: string;
  source: QuestionSource; // 1: ICAP Self-Test, 2: ICAP APQ, 3: Teacher/Practice Tests
  questionText: string; // Supports Markdown tables and $LaTeX$ math
  svgDiagram?: string; // Optional raw SVG string for economics diagrams, supply/demand curves, etc.
  options: QuestionOption[]; // Accepts any number of options (e.g. 4, 5, 6 options with 'E' and 'F')
  correctOption: string; // Accepts any option string: single (e.g. "B", "E", "F") or multi-select (e.g. "A,C", "B,E,F")
}

export interface SubjectInfo {
  id: SubjectId;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  defaultDurationMinutes: number;
  defaultQuestionCount: number;
  passingPercentage: number;
  chapters: { id: number; name: string }[];
}

export interface QuestionAttemptRecord {
  questionId: string;
  subjectId: SubjectId;
  chapterId: number;
  source: QuestionSource;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  flagged: boolean;
  timeSpentSeconds: number;
}

export interface ExamSessionRecord {
  id: string;
  timestamp: string;
  subjectId: SubjectId;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  scorePercentage: number;
  durationSeconds: number;
  timeLimitSeconds: number;
  selectedChapters: number[];
  selectedSources: QuestionSource[];
  records: QuestionAttemptRecord[];
}

export interface QuestionMasteryStat {
  questionId: string;
  subjectId: SubjectId;
  chapterId: number;
  source: QuestionSource;
  attempts: number;
  correct: number;
  lastAttemptedAt: string;
  lastOutcomeCorrect: boolean;
}

export function parseOptionList(raw: string | null | undefined): OptionId[] {
  if (!raw) return [];
  const items = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
  return Array.from(new Set(items)).sort();
}

export function formatOptionList(options: OptionId[]): string {
  return Array.from(new Set(options)).sort().join(',');
}

export function isMultiSelectQuestion(correctOption: string): boolean {
  return parseOptionList(correctOption).length > 1;
}

export function areOptionsEqual(
  selected: string | null | undefined,
  correct: string
): boolean {
  const normSelected = formatOptionList(parseOptionList(selected));
  const normCorrect = formatOptionList(parseOptionList(correct));
  return normSelected.length > 0 && normSelected === normCorrect;
}
