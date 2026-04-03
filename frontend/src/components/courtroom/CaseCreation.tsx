import { useState, type ChangeEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Scale, Lock, Laptop, Home, Building2, FileText, Upload, AlertTriangle, Gavel } from 'lucide-react';
import { CaseData, CaseType } from '@/types/courtroom';
import { uploadCaseFile } from '@/lib/api';

interface CaseCreationProps {
  onSubmit: (data: CaseData) => void;
}

const caseTypes: { value: CaseType; label: string; icon: ReactNode }[] = [
  { value: 'theft', label: 'Theft', icon: <Lock size={18} /> },
  { value: 'cyber-fraud', label: 'Cyber Fraud', icon: <Laptop size={18} /> },
  { value: 'property-dispute', label: 'Property Dispute', icon: <Home size={18} /> },
  { value: 'workplace', label: 'Workplace', icon: <Building2 size={18} /> },
  { value: 'custom', label: 'Custom', icon: <FileText size={18} /> },
];

const CaseCreation = ({ onSubmit }: CaseCreationProps) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CaseType>('theft');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(50);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [timerMinutes, setTimerMinutes] = useState<1 | 2 | 5 | 10>(2);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    onSubmit({ title, type, description, severity, timerMinutes, voiceGender });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setUploadError('');
    setIsUploading(true);
    try {
      const uploaded = await uploadCaseFile(selectedFile);
      setDescription(uploaded.parsed_text);
      if (!title.trim()) {
        const base = selectedFile.name.replace(/\.[^.]+$/, '').trim();
        if (base) {
          setTitle(base);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File upload failed.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
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
      className="min-h-screen flex items-center justify-center py-16 px-4 bg-black relative font-sans"
    >
      {/* Cinematic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
        style={{ backgroundImage: 'url(/landing_bg.png)', filter: 'blur(5px)' }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/80 to-black/95" />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl z-10"
      >
        {/* Document Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex p-4 rounded-full bg-black/40 border border-[#D4AF37]/30 backdrop-blur-sm mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]"
          >
            <Scale size={48} color="#D4AF37" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#D4AF37] tracking-wider drop-shadow-xl uppercase">Official Filing Docket</h2>
          <p className="text-gray-400 font-serif italic mt-3 tracking-widest text-sm uppercase">Submit your records to the High Court</p>
        </div>

        {/* Legal Form Container */}
        <div className="space-y-8 bg-black/50 backdrop-blur-xl border border-[#D4AF37]/30 rounded-lg p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
          
          {/* Faint Court Seal Watermark inside form */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Scale size={300} color="#D4AF37" />
          </div>

          {/* Case Title */}
          <div className="relative z-10">
            <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-2 uppercase tracking-[0.2em]">Section I: Docket Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter official designation..."
              className="w-full bg-transparent border-b-2 border-[#D4AF37]/40 px-2 py-3 text-[#D4AF37] text-xl font-serif placeholder:text-[#D4AF37]/30 placeholder:italic focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          {/* Case Type */}
          <div className="relative z-10 pt-4">
            <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-4 uppercase tracking-[0.2em]">Section II: Violation Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {caseTypes.map(ct => (
                <motion.button
                  key={ct.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setType(ct.value)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-serif cursor-pointer transition-all border rounded-md ${
                    type === ct.value 
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                      : 'bg-black/40 border-[#D4AF37]/20 text-gray-400 hover:border-[#D4AF37]/50 hover:text-gray-200'
                  }`}
                >
                  <span className={type === ct.value ? 'text-[#D4AF37]' : 'text-gray-500'}>{ct.icon}</span>
                  {ct.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="relative z-10 pt-4">
            <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-2 uppercase tracking-[0.2em]">Section III: Statement of Facts</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detail the circumstances, sequence of events, and damages..."
              rows={6}
              className="w-full bg-black/40 border border-[#D4AF37]/30 rounded-md px-4 py-4 text-gray-200 font-serif leading-relaxed placeholder:text-gray-600 focus:outline-none focus:border-[#D4AF37] focus:bg-black/60 transition-colors resize-none shadow-inner"
            />
          </div>

          {/* Evidence */}
          <div className="relative z-10 pt-2">
            <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-3 uppercase tracking-[0.2em]">Section IV: Forensic Exhibits</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {evidence.map(e => (
                <span key={e} className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] text-xs px-3 py-1.5 rounded border border-[#D4AF37]/20 font-mono tracking-wider">
                  <FileText size={14} /> {e}
                </span>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={mockAddEvidence}
              className="flex items-center gap-2 text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] font-serif cursor-pointer border border-dashed border-[#D4AF37]/40 rounded-md px-5 py-3 transition-colors hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]"
            >
              <Upload size={16} /> Attach New Exhibit
            </motion.button>
            <div className="mt-4">
              <label className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-[0.2em] block mb-2">
                Upload Case Text (TXT, MD)
              </label>
              <input
                type="file"
                accept=".txt,text/plain,.md,text/markdown"
                onChange={handleFileUpload}
                className="w-full text-sm text-gray-300 file:mr-4 file:rounded file:border file:border-[#D4AF37]/40 file:bg-black/40 file:px-3 file:py-2 file:text-[#D4AF37] file:font-serif"
              />
              {isUploading && (
                <p className="text-xs text-gray-400 mt-2">Uploading and parsing file...</p>
              )}
              {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
            </div>
          </div>

          <div className="relative z-10 pt-4 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-3 uppercase tracking-[0.2em]">
                Session Timer
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setTimerMinutes(1)}
                  className={`px-4 py-2 rounded border cursor-pointer ${timerMinutes === 1 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  1 Minute
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMinutes(2)}
                  className={`px-4 py-2 rounded border cursor-pointer ${timerMinutes === 2 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  2 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMinutes(5)}
                  className={`px-4 py-2 rounded border cursor-pointer ${timerMinutes === 5 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  5 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMinutes(10)}
                  className={`px-4 py-2 rounded border cursor-pointer ${timerMinutes === 10 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  10 Minutes
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-[#D4AF37] mb-3 uppercase tracking-[0.2em]">
                AI Voice
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setVoiceGender('female')}
                  className={`px-4 py-2 rounded border cursor-pointer ${voiceGender === 'female' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceGender('male')}
                  className={`px-4 py-2 rounded border cursor-pointer ${voiceGender === 'male' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-gray-300'}`}
                >
                  Male
                </button>
              </div>
            </div>
          </div>

          {/* Severity */}
          <div className="relative z-10 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-[0.2em]">
                Section V: Assessed Severity
              </label>
              <span className="flex items-center gap-2 text-red-400 font-mono text-sm border border-red-500/30 px-2 py-0.5 rounded bg-red-900/20">
                <AlertTriangle size={14} /> {severity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full h-2 bg-black/60 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #D4AF37 0%, ${severity > 50 ? '#ff4444' : '#D4AF37'} ${severity}%, transparent ${severity}%)`,
                border: '1px solid rgba(212,175,55,0.3)'
              }}
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-serif uppercase tracking-widest mt-2">
              <span>Minor Offense</span>
              <span>Moderate Claim</span>
              <span className="text-red-900/80">Felony Class</span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-8 relative z-10">
            <motion.button
              whileHover={title.trim() && description.trim() ? { 
                scale: 1.02, 
                boxShadow: '0 0 40px rgba(212,175,55,0.4)',
                borderColor: 'rgba(212,175,55,0.9)',
                backgroundColor: 'rgba(0,0,0,0.8)'
              } : {}}
              whileTap={title.trim() && description.trim() ? { scale: 0.98 } : {}}
              onClick={handleSubmit}
              disabled={!title.trim() || !description.trim()}
              className="w-full flex items-center justify-center gap-3 bg-black/60 border border-[#D4AF37]/50 text-[#D4AF37] disabled:text-gray-600 disabled:border-gray-800 disabled:bg-black/20 px-8 py-5 rounded-md font-serif text-xl tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <Gavel size={24} /> Initiate Trial
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CaseCreation;
