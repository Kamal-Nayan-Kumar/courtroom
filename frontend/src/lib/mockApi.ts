import { CaseData, CaseReport } from '@/types/courtroom';

export async function uploadCaseFile(file: File): Promise<{ filename: string; content_type: string; char_count: number; parsed_text: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/v1/cases/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}

export async function generateTrialSuggestions(state: Record<string, unknown>): Promise<{ suggestions: string[] }> {
  const response = await fetch('/api/v1/trial/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error('Suggest failed');
  return response.json();
}

export async function generateCaseReport(caseData: CaseData, finalScore: number): Promise<CaseReport> {
  const win = finalScore >= 50;
  // Fallback structure but ideally you'd construct request and fetch from /api/v1/trial/report
  // We'll call the real endpoint and map it to our CaseReport type
  try {
    const response = await fetch('/api/v1/trial/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_details: caseData.description,
        evidence_list: [], // Provide actual evidence if tracked
        transcript: [], // Provide actual transcript if tracked
        current_turn: "end",
        trial_status: "complete"
      }),
    });
    if (!response.ok) throw new Error('Report failed');
    const result = await response.json();
    return {
      verdict: win ? 'win' : 'lose',
      confidenceScore: Math.min(100, Math.max(0, finalScore + Math.floor(Math.random() * 10 - 5))),
      summary: result.feedback || (win
        ? "Your arguments demonstrated a solid understanding of your position. While there's room for improvement, you presented your case effectively."
        : "Your defense lacked sufficient evidence and logical structure. The prosecution's arguments were more compelling in this instance."),
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
  } catch (e) {
    // Fallback to mock logic if the network request fails
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
}

