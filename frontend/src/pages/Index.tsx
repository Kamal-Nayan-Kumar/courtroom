import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CaseData,
  CaseReport,
  PlayerRole,
} from "@/types/courtroom";
import { useTrialStore } from "@/store/trialStore";
import LandingScreen from "@/components/courtroom/LandingScreen";
import RoleSelection from "@/components/courtroom/RoleSelection";
import CaseCreation from "@/components/courtroom/CaseCreation";
import CourtroomLoading from "@/components/courtroom/CourtroomLoading";
import CourtroomMain from "@/components/courtroom/CourtroomMain";
import CaseReportScreen from "@/components/courtroom/CaseReportScreen";

const DEFAULT_CHARACTER_STYLES = {
  judge: "judge-1",
  defender: "defender-1",
  prosecutor: "prosecutor-1",
} as const;

const Index = () => {
  const {
    phase,
    setPhase,
    startPreparation,
    configureCase,
    completeTrial,
    report,
    playerRole,
    characterStyles,
    caseData,
    resetTrial,
  } = useTrialStore();

  const [prepStep, setPrepStep] = useState<"role" | "case">("role");

  const handleStart = () => {
    setPhase("PREPARATION");
    setPrepStep("role");
  };

  const handleRoleSelect = (role: PlayerRole) => {
    startPreparation(role);
    setPrepStep("case");
  };

  const handleCaseSubmit = (data: CaseData) => {
    configureCase(data);
  };

  const handleLoadingComplete = useCallback(() => {
    setPhase("TRIAL_ACTIVE");
  }, [setPhase]);

  const handleTrialComplete = (trialReport: CaseReport) => {
    completeTrial(trialReport);
  };

  const handleRetry = () => {
    if (caseData) {
      configureCase(caseData);
    }
  };

  const handleNewCase = () => {
    resetTrial();
    setPrepStep("role");
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "MENU" && (
        <LandingScreen
          key="landing"
          onEnter={handleStart}
        />
      )}
      {phase === "PREPARATION" && prepStep === "role" && (
        <RoleSelection key="role" onSelect={handleRoleSelect} />
      )}
      {phase === "PREPARATION" && prepStep === "case" && (
        <CaseCreation key="case" onSubmit={handleCaseSubmit} />
      )}
      {phase === "LOADING" && playerRole && (
        <CourtroomLoading
          key="loading"
          onComplete={handleLoadingComplete}
        />
      )}
      {(phase === "TRIAL_ACTIVE" || phase === "DELIBERATION") && caseData && playerRole && (
        <CourtroomMain
          key="trial"
          caseData={caseData}
          playerRole={playerRole}
          characterStyles={characterStyles || DEFAULT_CHARACTER_STYLES}
          onComplete={handleTrialComplete}
        />
      )}
      {phase === "POST_MATCH_REPORT" && report && (
        <CaseReportScreen
          key="report"
          report={report}
          onRetry={handleRetry}
          onNewCase={handleNewCase}
        />
      )}
    </AnimatePresence>
  );
};

export default Index;
