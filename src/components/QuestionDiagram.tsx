import React from 'react';

export interface QuestionDiagramProps {
  svg?: string;
  svgDiagram?: string;
  className?: string;
}

export const QuestionDiagram: React.FC<QuestionDiagramProps> = ({
  svg,
  svgDiagram,
  className = '',
}) => {
  const content = svg || svgDiagram;
  if (!content || !content.trim()) return null;

  return (
    <div
      className={`my-4 p-4 rounded-xl bg-zinc-900/90 border border-white/10 w-full max-w-[380px] mx-auto shadow-inner ${className}`}
    >
      <div
        className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:block [&_svg]:max-h-[240px] [&_line]:stroke-zinc-300 [&_text]:fill-zinc-200"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default QuestionDiagram;
