import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import { 
    Award, CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, 
    ArrowLeft, HelpCircle, BookOpen, Loader2, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';

const StudentResultView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const formatBanglaDigits = (num) => {
        if (num === null || num === undefined) return '';
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return num.toString().replace(/[0-9]/g, m => enToBn[m]);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('bn-BD', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    useEffect(() => {
        const fetchResultDetails = async () => {
            try {
                const res = await axios.get(`/v1/student/results/${id}`);
                if (res.data) {
                    setResult(res.data);
                }
            } catch (err) {
                console.error("Error loading result details:", err);
                setError('ফলাফল বিস্তারিত লোড করতে সমস্যা হয়েছে।');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchResultDetails();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-bold text-sm">ফলাফল লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-3xl border border-red-100 shadow-xl text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-red-700 font-black text-lg mb-2">ত্রুটি ঘটেছে</h3>
                <p className="text-slate-600 font-semibold mb-6">{error || 'ফলাফল খুঁজে পাওয়া যায়নি।'}</p>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto"
                >
                    <ArrowLeft size={16} />
                    <span>ড্যাশবোর্ডে ফিরে যান</span>
                </button>
            </div>
        );
    }

    // Counts
    const totalQuestions = result.answers?.length || 0;
    const correctCount = result.answers?.filter(a => a.isCorrect).length || 0;
    const skippedCount = result.answers?.filter(a => a.isSkipped).length || 0;
    const incorrectCount = totalQuestions - correctCount - skippedCount;
    const percent = Math.round((result.score / result.totalMarks) * 100);

    return (
        <div className="max-w-6xl mx-auto my-6 px-4 font-sans">
            {/* Header */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-base leading-snug line-clamp-1">
                            {result.examTitle} — ফলাফল ও উত্তরপত্র
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {result.subjectName} • শ্রেণি: {result.className}
                        </p>
                    </div>
                </div>

                <div className="text-right text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl">
                    <Clock size={14} />
                    <span>জমা দেওয়ার সময়: {formatDate(result.submittedAt)}</span>
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">প্রাপ্ত স্কোর</p>
                        <h3 className="text-xl font-black text-slate-800">
                            {formatBanglaDigits(result.score)} <span className="text-xs text-slate-400">/ {formatBanglaDigits(result.totalMarks)}</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">সঠিক উত্তর</p>
                        <h3 className="text-xl font-black text-emerald-600">{formatBanglaDigits(correctCount)} <span className="text-xs text-slate-400">টি</span></h3>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">ভুল উত্তর</p>
                        <h3 className="text-xl font-black text-red-600">{formatBanglaDigits(incorrectCount)} <span className="text-xs text-slate-400">টি</span></h3>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                        <HelpCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">ছেড়ে দেওয়া</p>
                        <h3 className="text-xl font-black text-slate-600">{formatBanglaDigits(skippedCount)} <span className="text-xs text-slate-400">টি</span></h3>
                    </div>
                </div>
            </div>

            {/* Content Section: Questions & Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left: Questions Booklet */}
                <div className="lg:col-span-2 space-y-6">
                    <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-[0.2em] pl-1">উত্তরপত্র পর্যালোচনা (Booklet Review)</h4>
                    
                    {result.answers?.map((ans, idx) => {
                        const isCorrect = ans.isCorrect;
                        const isSkipped = ans.isSkipped;
                        const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
                        
                        return (
                            <div 
                                key={ans.questionId}
                                id={`question-${idx}`}
                                className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-5"
                            >
                                {/* Question Header */}
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <span className="text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                                        প্রশ্ন: {formatBanglaDigits(idx + 1)}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {isSkipped ? (
                                            <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg">
                                                উত্তর দেওয়া হয়নি
                                            </span>
                                        ) : isCorrect ? (
                                            <span className="text-[10px] font-black bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                সঠিক
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black bg-red-50 border border-red-100 text-red-600 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                <XCircle size={12} />
                                                ভুল
                                            </span>
                                        )}
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                            প্রাপ্ত মান: {formatBanglaDigits(ans.marksObtained)} / {formatBanglaDigits(ans.marks || 1.0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Stimulus and Text */}
                                <div className="space-y-4">
                                    {ans.stimulus && (
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-semibold text-sm leading-relaxed whitespace-pre-line">
                                            {ans.stimulus}
                                        </div>
                                    )}
                                    <h4 className="font-extrabold text-slate-800 text-base leading-relaxed whitespace-pre-line">
                                        {ans.questionText}
                                    </h4>
                                </div>

                                {/* Options */}
                                <div className="space-y-3">
                                    {ans.options?.map((opt, oIdx) => {
                                        const isSelected = ans.selectedOptionId === opt.id.toString();
                                        const isCorrectOpt = opt.isCorrect;
                                        
                                        let boxStyle = "w-full text-left p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-4 cursor-default ";
                                        let labelStyle = "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ";

                                        if (isCorrectOpt) {
                                            boxStyle += "bg-emerald-50/60 border-emerald-500 text-emerald-900";
                                            labelStyle += "bg-emerald-600 text-white";
                                        } else if (isSelected && !isCorrectOpt) {
                                            boxStyle += "bg-red-50/60 border-red-400 text-red-900";
                                            labelStyle += "bg-red-600 text-white";
                                        } else {
                                            boxStyle += "bg-white border-slate-200/80 text-slate-700";
                                            labelStyle += "bg-slate-50 border border-slate-200 text-slate-400";
                                        }

                                        return (
                                            <div 
                                                key={opt.id}
                                                className={boxStyle}
                                            >
                                                <div className={labelStyle}>
                                                    {optionLabels[oIdx] || (oIdx + 1)}
                                                </div>
                                                <div className="flex-1 flex justify-between items-center gap-3">
                                                    <span className="leading-snug">{opt.optionText}</span>
                                                    
                                                    <div className="flex gap-1.5">
                                                        {isCorrectOpt && (
                                                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                                                সঠিক উত্তর
                                                            </span>
                                                        )}
                                                        {isSelected && (
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                                                                isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                আপনার উত্তর
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {ans.explanation && (
                                    <div className="mt-4 p-4 rounded-2xl bg-blue-50/40 border border-blue-100/60 flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <h5 className="font-extrabold text-blue-900 text-xs mb-1">ব্যাখ্যা ও বিশ্লেষণ:</h5>
                                            <p className="text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-line">
                                                {ans.explanation}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Sidebar Navigation */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm sticky top-6">
                        <h4 className="font-extrabold text-slate-800 text-sm mb-4">প্রশ্ন নেভিগেশন ম্যাপ</h4>
                        
                        <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {result.answers?.map((ans, idx) => {
                                const isCorrect = ans.isCorrect;
                                const isSkipped = ans.isSkipped;
                                
                                let btnClasses = "h-10 rounded-xl font-black text-xs transition-all active:scale-[0.93] flex items-center justify-center border ";
                                if (isSkipped) {
                                    btnClasses += "bg-slate-50 border-slate-200 text-slate-400";
                                } else if (isCorrect) {
                                    btnClasses += "bg-emerald-500 border-emerald-600 text-white shadow-sm";
                                } else {
                                    btnClasses += "bg-red-500 border-red-600 text-white shadow-sm";
                                }

                                return (
                                    <a
                                        key={ans.questionId}
                                        href={`#question-${idx}`}
                                        className={btnClasses}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const element = document.getElementById(`question-${idx}`);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }
                                        }}
                                    >
                                        {formatBanglaDigits(idx + 1)}
                                    </a>
                                );
                            })}
                        </div>

                        {/* Color Legend */}
                        <div className="border-t border-slate-100 pt-4 mt-5 space-y-2.5 text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600"></div>
                                <span>সঠিক উত্তর</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-red-500 border border-red-600"></div>
                                <span>ভুল উত্তর</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-slate-50 border border-slate-200"></div>
                                <span>উত্তর না দেওয়া</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StudentResultView;
