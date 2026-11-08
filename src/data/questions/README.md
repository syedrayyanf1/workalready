# CAxis Question Bank Directory

Drop any `.json` question bank files directly into this directory (`/src/data/questions/`) and commit them to GitHub!

CAxis uses Vite's `import.meta.glob('/src/data/questions/*.json', { eager: true })` to automatically discover, merge, deduplicate by `id`, and dynamically populate subjects and syllabus chapters at build time.

## Supported JSON Format

Each file can contain an array of question objects (or a single question object). You can have 4, 5, or 6 options (including options `E` and `F`), and single-select or multi-select `correctOption`:

```json
[
  {
    "id": "PRC1-CH01-001",
    "subjectId": "prc-1",
    "chapterId": 1,
    "chapterName": "Accounting Fundamentals & Double Entry",
    "source": "self-test",
    "questionText": "What is the primary objective of financial accounting?",
    "options": [
      { "id": "A", "text": "Tax minimization" },
      { "id": "B", "text": "Providing financial information useful for decision making" },
      { "id": "C", "text": "Budget forecasting" },
      { "id": "D", "text": "Internal cost allocation" },
      { "id": "E", "text": "Employee payroll auditing" }
    ],
    "correctOption": "B"
  }
]
```

### Supported `subjectId` Values:
- `prc-1` (Fundamentals of Accounting)
- `prc-2` (Quantitative Analysis for Business & Statistics)
- `prc-3-v1` (Business Insights - Volume 1)
- `prc-3-v2` (Economic Insights - Volume 2)

### Supported `source` Values:
- `self-test` (Official ICAP Self-Test)
- `apq` (ICAP Additional Practice Questions)
- `practice-set` (Faculty & Mock Practice Sets)
