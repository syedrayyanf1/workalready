import React from 'react';
import { QuestionDiagram, QuestionDiagramProps } from './QuestionDiagram';

export { QuestionDiagram };
export type { QuestionDiagramProps };

export const SvgDiagramViewer: React.FC<QuestionDiagramProps> = (props) => {
  return <QuestionDiagram {...props} />;
};

export default SvgDiagramViewer;
