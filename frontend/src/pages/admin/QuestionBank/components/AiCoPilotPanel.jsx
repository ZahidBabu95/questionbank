import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, AlertTriangle, XCircle, Sparkles, RefreshCw, CheckCheck, Edit3, X, ShieldCheck, Clock, ArrowRight, Zap, GitCompare, Info, FileText, Loader2, Search } from 'lucide-react';
import questionService from '../../../../services/questionService';

const AiCoPilotPanel = ({ question, onUpdateQuestion, onNextQuestion }) => {
    const [auditing, setAuditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reviewerNotes, setReviewerNotes] = useState('');
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [auditData, setAuditData] = useState(null);

    // Get current logged-in user and check roles
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAuthorizedReviewer = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN' || roleName === 'REVIEWER' || roleName === 'ROLE_REVIEWER';
    }) || user?.email === 'admin' || user?.email?.includes('admin');

    // Live timer effect counting seconds spent on this question
    useEffect(() => {
        setTimerSeconds(0);
        const interval = setInterval(() => {
            setTimerSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [question?.id]);

    // Parse suggestions JSON when question or suggestions change
    useEffect(() => {
        if (!question?.aiAuditSuggestions) {
            setAuditData(null);
            if (question?.id && !auditing) {
                handleRunAudit();
            }
            return;
        }
        try {
            setAuditData(JSON.parse(question.aiAuditSuggestions));
        } catch {
            setAuditData(null);
        }
    }, [question?.id, question?.aiAuditSuggestions]);

    const handleRunAudit = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!question?.id) return;
        setAuditing(true);
        try {
            const res = await questionService.runAiAudit(question.id);
            if (res.data) {
                setAuditData(res.data);
                if (onUpdateQuestion) {
                    onUpdateQuestion({
                        ...question,
                        aiAuditScore: res.data.qualityScore,
                        aiAuditSuggestions: res.data.rawSuggestionsJson,
                        aiFlagged: res.data.qualityScore < 80 || !res.data.topicMatch
                    });
                }
            }
        } catch (err) {
            console.error("Failed to run AI Audit:", err);
        } finally {
            setAuditing(false);
        }
    };

    const handleDecision = async (decisionStatus, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!question?.id) return;
        setSubmitting(true);
        try {
            const res = await questionService.submitReviewerDecision(question.id, {
                decision: decisionStatus,
                notes: reviewerNotes,
                timeSpentSeconds: timerSeconds
            });
            if (res.data && onUpdateQuestion) {
                onUpdateQuestion(res.data);
            }
            if (onNextQuestion) onNextQuestion();
        } catch (err) {
            console.error("Failed to submit reviewer decision:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApplyAiFix = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!auditData || !onUpdateQuestion) return;
        const updated = { ...question };
        if (auditData.proposedQuestionText && auditData.proposedQuestionText.trim() !== '') {
            updated.questionText = auditData.proposedQuestionText;
        }
        if (auditData.proposedExplanation && auditData.proposedExplanation.trim() !== '') {
            updated.explanation = auditData.proposedExplanation;
        }
        if (auditData.suggestedTopicName) {
            updated.topicName = auditData.suggestedTopicName;
        }
        onUpdateQuestion(updated);
    };

    const formatTimer = (totalSec) => {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const qualityScore = question?.aiAuditScore || auditData?.qualityScore || null;
    const checks = auditData?.checks || [];
    const suggestedTopic = auditData?.suggestedTopicName || '';
    const proposedQText = auditData?.proposedQuestionText || '';
    const issueSummary = auditData?.issueSummary || '';

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col gap-4">
            {/* Header & Live Review Time Tracker */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                        <Bot size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            AI Quality Co-Pilot Agent
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                                {auditing ? 'অডিট চলছে...' : question?.status === 'HUMAN_REVIEWED' ? 'হিউম্যান রিভিউড' : 'AI অডিটকৃত'}
                            </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">বিষয়ভিত্তিক রিভিউয়ার সহায়তায় রিয়েল-টাইম এআই ডায়াগনস্টিক</p>
                    </div>
                </div>

                {/* Live Timer Tracker */}
                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-amber-400 flex items-center gap-1" title="Time spent reviewing this question">
                        <Clock size={13} className="animate-pulse text-amber-400" />
                        <span>⏱️ {formatTimer(timerSeconds)}</span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => handleRunAudit(e)}
                        disabled={auditing}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all border border-indigo-500/50 active:scale-95 disabled:opacity-50 flex items-center gap-1 text-xs font-bold"
                        title="Re-run AI Audit"
                    >
                        <RefreshCw size={14} className={auditing ? "animate-spin text-white" : ""} />
                        <span>{auditing ? 'অডিট হচ্ছে...' : 'অডিট স্ক্যান'}</span>
                    </button>
                </div>
            </div>

            {/* Auditing Spinner State */}
            {auditing && (
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-200">এআই কোপাইলট এজেন্ট প্রশ্নটি বিশ্লেষণ ও ডায়াগনস্টিক তৈরি করছে...</span>
                </div>
            )}

            {/* Quality Score Gauge */}
            {!auditing && qualityScore !== null && (
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-400 font-medium">Quality Score (এআই কনফিডেন্স)</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black font-mono ${qualityScore >= 85 ? 'text-emerald-400' : qualityScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {qualityScore}%
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Confidence</span>
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                        qualityScore >= 85 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        qualityScore >= 70 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                        <ShieldCheck size={14} />
                        {qualityScore >= 85 ? 'হাই কোয়ালিটি (Pass)' : qualityScore >= 70 ? 'রিভিউ প্রয়োজন (Warning)' : 'সন্দেহজনক প্রশ্ন (Action Needed)'}
                    </div>
                </div>
            )}

            {/* If No Checks or Legacy Data: Show Live Scan Prompt */}
            {!auditing && checks.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-center flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <Search size={15} />
                        <span>বিস্তারিত অডিট রিপোর্ট তৈরি করতে অডিট স্ক্যান ক্লিক করুন</span>
                    </div>
                    <p className="text-slate-300 text-[11px] max-w-xs">
                        এই প্রশ্নটির গিটহাব স্টাইল টাইপো ডিফারেন্স ও টপিক অডিট রিপোর্ট দেখতে নিচের বাটনে ক্লিক করুন।
                    </p>
                    <button
                        type="button"
                        onClick={(e) => handleRunAudit(e)}
                        disabled={auditing}
                        className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 mt-1"
                    >
                        <Sparkles size={14} /> ✨ রান এআই অডিট স্ক্যান (Live Scan)
                    </button>
                </div>
            )}

            {/* Diagnostic Executive Summary */}
            {!auditing && (issueSummary || suggestedTopic || proposedQText) && (
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                            <Info size={14} /> 📢 এআই ডায়াগনস্টিক সারসংক্ষেপ
                        </span>
                        {(proposedQText || (suggestedTopic && suggestedTopic !== question?.topicName)) && (
                            <button
                                type="button"
                                onClick={(e) => handleApplyAiFix(e)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow active:scale-95 flex items-center gap-1"
                            >
                                <Zap size={13} /> ⚡ 1-Click Auto Fix All
                            </button>
                        )}
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                        {issueSummary || (suggestedTopic && suggestedTopic !== question?.topicName ? `প্রশ্নটির টপিক অসামঞ্জস্যপূর্ণ। প্রস্তাবিত টপিক: ${suggestedTopic}` : 'প্রশ্নটিতে কিছু টাইপো বা ফরম্যাটিং ফিক্স প্রস্তাব করা হয়েছে।')}
                    </p>
                </div>
            )}

            {/* GitHub Style Proposed Fix (Diff View) */}
            {!auditing && proposedQText && proposedQText !== question?.questionText && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                            <GitCompare size={14} /> AI Proposed Fix (GitHub Diff View)
                        </span>
                        <button
                            type="button"
                            onClick={(e) => handleApplyAiFix(e)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded transition-all active:scale-95"
                        >
                            ⚡ এআই ফিক্স লাগান
                        </button>
                    </div>

                    <div className="text-xs font-mono rounded-lg overflow-hidden border border-slate-800 space-y-1 p-2">
                        {/* Red: Original Text */}
                        <div className="bg-rose-950/40 text-rose-300 p-2 rounded border border-rose-500/30 line-through">
                            - {question?.questionText}
                        </div>
                        {/* Green: Proposed Fix */}
                        <div className="bg-emerald-950/40 text-emerald-300 p-2 rounded border border-emerald-500/30">
                            + {proposedQText}
                        </div>
                    </div>
                </div>
            )}

            {/* Topic Accuracy Warning & Auto Fix */}
            {!auditing && suggestedTopic && suggestedTopic !== question?.topicName && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <AlertTriangle size={14} />
                            <span>টপিক অসঙ্গতি চিহ্নিত</span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                            বর্তমান টপিক: <strong className="text-slate-400">{question?.topicName || 'অনির্ধারিত'}</strong> ➔ প্রস্তাবিত: <strong className="text-amber-300">{suggestedTopic}</strong>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => handleApplyAiFix(e)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded-lg shrink-0 transition-all active:scale-95 flex items-center gap-1"
                    >
                        🎯 টপিক কারেক্ট করুন
                    </button>
                </div>
            )}

            {/* Audit Checklist Items */}
            {!auditing && checks.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">এআই অডিট চেকলিস্ট ডায়াগনস্টিকস</h5>
                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                        {checks.map((chk, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                chk.status === 'PASS' ? 'bg-slate-800/60 border-slate-700/60' :
                                chk.status === 'WARNING' ? 'bg-amber-950/30 border-amber-500/30' :
                                'bg-rose-950/30 border-rose-500/30'
                            }`}>
                                {chk.status === 'PASS' && <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
                                {chk.status === 'WARNING' && <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />}
                                {chk.status === 'FAIL' && <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-100">
                                            {chk.category === 'TOPIC_ALIGNMENT' ? '📌 টপিক সামঞ্জস্যতা (Topic)' :
                                             chk.category === 'TYPO_GRAMMAR' ? '📝 বানান ও টাইপো ইনস্পেকশন (Typo)' :
                                             chk.category === 'MCQ_OPTIONS' ? '📋 অপশন ও কাঠামোগত সঠিকতা (Options)' :
                                             chk.category === 'BLOOM_LEVEL' ? '🎓 বুলুমস ট্যাক্সোনোমি (Bloom Level)' :
                                             chk.category}
                                        </span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                            chk.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300' :
                                            chk.status === 'WARNING' ? 'bg-amber-500/20 text-amber-300' :
                                            'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            {chk.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-[11px]">{chk.message}</p>
                                    {chk.suggestion && (
                                        <p className="text-[11px] text-indigo-300 bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20 font-mono">
                                            💡 প্রস্তাবিত ফিক্স: {chk.suggestion}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Human Reviewer Section */}
            <div className="border-t border-slate-800 pt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">সাবজেক্ট রিভিউয়ার সিদ্ধান্ত (Payment Ledger Audit)</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {user ? `${user.name || user.email} (${user.roles?.[0]?.name || 'Reviewer'})` : 'Guest'}
                    </span>
                </div>

                {!isAuthorizedReviewer && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold text-center">
                        ⚠️ শুধুমাত্র সাবজেক্ট রিভিউয়ার ও সুপার অ্যাডমিন রিভিউ সম্পন্ন করতে পারবেন।
                    </div>
                )}
                
                <textarea
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    disabled={!isAuthorizedReviewer}
                    placeholder="রিভিউয়ার নোটস/মন্তব্য লিখুন (ঐচ্ছিক)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-16 disabled:opacity-50"
                />

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={(e) => handleDecision('HUMAN_REVIEWED', e)}
                        disabled={submitting || !isAuthorizedReviewer}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                        <CheckCheck size={15} /> Mark as Reviewed
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleDecision('HUMAN_REVISED', e)}
                        disabled={submitting || !isAuthorizedReviewer}
                        className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                        <Edit3 size={15} /> Revised
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleDecision('REJECTED', e)}
                        disabled={submitting || !isAuthorizedReviewer}
                        className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                        <X size={15} /> Reject
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiCoPilotPanel;
