import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CaseReport as CaseReportType } from '@/types/courtroom';

interface CaseReportProps {
  report: CaseReportType;
  onRetry: () => void;
  onNewCase: () => void;
}

const CaseReportScreen = ({ report, onRetry, onNewCase }: CaseReportProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return <div className="min-h-screen bg-background" />;

  const score = report.score;
  const win = score >= 50;

  const handleDownload = () => {
    window.print();
  };

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
            <span className="text-sm font-mono text-muted-foreground">Winning Chance: {report.winChance}%</span>
          </div>
          <p className="text-foreground font-body">{report.feedback}</p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-display text-muted-foreground mb-2">📊 SCORE SUMMARY</h3>
          <div className="text-4xl font-display text-primary">{score}/100</div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full rounded-full ${score >= 70 ? 'bg-verdict-green' : score >= 40 ? 'bg-primary' : 'bg-verdict-red'}`}
            />
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-display text-muted-foreground mb-3">📝 DETAILED REPORT (Markdown)</h3>
          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/90 bg-muted/50 rounded p-4 overflow-x-auto">
            {report.markdown || report.feedback}
          </pre>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap gap-3 justify-center pb-8">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onRetry} className="court-embossed text-primary font-display cursor-pointer">
            🔁 Retry Case
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onNewCase} className="court-embossed text-primary font-display cursor-pointer">
            🏠 Start New Session
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDownload} className="court-embossed text-muted-foreground font-display cursor-pointer">
            📥 Download Report
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CaseReportScreen;
