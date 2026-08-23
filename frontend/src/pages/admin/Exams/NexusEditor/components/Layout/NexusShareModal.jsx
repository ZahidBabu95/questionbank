import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    X, Share2, Copy, Check, FileText, Smartphone, 
    AlertTriangle, Loader2, Save, Send, Globe, Sparkles
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';
import axiosInstance from '../../../../../../utils/axios';

const NexusShareModal = () => {
    const { 
        showShareModal, setShowShareModal, 
        examData, setExamData, 
        docSettings, uiLang, 
        isSavingDocument 
    } = useNexusEditor();
    const { handleSaveDocument } = useExamManager();
    const { id: routeId } = useParams();

    const currentExamId = routeId || examData?.id;
    const examTitle = docSettings?.exam || examData?.title || (uiLang === 'bn' ? 'পরীক্ষার প্রশ্নপত্র' : 'Exam Paper');
    const examStatus = examData?.status || 'PUBLISHED';

    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);
    const [mobileShareCode, setMobileShareCode] = useState('');
    const [isMobileShared, setIsMobileShared] = useState(true);
    const [isSyncingMobile, setIsSyncingMobile] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Sync mobile share data when modal opens
    useEffect(() => {
        if (showShareModal && currentExamId && examStatus !== 'DRAFT') {
            const syncMobileShare = async () => {
                setIsSyncingMobile(true);
                try {
                    const res = await axiosInstance.post(`/v1/exams/generate/${currentExamId}/mobile-share`, {
                        isPublicShared: true
                    });
                    if (res.data && res.data.success) {
                        setMobileShareCode(res.data.data.shareCode || '');
                        setIsMobileShared(res.data.data.isPublicShared ?? true);
                    }
                } catch (err) {
                    console.warn('Could not sync mobile share config', err);
                } finally {
                    setIsSyncingMobile(false);
                }
            };
            syncMobileShare();
        }
    }, [showShareModal, currentExamId, examStatus]);

    if (!showShareModal) return null;

    const shareUrl = currentExamId ? `${window.location.origin}/exams/share/${currentExamId}` : '';
    const generatedPin = mobileShareCode || (currentExamId ? `EX-${String(currentExamId).substring(0, 6).toUpperCase()}` : 'EX-849201');

    const handleCopyLink = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyPin = () => {
        if (!generatedPin) return;
        navigator.clipboard.writeText(generatedPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const handleToggleMobileShare = async () => {
        if (!currentExamId) return;
        try {
            const nextState = !isMobileShared;
            const res = await axiosInstance.post(`/v1/exams/generate/${currentExamId}/mobile-share`, {
                isPublicShared: nextState
            });
            if (res.data && res.data.success) {
                setIsMobileShared(res.data.data.isPublicShared);
                if (res.data.data.shareCode) {
                    setMobileShareCode(res.data.data.shareCode);
                }
            }
        } catch (err) {
            console.error('Failed to toggle mobile share', err);
        }
    };

    const handlePublishExam = async () => {
        if (!currentExamId) return;
        setIsPublishing(true);
        try {
            const res = await axiosInstance.put(`/v1/exams/generate/${currentExamId}`, {
                status: 'PUBLISHED'
            });
            if (res.data && res.data.success) {
                if (setExamData) {
                    setExamData(prev => ({ ...(prev || {}), status: 'PUBLISHED' }));
                }
                // Sync mobile share code
                try {
                    const mobileRes = await axiosInstance.post(`/v1/exams/generate/${currentExamId}/mobile-share`, {
                        isPublicShared: true
                    });
                    if (mobileRes.data && mobileRes.data.success) {
                        setMobileShareCode(mobileRes.data.data.shareCode || '');
                        setIsMobileShared(mobileRes.data.data.isPublicShared ?? true);
                    }
                } catch (e) {
                    console.warn(e);
                }
            }
        } catch (err) {
            console.error('Failed to publish exam', err);
            alert(uiLang === 'bn' ? 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update exam status.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="fixed inset-0" 
                onClick={() => setShowShareModal(false)} 
            />

            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 relative z-10 font-outfit text-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header Row */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                {uiLang === 'bn' ? 'প্রশ্নপত্র শেয়ার করুন' : 'Share Exam Paper'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                {uiLang === 'bn' 
                                    ? 'লিংক বা অ্যাপ কোডের মাধ্যমে প্রশ্নপত্রটি সরাসরি শেয়ার করুন।' 
                                    : 'Share direct exam link or mobile app code.'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowShareModal(false)}
                        className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors border border-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Case 1: Exam is not saved yet */}
                {!currentExamId ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
                            <AlertTriangle size={28} className="animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-slate-800 text-sm">
                                {uiLang === 'bn' ? 'প্রশ্নপত্রটি এখনও সংরক্ষিত হয়নি' : 'Exam Not Saved Yet'}
                            </h4>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                {uiLang === 'bn' 
                                    ? 'শেয়ারিং লিংক ও মোবাইল পিন জেনারেট করার জন্য প্রথমে প্রশ্নপত্রটি সেভ করুন।' 
                                    : 'Please save the exam first to generate a shareable link and mobile PIN.'}
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                if (handleSaveDocument) {
                                    await handleSaveDocument();
                                }
                            }}
                            disabled={isSavingDocument}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-2 mx-auto active:scale-95 transition-all"
                        >
                            {isSavingDocument ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span>{uiLang === 'bn' ? 'এখনই সেভ করুন' : 'Save Now'}</span>
                        </button>
                    </div>
                ) : examStatus === 'DRAFT' ? (
                    /* Case 2: Exam is currently in DRAFT status */
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black text-amber-900">
                                    {uiLang === 'bn' ? 'পরীক্ষাটি ড্রাফট (Draft) অবস্থায় আছে' : 'Exam is currently in Draft'}
                                </h4>
                                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                    {uiLang === 'bn' 
                                        ? 'ড্রাফট মোডে থাকলে শিক্ষার্থীরা বা সাধারণ ব্যবহারকারীরা প্রশ্ন দেখতে পারে না। শেয়ার করতে হলে স্ট্যাটাস পাবলিশ করুন।' 
                                        : 'Draft exams cannot be viewed publicly. Publish the exam to activate public sharing.'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                                <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-slate-800 text-xs truncate">{examTitle}</h5>
                                <span className="text-[10px] font-extrabold text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-md mt-0.5 inline-block">DRAFT</span>
                            </div>
                        </div>

                        <button
                            onClick={handlePublishExam}
                            disabled={isPublishing}
                            className="w-full p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-between active:scale-[0.99] group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center font-black">
                                    ✓
                                </span>
                                <div className="text-left">
                                    <span className="block text-xs font-black">
                                        {uiLang === 'bn' ? 'পরীক্ষাটি পাবলিশ ও শেয়ার সক্রিয় করুন' : 'Publish & Enable Sharing'}
                                    </span>
                                    <span className="block text-[10px] text-emerald-100 font-medium">
                                        {uiLang === 'bn' ? 'অনলাইন শেয়ার লিংক ও মোবাইল অ্যাপ লাইভ হবে' : 'Live for web links and mobile app PIN'}
                                    </span>
                                </div>
                            </div>
                            {isPublishing ? (
                                <Loader2 size={16} className="animate-spin text-white" />
                            ) : (
                                <Send size={15} className="group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                    </div>
                ) : (
                    /* Case 3: Normal Active Share View */
                    <div className="space-y-4">
                        {/* Exam Info Preview */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-slate-800 text-xs truncate">{examTitle}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">ID: {currentExamId}</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-200/80 shrink-0 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {uiLang === 'bn' ? 'পাবলিশ্ড' : 'Published'}
                            </span>
                        </div>

                        {/* Direct Share Link Box */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                                {uiLang === 'bn' ? 'শেয়ারিং লিংক (Shareable Link)' : 'Shareable Link'}
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={shareUrl}
                                    className="bg-slate-50 border border-slate-200/80 text-xs font-semibold rounded-xl px-3 py-2.5 flex-1 outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                        copiedLink 
                                            ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                                            : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20'
                                    }`}
                                >
                                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedLink ? (uiLang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (uiLang === 'bn' ? 'কপি করুন' : 'Copy')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Social Share Shortcuts */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${examTitle}\nদেখতে এখানে ক্লিক করুন: ${shareUrl}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                <span>{uiLang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}</span>
                            </a>

                            <a
                                href={`mailto:?subject=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${examTitle}`)}&body=${encodeURIComponent(`হ্যালো,\n\nএখানে পরীক্ষার প্রশ্নপত্রটির লিংক শেয়ার করা হলো:\n${shareUrl}\n\nধন্যবাদ!`)}`}
                                className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                <span>{uiLang === 'bn' ? 'ইমেইল' : 'Email'}</span>
                            </a>
                        </div>

                        {/* Mobile App PIN Section */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-slate-50 rounded-2xl border border-indigo-100/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                                    <Smartphone size={14} className="text-indigo-600" />
                                    <span>{uiLang === 'bn' ? 'মোবাইল অ্যাপ পিন (Exam PIN)' : 'Mobile Exam PIN'}</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleToggleMobileShare}
                                    className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border transition-all ${
                                        isMobileShared 
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                            : 'bg-slate-200 text-slate-600 border-slate-300'
                                    }`}
                                >
                                    {isMobileShared ? '✓ Mobile ON' : 'Mobile OFF'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl font-black font-mono text-indigo-700 tracking-wider">
                                        {generatedPin}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {uiLang === 'bn' ? 'মোবাইল অ্যাপে এই পিন দিয়ে সরাসরি এক্সাম দেওয়া যাবে' : 'Use this PIN in mobile app to access exam'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyPin}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                        copiedPin 
                                            ? 'bg-emerald-600 text-white' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                    }`}
                                >
                                    {copiedPin ? <Check size={13} /> : <Copy size={13} />}
                                    <span>{copiedPin ? (uiLang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (uiLang === 'bn' ? 'PIN কপি' : 'Copy PIN')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={() => setShowShareModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                        {uiLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NexusShareModal;
