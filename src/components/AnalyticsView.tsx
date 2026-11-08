import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  ExamSessionRecord,
  Question,
  QuestionMasteryStat,
  QuestionSource,
  SubjectId,
} from '../types';
import { SUBJECTS } from '../data/subjects';
import { AnalyticsSkeleton } from './UIFeedback';

interface AnalyticsViewProps {
  sessions: ExamSessionRecord[];
  mastery: Record<string, QuestionMasteryStat>;
  allQuestionsBySubject: Record<SubjectId, Question[]>;
  onLaunchTargetedDrill: (subjectId: SubjectId, chapterId?: number, source?: QuestionSource) => void;
  onResetProgress: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  sessions,
  mastery,
  allQuestionsBySubject,
  onLaunchTargetedDrill,
  onResetProgress,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>('prc-1');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    setBarsReady(false);
    const raf = window.requestAnimationFrame(() => {
      const timer = window.setTimeout(() => setBarsReady(true), 40);
      return () => window.clearTimeout(timer);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedSubjectId, isFilterLoading]);

  const handleSelectSubject = (subjId: SubjectId) => {
    if (subjId === selectedSubjectId) return;
    setSelectedSubjectId(subjId);
    setIsFilterLoading(true);
    window.setTimeout(() => {
      setIsFilterLoading(false);
    }, 220);
  };

  const currentSubject = useMemo(
    () => SUBJECTS.find((s) => s.id === selectedSubjectId) || SUBJECTS[0],
    [selectedSubjectId]
  );

  const subjectQuestions = allQuestionsBySubject[selectedSubjectId] || [];

  // Chapter-wise Accuracy & Attempted calculation
  const chapterBreakdown = useMemo(() => {
    return currentSubject.chapters.map((ch) => {
      const chQuestions = subjectQuestions.filter((q) => q.chapterId === ch.id);
      let totalAttempts = 0;
      let totalCorrect = 0;
      let mistakeCount = 0;

      chQuestions.forEach((q) => {
        const stat = mastery[q.id];
        if (stat) {
          totalAttempts += stat.attempts;
          totalCorrect += stat.correct;
          mistakeCount += Math.max(0, stat.attempts - stat.correct);
        }
      });

      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

      return {
        chapterId: ch.id,
        shortLabel: `Ch ${String(ch.id).padStart(2, '0')}`,
        chapterName: ch.name,
        questionCount: chQuestions.length,
        totalAttempts,
        totalCorrect,
        mistakeCount,
        accuracy,
      };
    });
  }, [currentSubject, subjectQuestions, mastery]);

  // Weak areas sorted by mistake count & lowest accuracy
  const weakAreas = useMemo(() => {
    return [...chapterBreakdown]
      .filter((ch) => ch.mistakeCount > 0 || (ch.totalAttempts > 0 && ch.accuracy < 65))
      .sort((a, b) => b.mistakeCount - a.mistakeCount || a.accuracy - b.accuracy);
  }, [chapterBreakdown]);

