import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface QuestionData {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  explanation_a: string | null;
  explanation_b: string | null;
  explanation_c: string | null;
  explanation_d: string | null;
  language: string;
  category: string;
  level: string;
}

export interface ExamSessionData {
  id: number;
  user_id: number | null;
  category: string;
  level: string;
  mode: 'exam' | 'practice';
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  passed: number;
  duration_seconds: number | null;
  finished_at: string;
}

export interface SessionAnswerData {
  id: number;
  session_id: number;
  question_id: number;
  user_answer: string | null;
  is_correct: number;
}

interface SessionContextType {
  // Active quiz state
  questions: QuestionData[];
  setQuestions: (q: QuestionData[]) => void;
  answers: { [questionIndex: number]: string };
  setAnswers: (a: { [questionIndex: number]: string }) => void;
  // Active session info (dibawa ke result screen)
  activeSessionId: number | null;
  setActiveSessionId: (id: number | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  return (
    <SessionContext.Provider
      value={{ questions, setQuestions, answers, setAnswers, activeSessionId, setActiveSessionId }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
