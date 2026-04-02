import { CaseData, CaseReport } from '@/types/courtroom';

const prosecutorResponses = [
  "Your Honor, the defendant has provided no concrete evidence to support their claims. I urge the court to consider the weight of circumstantial evidence against them.",
  "The timeline presented by the defense is inconsistent. On one hand they claim innocence, yet the evidence clearly shows involvement.",
  "I present to the court documented proof that contradicts the defendant's testimony. Their story simply doesn't hold up under scrutiny.",
  "Your Honor, the defense is relying on emotional appeal rather than facts. The evidence speaks for itself.",
  "The defendant had both motive and opportunity. Their alibi has significant gaps that cannot be explained away.",
];

const judgeQuestions = [
  "Defendant, can you provide any documented evidence to support your claims?",
  "I need clarification on the timeline. When exactly did these events occur?",
  "Do you have any witnesses who can corroborate your version of events?",
  "How do you respond to the prosecutor's assertion about the inconsistencies?",
  "Before I make my decision, is there anything else you'd like the court to consider?",
];

const judgeComments = [
  "I will take this under consideration. Prosecutor, you may continue.",
  "Interesting point. The court notes your testimony.",
  "Order in the court. Let us proceed with the next argument.",
  "The court appreciates your candor. Let's hear from the prosecution.",
];

export function getProsecutorResponse(round: number): string {
  return prosecutorResponses[round % prosecutorResponses.length];
}

export function getJudgeQuestion(round: number): string {
  return judgeQuestions[round % judgeQuestions.length];
}

export function getJudgeComment(): string {
  return judgeComments[Math.floor(Math.random() * judgeComments.length)];
}

export function evaluateResponse(response: string): { scoreDelta: number; feedback: string; level: 'strong' | 'weak' | 'no-evidence' } {
  const words = response.trim().split(/\s+/).length;
  if (words < 5) return { scoreDelta: -8, feedback: "Too brief. The court needs more detail.", level: 'no-evidence' };
  if (words < 15) return { scoreDelta: 3, feedback: "Acceptable, but more substance would strengthen your case.", level: 'weak' };
  const hasEvidence = /evidence|proof|document|receipt|witness|record|photo|contract/i.test(response);
  const hasLogic = /because|therefore|consequently|since|due to|as a result/i.test(response);
  if (hasEvidence && hasLogic) return { scoreDelta: 12, feedback: "Strong argument with evidence and reasoning!", level: 'strong' };
  if (hasEvidence || hasLogic) return { scoreDelta: 7, feedback: "Good point, but could be stronger.", level: 'weak' };
  return { scoreDelta: 4, feedback: "Noted, but consider backing claims with evidence.", level: 'weak' };
}

export function generateCaseReport(caseData: CaseData, finalScore: number): CaseReport {
  const win = finalScore >= 50;
  return {
    verdict: win ? 'win' : 'lose',
    confidenceScore: Math.min(100, Math.max(0, finalScore + Math.floor(Math.random() * 10 - 5))),
    summary: win
      ? "Your arguments demonstrated a solid understanding of your position. While there's room for improvement, you presented your case effectively."
      : "Your defense lacked sufficient evidence and logical structure. The prosecution's arguments were more compelling in this instance.",
    argumentStrength: Math.min(100, finalScore + Math.floor(Math.random() * 15)),
    evidenceUsage: Math.min(100, Math.max(10, finalScore - 10 + Math.floor(Math.random() * 20))),
    logicalConsistency: Math.min(100, finalScore + Math.floor(Math.random() * 10)),
    responseClarity: Math.min(100, Math.max(15, finalScore + 5 + Math.floor(Math.random() * 10))),
    strengths: [
      "Maintained composure under pressure",
      "Addressed the court respectfully",
      ...(finalScore > 60 ? ["Provided logical reasoning for key claims"] : []),
      ...(finalScore > 75 ? ["Referenced evidence effectively"] : []),
    ],
    weaknesses: [
      ...(finalScore < 70 ? ["Could provide more concrete evidence"] : []),
      ...(finalScore < 50 ? ["Arguments lacked logical structure"] : []),
      ...(finalScore < 40 ? ["Failed to counter prosecution's key points"] : []),
      "Some responses were too brief for the complexity of the case",
    ],
    suggestions: [
      "Prepare documented proof such as receipts, contracts, or records",
      "Structure arguments with clear cause-and-effect reasoning",
      "Anticipate counter-arguments and prepare responses",
      "Be specific — avoid vague or emotional statements",
    ],
    legalInsight: `Cases involving ${caseData.type.replace('-', ' ')} often rely heavily on documented evidence and witness testimony. Courts typically favor the party that can present a clear, chronological account supported by verifiable facts. Without concrete evidence, claims become significantly weaker regardless of their truth.`,
    strategy: [
      "Gather all relevant documentation before trial",
      "Create a timeline of events with supporting evidence",
      "Identify and prepare potential witnesses",
      "Consult with a legal professional for case-specific advice",
    ],
    xpEarned: Math.floor(finalScore * 2.5) + 50,
    rank: finalScore >= 80 ? 'Expert' : finalScore >= 50 ? 'Intermediate' : 'Beginner',
    badge: finalScore >= 80 ? '🏆 Master Attorney' : finalScore >= 60 ? '💡 Logical Thinker' : finalScore >= 40 ? '🗣️ Strong Speaker' : '📋 Needs Evidence',
  };
}
