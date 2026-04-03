import { useState } from 'react';
import { motion } from 'framer-motion';
import { CaseData, CaseType } from '@/types/courtroom';
import { uploadCaseFile } from '@/lib/mockApi';

interface CaseCreationProps {
  onSubmit: (data: CaseData) => void;
}

const caseTypes: { value: CaseType; label: string; icon: string }[] = [
  { value: 'theft', label: 'Theft', icon: '🔒' },
  { value: 'cyber-fraud', label: 'Cyber Fraud', icon: '💻' },
  { value: 'property-dispute', label: 'Property Dispute', icon: '🏠' },
  { value: 'workplace', label: 'Workplace Issue', icon: '🏢' },
  { value: 'custom', label: 'Custom', icon: '📋' },
];

const CaseCreation = ({ onSubmit }: CaseCreationProps) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CaseType>('theft');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(50);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const file = new File([description], "case.txt", { type: "text/plain" });
      await uploadCaseFile(file);
    } catch (error) {
      console.error("Failed to upload case file:", error);
    } finally {
      setIsSubmitting(false);
      onSubmit({ title, type, description, severity, voiceGender });
    }
  };

  const mockAddEvidence = () => {
    const names = ['receipt_scan.pdf', 'contract_v2.docx', 'photo_evidence.jpg', 'witness_statement.pdf', 'bank_record.csv'];
    const available = names.filter(n => !evidence.includes(n));
    if (available.length) setEvidence([...evidence, available[0]]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4 bg-background"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📄</div>
          <h2 className="text-3xl font-display font-bold text-primary">Case Filing</h2>
          <p className="text-muted-foreground font-body mt-1 italic">Prepare your legal documents</p>
        </div>

        <div className="space-y-6 bg-card border border-border rounded-lg p-8" style={{ boxShadow: '0 0 40px hsl(0 0% 0% / 0.3)' }}>
          {/* Case Title */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">📜 Case Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter case title..."
              className="w-full bg-muted border border-border rounded-md px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Case Type */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">⚖️ Case Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {caseTypes.map(ct => (
                <motion.button
                  key={ct.value}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setType(ct.value)}
                  className={`court-embossed text-sm font-body cursor-pointer transition-colors ${
                    type === ct.value 
                      ? 'text-primary border-primary/50' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {ct.icon} {ct.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">📝 Case Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your case in detail..."
              rows={5}
              className="w-full bg-muted border border-border rounded-md px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">📁 Evidence</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {evidence.map(e => (
                <span key={e} className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full border border-border font-mono">
                  📎 {e}
                </span>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={mockAddEvidence}
              className="text-sm text-primary/70 hover:text-primary font-body cursor-pointer border border-dashed border-border rounded-md px-4 py-2 transition-colors"
            >
              + Upload Evidence (Mock)
            </motion.button>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">
              🔥 Severity Level: <span className="text-foreground">{severity}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full accent-primary"
              style={{ accentColor: 'hsl(43, 74%, 49%)' }}
            />
            <div className="flex justify-between text-xs text-muted-foreground font-body mt-1">
              <span>Minor</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Submit */}
          <div>
            <label className="block text-sm font-display text-primary mb-2">🎙️ Court Voice Preference</label>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVoiceGender('female')}
                className={`court-embossed text-sm font-body cursor-pointer transition-colors ${
                  voiceGender === 'female' ? 'text-primary border-primary/50' : 'text-muted-foreground'
                }`}
              >
                Female Voice
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVoiceGender('male')}
                className={`court-embossed text-sm font-body cursor-pointer transition-colors ${
                  voiceGender === 'male' ? 'text-primary border-primary/50' : 'text-muted-foreground'
                }`}
              >
                Male Voice
              </motion.button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || isSubmitting}
            className="w-full court-embossed text-primary font-display text-lg tracking-wide cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? "Uploading Case..." : "⚖️ Initiate Trial"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CaseCreation;