  // Learning curve trend across sessions
  const learningCurveData = useMemo(() => {
    const chronological = [...sessions]
      .filter((s) => s.subjectId === selectedSubjectId)
      .reverse();

    return chronological.map((s, idx) => ({
      attemptLabel: `Test #${idx + 1}`,
      date: new Date(s.timestamp).toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
      }),
      score: s.scorePercentage,
      passingLine: currentSubject.passingPercentage,
    }));
  }, [sessions, selectedSubjectId, currentSubject.passingPercentage]);

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Compact Header & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA]">
            Chapter-level accuracy diagnostics and learning curve trend across the question bank.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/[0.07] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset History</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                Clear all analytics?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-xs text-zinc-500 hover:underline dark:text-zinc-400 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Subject Filter Pills (2x2 Grid on Mobile, Flex Row on Tablet/Desktop) */}
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-1 rounded-xl border border-black/[0.06] bg-zinc-100 p-1 dark:border-white/[0.06] dark:bg-zinc-900/80">
        {SUBJECTS.map((subj) => {
          const active = subj.id === selectedSubjectId;
          return (
            <button
              key={subj.id}
              type="button"
              onClick={() => handleSelectSubject(subj.id)}
              className={`flex-1 min-w-0 rounded-lg px-2.5 py-2 text-xs transition-all text-center cursor-pointer ${
                active
                  ? 'bg-white text-[#09090B] shadow-2xs dark:bg-zinc-800 dark:text-white font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span className="block font-bold leading-tight">{subj.code}</span>
              <span className="block text-[10px] sm:text-[11px] opacity-75 truncate leading-tight mt-0.5">
                {subj.shortTitle}
              </span>
            </button>
          );
        })}
      </div>

      {isFilterLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* Top Row: Learning Curve Line Graph + Weak Areas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-view-enter">
            {/* Learning Curve Trend (7 cols) */}
            <div className="lg:col-span-7 rounded-xl border border-black/[0.08] bg-white/80 p-4 sm:p-6 backdrop-blur-md dark:border-white/[0.07] dark:bg-[#121215]/75 min-w-0 overflow-hidden">
              <div className="mb-4 sm:mb-5">
                <h2 className="font-display text-sm sm:text-base font-semibold tracking-tight text-[#09090B] dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="truncate">Learning Curve ({currentSubject.code})</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Chronological test accuracy vs. 50% ICAP passing threshold
                </p>
              </div>

              {learningCurveData.length > 0 ? (
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={learningCurveData}
                      margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#71717A" opacity={0.18} />
                      <XAxis
                        dataKey="attemptLabel"
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        stroke="#71717A"
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        stroke="#71717A"
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121215',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          color: '#FAFAFA',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: '#FAFAFA' }}
                        labelStyle={{ color: '#A1A1AA', fontWeight: 500 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Accuracy %"
                        stroke="#6366F1"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#6366F1' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="passingLine"
                        name="Passing Standard (50%)"
                        stroke="#71717A"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-56 sm:h-64 flex-col items-center justify-center rounded-lg border border-dashed border-black/[0.08] p-4 sm:p-6 text-center dark:border-white/[0.08]">
                  <p className="font-display text-sm font-semibold text-[#09090B] dark:text-white">
                    0% Accuracy · 0 Attempted
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                    Complete a test in {currentSubject.code} to plot your accuracy curve over time.
                  </p>
                  <button
                    type="button"
                    disabled={subjectQuestions.length === 0}
                    onClick={() => onLaunchTargetedDrill(selectedSubjectId)}
                    className="mt-3.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
                  >
                    {subjectQuestions.length === 0
                      ? 'No questions loaded yet'
                      : `Start ${currentSubject.code} Test`}
                  </button>
                </div>
              )}
            </div>

            {/* Weak Areas & Mistake Count Card (5 cols) */}
            <div className="lg:col-span-5 rounded-xl border border-black/[0.08] bg-white/80 p-4 sm:p-6 backdrop-blur-md dark:border-white/[0.07] dark:bg-[#121215]/75 flex flex-col justify-between min-w-0">
              <div>
                <div className="mb-4">
                  <h2 className="font-display text-sm sm:text-base font-semibold tracking-tight text-[#09090B] dark:text-white">
                    Weak Areas &amp; Mistake Count
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Chapters with logged mistakes or accuracy below 65%
                  </p>
                </div>

                {weakAreas.length > 0 ? (
                  <div className="space-y-2.5">
                    {weakAreas.map((w) => (
                      <div
                        key={w.chapterId}
                        className="flex items-center justify-between gap-2.5 rounded-lg border border-black/[0.08] bg-[#FAFAFA] p-3 dark:border-white/[0.07] dark:bg-[#09090B] min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#09090B] dark:text-white">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">
                              {w.shortLabel}: {w.chapterName}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {w.mistakeCount} mistake{w.mistakeCount === 1 ? '' : 's'} · {w.accuracy}% ({w.totalAttempts} Attempted)
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onLaunchTargetedDrill(selectedSubjectId, w.chapterId)}
                          className="rounded-lg border border-black/[0.08] bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:border-white/[0.07] dark:bg-white dark:text-black dark:hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Retest
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-44 sm:h-48 flex-col items-center justify-center rounded-lg border border-dashed border-black/[0.08] p-4 sm:p-6 text-center dark:border-white/[0.08]">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-zinc-400" />
                    <p className="mt-2 font-display text-sm font-semibold text-[#09090B] dark:text-white">
                      Zero Weak Chapters Flagged
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      No chapters in {currentSubject.code} currently have high mistake counts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chapter-by-Chapter Accuracy Breakdown List */}
          <div className="rounded-xl border border-black/[0.08] bg-white/80 p-4 sm:p-6 backdrop-blur-md dark:border-white/[0.07] dark:bg-[#121215]/75 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div>
                <h2 className="font-display text-sm sm:text-base font-semibold tracking-tight text-[#09090B] dark:text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>Chapter Accuracy Breakdown ({currentSubject.code})</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Attempted count and accuracy rate across each syllabus chapter
                </p>
              </div>
            </div>

            <div className="mt-1 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {chapterBreakdown.map((ch) => {
                const hasAttempts = ch.totalAttempts > 0;
                const barColor = !hasAttempts
                  ? 'bg-zinc-300 dark:bg-zinc-700'
                  : ch.accuracy < 50
                    ? 'bg-rose-500'
                    : 'bg-[#6366F1]';

                return (
                  <div
                    key={ch.chapterId}
                    className="py-3 sm:py-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Chapter Label & Title & Mobile Drill Button */}
                    <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded-md border border-black/[0.08] bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-[#09090B] dark:border-white/[0.07] dark:bg-zinc-800/90 dark:text-zinc-200 shrink-0">
                          {ch.shortLabel}
                        </span>
                        <span className="text-sm font-medium text-[#09090B] dark:text-white truncate">
                          {ch.chapterName}
                        </span>
                      </div>

                      {/* Mobile Drill Button */}
                      <button
                        type="button"
                        disabled={ch.questionCount === 0}
                        onClick={() => onLaunchTargetedDrill(selectedSubjectId, ch.chapterId)}
                        className="sm:hidden rounded-lg border border-black/[0.08] bg-zinc-100 px-2.5 py-1 text-xs font-medium text-[#09090B] transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/[0.07] dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-white dark:hover:text-black cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {ch.questionCount === 0 ? 'No MCQs' : 'Drill →'}
                      </button>
                    </div>

                    {/* Progress & Stats (Desktop single row, Mobile second row) */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0">
                      <span className="rounded-md border border-black/[0.08] bg-[#FAFAFA] px-2 py-0.5 text-[11px] sm:text-xs text-zinc-500 dark:border-white/[0.07] dark:bg-[#09090B] dark:text-zinc-400 whitespace-nowrap">
                        {ch.totalAttempts} Attempted · {ch.questionCount} MCQs
                      </span>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="w-16 sm:w-24 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                            style={{
                              width: `${barsReady && hasAttempts ? Math.max(6, ch.accuracy) : 0}%`,
                            }}
                          />
                        </div>

                        <span className="w-9 sm:min-w-[40px] text-right text-xs font-semibold text-[#09090B] dark:text-white shrink-0">
                          {hasAttempts ? `${ch.accuracy}%` : '0%'}
                        </span>

                        {/* Desktop Drill Button */}
                        <button
                          type="button"
                          disabled={ch.questionCount === 0}
                          onClick={() => onLaunchTargetedDrill(selectedSubjectId, ch.chapterId)}
                          className="hidden sm:inline-flex rounded-lg border border-black/[0.08] bg-zinc-100 px-3 py-1.5 text-xs font-medium text-[#09090B] transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/[0.07] dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-white dark:hover:text-black cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {ch.questionCount === 0 ? 'No MCQs' : 'Drill →'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
