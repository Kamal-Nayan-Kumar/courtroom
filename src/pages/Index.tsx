import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GamePhase, CaseData, CaseReport } from '@/types/courtroom';
import { generateCaseReport } from '@/lib/mockApi';
import LandingScreen from '@/components/courtroom/LandingScreen';
import CaseCreation from '@/components/courtroom/CaseCreation';
import CourtroomLoading from '@/components/courtroom/CourtroomLoading';
import CourtroomMain from '@/components/courtroom/CourtroomMain';
import VerdictScene from '@/components/courtroom/VerdictScene';
import CaseReportScreen from '@/components/courtroom/CaseReportScreen';

const Index = () => {
  const [phase, setPhase] = useState<GamePhase>('landing');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [finalScore, setFinalScore] = useState(50);
  const [report, setReport] = useState<CaseReport | null>(null);

  const handleCaseSubmit = (data: CaseData) => {
    setCaseData(data);
    setPhase('loading');
  };

  const handleLoadingComplete = useCallback(() => {
    setPhase('trial');
  }, []);

  const handleVerdict = (score: number) => {
    setFinalScore(score);
    setPhase('verdict');
  };

  const handleShowReport = () => {
    if (caseData) {
      setReport(generateCaseReport(caseData, finalScore));
    }
    setPhase('report');
  };

  const handleRetry = () => {
    setFinalScore(50);
    setReport(null);
    setPhase('loading');
  };

  const handleNewCase = () => {
    setCaseData(null);
    setFinalScore(50);
    setReport(null);
    setPhase('case-creation');
  };

  return (
    <AnimatePresence mode="wait">
      {phase === 'landing' && <LandingScreen key="landing" onEnter={() => setPhase('case-creation')} />}
      {phase === 'case-creation' && <CaseCreation key="case" onSubmit={handleCaseSubmit} />}
      {phase === 'loading' && <CourtroomLoading key="loading" onComplete={handleLoadingComplete} />}
      {phase === 'trial' && caseData && <CourtroomMain key="trial" caseData={caseData} onVerdict={handleVerdict} />}
      {phase === 'verdict' && <VerdictScene key="verdict" score={finalScore} onContinue={handleShowReport} />}
      {phase === 'report' && report && <CaseReportScreen key="report" report={report} onRetry={handleRetry} onNewCase={handleNewCase} />}
    </AnimatePresence>
  );
};

export default Index;
