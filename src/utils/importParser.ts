import {
  formatOptionList,
  OptionId,
  parseOptionList,
  Question,
  QuestionSource,
  SubjectId,
} from '../types';

export interface ParseResult {
  questions: Question[];
  errors: string[];
}

const VALID_SUBJECTS: SubjectId[] = ['prc-1', 'prc-2', 'prc-3-v1', 'prc-3-v2'];
const VALID_SOURCES: QuestionSource[] = ['self-test', 'apq', 'practice-set'];

function normalizeCorrectOption(raw: unknown): string {
  if (typeof raw !== 'string') return 'A';
  const parsed = parseOptionList(raw);
  return parsed.length > 0 ? formatOptionList(parsed) : raw.trim().toUpperCase() || 'A';
}

function cleanChapterTitle(rawName: string): string {
  if (!rawName) return '';
  return rawName.trim().replace(/^(?:chapter|ch)\s*\d+[\s:.-]+/i, '').trim();
}

export const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  [
    {
      id: 'PRC1-CH01-001',
      subjectId: 'prc-1',
      chapterId: 1,
      chapterName: 'Chapter 1: Accounting Fundamentals',
      questionText: 'Markdown + $LaTeX$ supported question text here',
      options: [
        { id: 'A', text: 'Option A text' },
        { id: 'B', text: 'Option B text' },
        { id: 'C', text: 'Option C text' },
        { id: 'D', text: 'Option D text' },
        { id: 'E', text: 'Option E text' },
      ],
      correctOption: 'B',
    },
  ],
  null,
  2
);

export const SAMPLE_MARKDOWN_TEMPLATE = `---
id: PRC1-CH01-001
subjectId: prc-1
chapterId: 1
chapterName: Chapter 1: Accounting Fundamentals
correctOption: B
---
Markdown + $LaTeX$ supported question text here

A) Option A text
B) Option B text
C) Option C text
D) Option D text
E) Option E text`;

export const SAMPLE_CSV_TEMPLATE = `id,subjectId,chapterId,chapterName,questionText,optionA,optionB,optionC,optionD,optionE,correctOption
"PRC1-CH01-001","prc-1",1,"Chapter 1: Accounting Fundamentals","Markdown + $LaTeX$ supported question text here","Option A text","Option B text","Option C text","Option D text","Option E text","B"`;

export function parseMarkdownQuestionBank(
  rawText: string,
  defaults: { subjectId: SubjectId; chapterId: number; chapterName: string; source?: QuestionSource }
): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];

  const trimmed = rawText.trim();
  if (!trimmed) {
    return { questions: [], errors: ['Input text is empty.'] };
  }

  const blocks = trimmed.split(/\n===\s*\n|\n===$/);

  blocks.forEach((block, idx) => {
    const blockNum = idx + 1;
    let body = block.trim();
    if (!body) return;

    const meta: Record<string, string> = {};
    if (body.startsWith('---')) {
      const endFrontmatter = body.indexOf('\n---', 3);
      if (endFrontmatter !== -1) {
        const fmLines = body.slice(3, endFrontmatter).trim().split('\n');
        fmLines.forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const k = line.slice(0, colonIdx).trim();
            const v = line.slice(colonIdx + 1).trim();
            meta[k] = v;
          }
        });
        body = body.slice(endFrontmatter + 4).trim();
      }
    }

    // Strip any trailing Explanation block if present in legacy pasted text
    const expMatch = body.match(/\nExplanation:\s*([\s\S]*)$/i);
    if (expMatch && expMatch.index !== undefined) {
      body = body.slice(0, expMatch.index).trim();
    }

    // Extract Answer if inline (supports single "B", "E", or multi "A,C" / "B,E,F")
    let inlineAnswer: string | undefined;
    const ansMatch = body.match(/\n(?:Answer|Correct(?:\s*Option)?):\s*([A-Za-z0-9]+(?:\s*,\s*[A-Za-z0-9]+)*)\s*$/i);
    if (ansMatch && ansMatch.index !== undefined) {
      inlineAnswer = ansMatch[1].toUpperCase();
      body = body.slice(0, ansMatch.index).trim();
    }

    // Extract Options (A, B, C, D, E, F, etc.)
    const optionRegex = /\n([A-Za-z0-9]+)[).:]\s+([^\n]+)/g;
    const matchedOptions: { id: OptionId; text: string; index: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = optionRegex.exec('\n' + body)) !== null) {
      matchedOptions.push({
        id: match[1].toUpperCase(),
        text: match[2].trim(),
        index: match.index,
      });
    }

    if (matchedOptions.length < 2) {
      errors.push(`Block #${blockNum}: Could not find at least 2 options (found ${matchedOptions.length}).`);
      return;
    }

    const firstOptIndex = matchedOptions[0].index;
    const questionText = ('\n' + body).slice(0, firstOptIndex).trim();

    const subjectId = (VALID_SUBJECTS.includes(meta.subjectId as SubjectId)
      ? meta.subjectId
      : defaults.subjectId) as SubjectId;
    const chapterId = meta.chapterId ? Number(meta.chapterId) || defaults.chapterId : defaults.chapterId;
    const chapterName = cleanChapterTitle(meta.chapterName || defaults.chapterName);
    const source: QuestionSource = 'self-test';
    const correctOption = normalizeCorrectOption(meta.correctOption || inlineAnswer || 'A');

    const id =
      meta.id ||
      `${subjectId.toUpperCase().replace(/-/g, '')}-CH${String(chapterId).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`;

    const options = matchedOptions.map((o) => ({
      id: o.id,
      text: o.text,
    }));

    if (!questionText) {
      errors.push(`Block #${blockNum}: Question stem text is empty.`);
      return;
    }

    const svgDiagram =
      meta.svgDiagram && meta.svgDiagram.trim().length > 0 ? meta.svgDiagram.trim() : undefined;

    questions.push({
      id,
      subjectId,
      chapterId,
      chapterName,
      source,
      questionText,
      svgDiagram,
      options,
      correctOption,
    });
  });

  return { questions, errors };
}

function splitCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvQuestionBank(rawCsv: string): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];
  const lines = rawCsv
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { questions: [], errors: ['CSV must include a header row and at least one question row.'] };
  }

  const headerCols = splitCsvRow(lines[0]).map((h) => h.toLowerCase().trim());

  // Find option columns from headers, e.g. optiona, optionb, optionc, optiond, optione, optionf...
  const optionHeaderIndices: { id: string; colIdx: number }[] = [];
  headerCols.forEach((h, idx) => {
    const match = h.match(/^option([a-z0-9]+)$/i);
    if (match) {
      optionHeaderIndices.push({ id: match[1].toUpperCase(), colIdx: idx });
    }
  });

  const correctOptionIdx = headerCols.findIndex(
    (h) => h === 'correctoption' || h === 'correct' || h === 'answer'
  );

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    if (cols.length < 7) {
      errors.push(`Row ${i + 1}: Insufficient columns in CSV row.`);
      continue;
    }

    const id = cols[0];
    const subjectRaw = cols[1];
    const chapterIdRaw = cols[2];
    const chapterName = cols[3];
    const questionText = cols[4];

    let options: { id: string; text: string }[] = [];
    let correctRaw = '';

    if (optionHeaderIndices.length >= 2 && correctOptionIdx !== -1) {
      options = optionHeaderIndices
        .filter((oh) => oh.colIdx < cols.length && cols[oh.colIdx].trim().length > 0)
        .map((oh) => ({ id: oh.id, text: cols[oh.colIdx] }));
      correctRaw = cols[correctOptionIdx] || '';
    } else {
      // Fallback column layout
      const optStartIndex = 5;
      const lastIndex = cols.length - 1;
      correctRaw = cols[lastIndex];

      const optCols = cols.slice(optStartIndex, lastIndex);
      options = optCols.map((text, oIdx) => ({
        id: String.fromCharCode(65 + oIdx),
        text,
      }));
    }

    if (options.length < 2) {
      errors.push(`Row ${i + 1}: Could not find at least 2 options.`);
      continue;
    }

    const subjectId = (VALID_SUBJECTS.includes(subjectRaw as SubjectId) ? subjectRaw : 'prc-1') as SubjectId;
    const chapterId = Number(chapterIdRaw) || 1;
    const correctOption = normalizeCorrectOption(correctRaw);

    questions.push({
      id: id || `CSV-Q-${i}`,
      subjectId,
      chapterId,
      chapterName: cleanChapterTitle(chapterName || `Chapter ${chapterId}`),
      source: 'self-test',
      questionText,
      options,
      correctOption,
    });
  }

  return { questions, errors };
}

export function parseJsonQuestionBank(rawJson: string): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(rawJson);
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    arr.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item #${idx + 1}: Not a valid JSON object.`);
        return;
      }
      if (!item.questionText || !Array.isArray(item.options) || item.options.length < 2) {
        errors.push(`Item #${idx + 1}: Missing questionText or at least 2 options.`);
        return;
      }

      const chapterId = Number(item.chapterId) || 1;
      const svgDiagram =
        typeof item.svgDiagram === 'string' && item.svgDiagram.trim().length > 0
          ? item.svgDiagram.trim()
          : undefined;

      questions.push({
        id: String(item.id || `JSON-Q-${idx + 1}`),
        subjectId: VALID_SUBJECTS.includes(item.subjectId) ? item.subjectId : 'prc-1',
        chapterId,
        chapterName: cleanChapterTitle(String(item.chapterName || `Chapter ${chapterId}`)),
        source: VALID_SOURCES.includes(item.source) ? item.source : 'self-test',
        questionText: String(item.questionText),
        svgDiagram,
        options: item.options.map((o: { id?: string; text?: string }, oIdx: number) => ({
          id: String(o?.id || String.fromCharCode(65 + oIdx)).trim().toUpperCase(),
          text: String(o?.text ?? ''),
        })),
        correctOption: normalizeCorrectOption(item.correctOption),
      });
    });
  } catch (err) {
    errors.push(`Invalid JSON syntax: ${(err as Error).message}`);
  }

  return { questions, errors };
}
