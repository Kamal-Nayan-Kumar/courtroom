import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaseData, DialogueEntry, Speaker } from '@/types/courtroom';
import { getProsecutorResponse, getJudgeQuestion, getJudgeComment, evaluateResponse } from '@/lib/mockApi';
import { playGavel, playObjection, speakText, playScoreUp, playScoreDown } from '@/lib/sounds';

interface CourtroomMainProps {
  caseData: CaseData;
  onVerdict: (score: number) => void;
}

const speakerInfo: Record<Speaker, { label: string; icon: string; color: string }> = {
  judge: { label: 'Judge Harmon', icon: '👨‍⚖️', color: 'text-primary' },
  prosecutor: { label: 'Prosecutor Blake', icon: '🧑‍💼', color: 'text-destructive' },
  defender: { label: 'You (Defender)', icon: '🧑‍💻', color: 'text-gold-light' },
  system: { label: 'Court', icon: '🏛️', color: 'text-muted-foreground' },
};

const TOTAL_ROUNDS = 4;

const CourtroomMain = ({ caseData, onVerdict }: CourtroomMainProps) => {
  const [dialogues, setDialogues] = useState<DialogueEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('judge');
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [score, setScore] = useState(50);
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackLevel, setFeedbackLevel] = useState<'strong' | 'weak' | 'no-evidence'>('weak');
  const [showObjection, setShowObjection] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const typeTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceRef = useRef(false);

  const scrollToBottom = () => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  };

  const typeText = useCallback((text: string, speaker: Speaker): Promise<void> => {
    return new Promise(resolve => {
      setCurrentSpeaker(speaker);
      setIsTyping(true);
      setCurrentText('');
      let i = 0;
      const type = () => {
        if (i < text.length) {
          setCurrentText(text.slice(0, i + 1));
          i++;
          typeTimeoutRef.current = setTimeout(type, 25);
        } else {
          setIsTyping(false);
          setDialogues(prev => [...prev, { speaker, text, timestamp: Date.now() }]);
          setCurrentText('');
          scrollToBottom();
          resolve();
        }
      };
      type();

      if (speaker !== 'system' && speaker !== 'defender') {
        speakText(text, speaker);
      }
    });
  }, []);

  const runSequence = useCallback(async () => {
    if (sequenceRef.current) return;
    sequenceRef.current = true;

    // Opening
    await typeText(`This court is now hearing the case: "${caseData.title}". A ${caseData.type.replace('-', ' ')} matter of severity level ${caseData.severity}%.`, 'judge');
    await new Promise(r => setTimeout(r, 800));
    playGavel();

    await typeText("The prosecution may present their opening argument.", 'judge');
    await new Promise(r => setTimeout(r, 600));

    // Start first round
    await runRound(0);
  }, [caseData, typeText]);

  const runRound = async (r: number) => {
    // Prosecutor
    const prosResp = getProsecutorResponse(r);
    await typeText(prosResp, 'prosecutor');
    await new Promise(res => setTimeout(res, 500));

    // Judge asks defendant
    const judgeQ = getJudgeQuestion(r);
    await typeText(judgeQ, 'judge');
    await new Promise(res => setTimeout(res, 300));

    // Wait for user
    setWaitingForUser(true);
  };

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser) return;
    setWaitingForUser(false);
    const response = userInput;
    setUserInput('');

    // Add user's message
    setDialogues(prev => [...prev, { speaker: 'defender', text: response, timestamp: Date.now() }]);
    scrollToBottom();

    // Evaluate
    const evaluation = evaluateResponse(response);
    const newScore = Math.min(100, Math.max(0, score + evaluation.scoreDelta));
    
    if (evaluation.scoreDelta > 0) playScoreUp();
    else playScoreDown();
    
    setScore(newScore);
    setFeedback(evaluation.feedback);
    setFeedbackLevel(evaluation.level);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2500);

    await new Promise(r => setTimeout(r, 600));

    // Judge comment
    const comment = getJudgeComment();
    await typeText(comment, 'judge');
    playGavel();

    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= TOTAL_ROUNDS) {
      await new Promise(r => setTimeout(r, 800));
      await typeText("The court has heard sufficient arguments. I will now deliver my verdict.", 'judge');
      await new Promise(r => setTimeout(r, 1000));
      onVerdict(newScore);
    } else {
      await new Promise(r => setTimeout(r, 500));
      await runRound(nextRound);
    }
  };

  const handleObjection = () => {
    playObjection();
    setShaking(true);
    setRedFlash(true);
    setShowObjection(true);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setRedFlash(false), 400);
    setTimeout(() => setShowObjection(false), 1500);
    
    // Bonus score
    const bonus = Math.floor(Math.random() * 5) + 3;
    setScore(s => Math.min(100, s + bonus));
    playScoreUp();
  };

  useEffect(() => {
    const timer = setTimeout(runSequence, 500);
    return () => {
      clearTimeout(timer);
      if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    };
  }, [runSequence]);

  const scoreColor = score >= 70 ? 'bg-verdict-green' : score >= 40 ? 'bg-primary' : 'bg-verdict-red';

  return (
    <div className={`min-h-screen flex flex-col bg-background relative ${shaking ? 'screen-shake' : ''}`}>
      {/* Red flash overlay */}
      {redFlash && <div className="absolute inset-0 red-flash z-50 pointer-events-none" />}

      {/* Objection overlay */}
      <AnimatePresence>
        {showObjection && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <span className="text-6xl md:text-8xl font-display font-black text-destructive" style={{ textShadow: '0 0 40px hsl(0 85% 55% / 0.8)' }}>
              OBJECTION!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar - Judge area */}
      <div className="spotlight-effect border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-center">
            <motion.div
              animate={{ boxShadow: currentSpeaker === 'judge' ? '0 0 25px hsl(43 74% 49% / 0.4)' : '0 0 0 transparent' }}
              className="text-center bg-court-wood px-8 py-3 rounded-lg border border-border"
            >
              <div className="text-3xl mb-1">👨‍⚖️</div>
              <p className="text-xs font-display text-primary">Judge Harmon</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col">
        {/* Defender & Prosecutor */}
        <div className="flex justify-between mb-4">
          <motion.div
            animate={{ boxShadow: currentSpeaker === 'defender' ? '0 0 25px hsl(43 80% 65% / 0.4)' : '0 0 0 transparent' }}
            className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-primary/20"
          >
            <span className="text-2xl">🧑‍💻</span>
            <div>
              <p className="text-xs font-display text-gold-light">You</p>
              <p className="text-[10px] text-muted-foreground">Defender</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ boxShadow: currentSpeaker === 'prosecutor' ? '0 0 25px hsl(0 72% 51% / 0.3)' : '0 0 0 transparent' }}
            className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-border"
          >
            <div className="text-right">
              <p className="text-xs font-display text-destructive">Prosecutor Blake</p>
              <p className="text-[10px] text-muted-foreground">Prosecution</p>
            </div>
            <span className="text-2xl">🧑‍💼</span>
          </motion.div>
        </div>

        {/* Chat / Dialogue area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px] max-h-[400px] bg-muted/30 rounded-lg p-4 border border-border">
          {dialogues.map((d, i) => {
            const info = speakerInfo[d.speaker];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${d.speaker === 'defender' ? 'flex-row-reverse' : ''}`}
              >
                <span className="text-xl flex-shrink-0">{info.icon}</span>
                <div className={`max-w-[80%] ${d.speaker === 'defender' ? 'text-right' : ''}`}>
                  <p className={`text-[10px] font-display ${info.color} mb-0.5`}>{info.label}</p>
                  <p className="text-sm font-body text-foreground bg-card px-3 py-2 rounded-lg border border-border inline-block text-left">
                    {d.text}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Currently typing */}
          {isTyping && currentText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <span className="text-xl">{speakerInfo[currentSpeaker].icon}</span>
              <div>
                <p className={`text-[10px] font-display ${speakerInfo[currentSpeaker].color} mb-0.5`}>
                  {speakerInfo[currentSpeaker].label}
                </p>
                <p className="text-sm font-body text-foreground bg-card px-3 py-2 rounded-lg border border-border inline-block cursor-blink">
                  {currentText}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Feedback popup */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center text-sm font-body mb-2 px-3 py-1 rounded-full mx-auto ${
                feedbackLevel === 'strong' ? 'text-verdict-green bg-verdict-green/10' :
                feedbackLevel === 'weak' ? 'text-primary bg-primary/10' :
                'text-verdict-red bg-verdict-red/10'
              }`}
            >
              {feedbackLevel === 'strong' ? '🟢' : feedbackLevel === 'weak' ? '🟡' : '🔴'} {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls */}
        <div className="border-t border-border pt-4 space-y-3">
          {/* Score bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-display text-muted-foreground">🎯 SCORE</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden border border-border">
                <motion.div
                  animate={{ width: `${score}%` }}
                  transition={{ type: 'spring', stiffness: 100 }}
                  className={`h-full ${scoreColor} rounded-full`}
                />
              </div>
              <span className="text-sm font-mono text-foreground w-8 text-right">{score}</span>
            </div>
            <span className="text-xs font-display text-muted-foreground">
              ⏱ Round {Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
            </span>
          </div>

          {/* Input + Objection */}
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUserSubmit()}
              disabled={!waitingForUser}
              placeholder={waitingForUser ? "Present your argument..." : "Waiting for court proceedings..."}
              className="flex-1 bg-muted border border-border rounded-md px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUserSubmit}
              disabled={!waitingForUser || !userInput.trim()}
              className="court-embossed text-primary font-display cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4"
            >
              Send
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleObjection}
              disabled={!waitingForUser}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-display text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 15px hsl(0 85% 55% / 0.3)' }}
            >
              🔴 OBJECTION!
            </motion.button>
          </div>
        </div>
      </div>

      {/* Audience */}
      <div className="text-center py-2 opacity-20 text-lg tracking-widest select-none">
        👤👤👤👤👤👤👤👤
      </div>
    </div>
  );
};

export default CourtroomMain;
