import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CaseReport as CaseReportType } from '@/types/courtroom';

interface CaseReportProps {
  report: CaseReportType;
  onRetry: () => void;
  onNewCase: () => void;
}

const ProgressBar = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="font-body text-foreground">{label}</span>
      <span className="font-mono text-muted-foreground">{value}%</span>
    </div>
    <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, delay: 0.3 }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  </div>
);

const getBarColor = (v: number) => v >= 70 ? 'bg-verdict-green' : v >= 40 ? 'bg-primary' : 'bg-verdict-red';

const CaseReportScreen = ({ report, onRetry, onNewCase }: CaseReportProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return <div className="min-h-screen bg-background" />;

  const win = report.verdict === 'win';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-background py-8 px-4"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <h1 className="text-3xl font-display font-bold text-primary">Case Analysis Report</h1>
          <p className="text-muted-foreground font-body italic">AI-generated legal feedback</p>
        </motion.div>

        {/* Verdict Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">🧾 FINAL RESULT</h3>
          <div className="flex items-center gap-4 mb-3">
            <span className={`text-3xl font-display font-black ${win ? 'text-verdict-green' : 'text-verdict-red'}`}>
              {win ? '✅ NOT GUILTY' : '❌ GUILTY'}
            </span>
            <span className="text-sm font-mono text-muted-foreground">Confidence: {report.confidenceScore}%</span>
          </div>
          <p className="text-foreground font-body">{report.summary}</p>
        </motion.div>

        {/* Performance */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-display text-muted-foreground mb-2">📊 PERFORMANCE BREAKDOWN</h3>
          <ProgressBar value={report.argumentStrength} label="Argument Strength" color={getBarColor(report.argumentStrength)} />
          <ProgressBar value={report.evidenceUsage} label="Evidence Usage" color={getBarColor(report.evidenceUsage)} />
          <ProgressBar value={report.logicalConsistency} label="Logical Consistency" color={getBarColor(report.logicalConsistency)} />
          <ProgressBar value={report.responseClarity} label="Response Clarity" color={getBarColor(report.responseClarity)} />
        </motion.div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-display text-muted-foreground mb-3">⚖️ KEY STRENGTHS</h3>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-sm font-body text-foreground flex gap-2">
                  <span className="text-verdict-green">✓</span> {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-display text-muted-foreground mb-3">⚠️ WEAKNESSES</h3>
            <ul className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="text-sm font-body text-foreground flex gap-2">
                  <span className="text-verdict-red">✗</span> {w}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Suggestions */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">💡 IMPROVEMENT SUGGESTIONS</h3>
          <ul className="space-y-2">
            {report.suggestions.map((s, i) => (
              <li key={i} className="text-sm font-body text-foreground flex gap-2">
                <span className="text-primary">→</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Legal Insight */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">📚 LEGAL INSIGHT</h3>
          <p className="text-sm font-body text-foreground italic">{report.legalInsight}</p>
        </motion.div>

        {/* Strategy */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">🧠 RECOMMENDED STRATEGY</h3>
          <ul className="space-y-2">
            {report.strategy.map((s, i) => (
              <li key={i} className="text-sm font-body text-foreground flex gap-2">
                <span className="text-primary">{i + 1}.</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Gamification */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">🎮 GAMIFICATION SUMMARY</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display text-primary">{report.xpEarned}</p>
              <p className="text-xs text-muted-foreground font-body">XP Earned</p>
            </div>
            <div>
              <p className="text-2xl font-display text-foreground">{report.rank}</p>
              <p className="text-xs text-muted-foreground font-body">Rank</p>
            </div>
            <div>
              <p className="text-2xl">{report.badge.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground font-body">{report.badge.split(' ').slice(1).join(' ')}</p>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap gap-3 justify-center pb-8">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onRetry} className="court-embossed text-primary font-display cursor-pointer">
            🔁 Retry Case
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onNewCase} className="court-embossed text-primary font-display cursor-pointer">
            📋 Start New Case
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="court-embossed text-muted-foreground font-display cursor-pointer">
            📥 Download Report
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CaseReportScreen;
