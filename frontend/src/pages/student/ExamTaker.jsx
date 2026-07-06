import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import { 
    Clock, Award, Play, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, 
    Flag, RotateCcw, HelpCircle, Loader2, ArrowLeft, Check, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExamTaker = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Exam taking states
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // questionId -> selectedOptionId
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [examStarted, setExamStarted] = useState(false);
    
    // Actions states
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const formatBanglaDigits = (num) => {
        if (num === null || num === undefined) return '';
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return num.toString().replace(/[0-9]/g, m => enToBn[m]);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const formattedMins = mins.toString().padStart(2, '0');
        const formattedSecs = secs.toString().padStart(2, '0');
        return `${formatBanglaDigits(formattedMins)}:${formatBanglaDigits(formattedSecs)}`;
    };

    // Load Exam Data
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const res = await axios.get(`/v1/student/exams/${id}`);
                if (res.data) {
                    setExam(res.data);
                    setTimeLeft(res.data.durationMinutes * 60);
                }
            } catch (err) {
                console.error("Error fetching exam:", err);
                setError(err.response?.data?.message || 'পরীক্ষাটি লোড করতে সমস্যা হয়েছে বা আপনি এই পরীক্ষার জন্য অনুমোদিত নন।');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchExam();
        }
    }, [id]);

    // Timer Effect
    useEffect(() => {
        if (examStarted && !submitted && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        // Auto Submit
                        handleSubmit(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [examStarted, submitted, timeLeft]);

    // Handle Option Selection
    const handleSelectOption = (questionId, optionId) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    // Handle Flag for Review
    const toggleMarkForReview = (questionId) => {
        setMarkedForReview(prev => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });
    };

    // Clear answer for current question
    const handleClearAnswer = (questionId) => {
        setAnswers(prev => {
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    };

    // Submit Exam
    const handleSubmit = async (auto = false) => {
        if (submitting || submitted) return;
        setSubmitting(true);
        setShowConfirmModal(false);

        if (timerRef.current) clearInterval(timerRef.current);

        try {
            // Prepare submission payload
            // Backend expects: Map<String, String> answers
            const formattedAnswers = {};
            exam.questions.forEach(q => {
                const qId = q.originalQuestionId || q.id;
                formattedAnswers[qId.toString()] = answers[q.id.toString()] || "";
            });

            const res = await axios.post(`/v1/student/exams/${id}/submit`, {
                answers: formattedAnswers
            });

            if (res.data) {
                setResult(res.data);
                setSubmitted(true);
            }
        } catch (err) {
            console.error("Error submitting exam:", err);
            setError('পরীক্ষাটি জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
            // Resume timer if not auto-submitted
            if (!auto) {
                setTimeLeft(prev => prev);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartExam = () => {
        setExamStarted(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-bold text-sm">পরীক্ষা লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
            </div>
        );
    }

    if (error && !submitted) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-3xl border border-red-100 shadow-xl text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-red-700 font-black text-lg mb-2">ত্রুটি ঘটেছে</h3>
                <p className="text-slate-600 font-semibold mb-6">{error}</p>
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

    // Start Screen
    if (!examStarted && exam) {
        return (
            <div className="max-w-2xl mx-auto my-8 md:my-12 font-sans">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] border border-slate-200/80 p-8 md:p-10 shadow-xl relative overflow-hidden"
                >
                    {/* Background Soft Glow */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="text-center space-y-4">
                        <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {exam.subjectName || 'সাধারণ বিষয়'} ({exam.className})
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {exam.title}
                        </h2>
                        <p className="text-slate-500 font-semibold max-w-lg mx-auto">
                            পরীক্ষা শুরু করার পূর্বে নিচের নির্দেশনাবলী মনোযোগ দিয়ে পড়ুন।
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-8">
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Clock size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মোট সময়</p>
                                <p className="text-base font-black text-slate-800">{formatBanglaDigits(exam.durationMinutes)} মিনিট</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <Award size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মোট নম্বর</p>
                                <p className="text-base font-black text-slate-800">{formatBanglaDigits(exam.totalMarks)} নম্বর</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
                        <h4 className="text-slate-800 font-black text-sm flex items-center gap-2">
                            <HelpCircle size={18} className="text-blue-500" />
                            পরীক্ষার নির্দেশনাবলী:
                        </h4>
                        <ul className="space-y-2.5 text-xs font-bold text-slate-500 list-disc list-inside leading-relaxed">
                            {exam.instructions ? (
                                <p className="whitespace-pre-line text-slate-600 leading-relaxed font-semibold">{exam.instructions}</p>
                            ) : (
                                <>
                                    <li>পরীক্ষায় মোট {formatBanglaDigits(exam.questions?.length || 0)} টি এমসিকিউ (MCQ) প্রশ্ন রয়েছে।</li>
                                    <li>প্রতিটি সঠিক উত্তরের জন্য {formatBanglaDigits(exam.totalMarks / (exam.questions?.length || 1))} নম্বর বরাদ্দ থাকবে।</li>
                                    <li>নির্দিষ্ট সময় শেষ হওয়ার সাথে সাথে পরীক্ষাটি স্বয়ংক্রিয়ভাবে সাবমিট হয়ে যাবে।</li>
                                    <li>পরীক্ষা চলাকালীন উইন্ডো রিলোড বা বন্ধ করবেন না, এতে আপনার পরীক্ষা বাতিল হতে পারে।</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <button
                        onClick={handleStartExam}
                        className="w-full flex items-center justify-center gap-2.5 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all"
                    >
                        <span>পরীক্ষা শুরু করুন</span>
                        <Play size={16} className="fill-white" />
                    </button>
                </motion.div>
            </div>
        );
    }

    // Results Screen after Submission
    if (submitted && result) {
        const percent = Math.round((result.score / result.totalMarks) * 100);
        
        return (
            <div className="max-w-2xl mx-auto my-8 md:my-12 font-sans">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[32px] border border-slate-200/80 p-8 md:p-10 shadow-xl text-center relative overflow-hidden"
                >
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} className="text-emerald-500 stroke-[3px]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight mb-2">
                        পরীক্ষা সফলভাবে সম্পন্ন হয়েছে!
                    </h2>
                    <p className="text-slate-500 font-semibold max-w-md mx-auto mb-8">
                        আপনার উত্তরপত্র জমা নেওয়া হয়েছে। নিচে আপনার পরীক্ষার সাময়িক ফলাফল দেখতে পাচ্ছেন।
                    </p>

                    <div className="grid grid-cols-3 gap-3 md:gap-4 my-8">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">মোট নম্বর</p>
                            <p className="text-lg md:text-xl font-black text-slate-800">{formatBanglaDigits(result.totalMarks)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">প্রাপ্ত নম্বর</p>
                            <p className="text-lg md:text-xl font-black text-blue-600">{formatBanglaDigits(result.score)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">শতকরা হার</p>
                            <p className="text-lg md:text-xl font-black text-purple-600">{formatBanglaDigits(percent)}%</p>
                        </div>
                    </div>

                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl max-w-md mx-auto mb-8">
                        <p className="text-xs text-blue-700 font-bold leading-relaxed">
                            শিক্ষক আপনার পরীক্ষার বিস্তারিত ফলাফল প্রকাশ করলে আপনি সঠিক উত্তর এবং মূল্যায়ন ড্যাশবোর্ড থেকে দেখতে পাবেন।
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 active:scale-[0.97] transition-all"
                    >
                        ড্যাশবোর্ডে ফিরে যান
                    </button>
                </motion.div>
            </div>
        );
    }

    const currentQuestion = exam?.questions[currentQuestionIndex];
    const totalQuestions = exam?.questions?.length || 0;
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="max-w-6xl mx-auto my-6 px-4 font-sans">
            {/* Top Info Bar */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            if (window.confirm("আপনি কি নিশ্চিত যে পরীক্ষা ছেড়ে চলে যেতে চান? এতে আপনার অগ্রগতি নষ্ট হতে পারে।")) {
                                navigate('/dashboard');
                            }
                        }}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-base leading-snug line-clamp-1">
                            {exam.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {exam.subjectName} • শ্রেণি: {exam.className}
                        </p>
                    </div>
                </div>

                {/* Timer Display */}
                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-sm transition-all duration-300 ${
                        timeLeft <= 60 
                            ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' 
                            : timeLeft <= 180 
                                ? 'bg-amber-50 border-amber-100 text-amber-600' 
                                : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}>
                        <Clock size={16} className={timeLeft <= 60 ? 'animate-spin' : ''} />
                        <span>সময় বাকি: {formatTime(timeLeft)}</span>
                    </div>

                    <button
                        onClick={() => setShowConfirmModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 active:scale-[0.97] transition-all"
                    >
                        <span>জমা দিন</span>
                        <CheckCircle size={14} />
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left: Question Card */}
                <div className="lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm relative min-h-[380px] flex flex-col justify-between"
                        >
                            {currentQuestion ? (
                                <>
                                    <div>
                                        {/* Question Header */}
                                        <div className="flex justify-between items-start gap-4 mb-6 border-b border-slate-100 pb-4">
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
                                                প্রশ্ন: {formatBanglaDigits(currentQuestionIndex + 1)} / {formatBanglaDigits(totalQuestions)}
                                            </span>
                                            
                                            <div className="flex items-center gap-2">
                                                {markedForReview.has(currentQuestion.id) && (
                                                    <span className="text-[10px] font-black bg-amber-50 border border-amber-100 text-amber-600 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                        <Flag size={12} className="fill-amber-600" />
                                                        রিভিউ
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                                    মান: {formatBanglaDigits(currentQuestion.marks || 1.0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Question Title */}
                                        <div className="space-y-4 mb-8">
                                            {currentQuestion.stimulus && (
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-semibold text-sm leading-relaxed whitespace-pre-line">
                                                    {currentQuestion.stimulus}
                                                </div>
                                            )}
                                            <h4 className="font-extrabold text-slate-800 text-base md:text-lg leading-relaxed whitespace-pre-line">
                                                {currentQuestion.questionText}
                                            </h4>
                                        </div>

                                        {/* MCQ Options */}
                                        <div className="space-y-3">
                                            {currentQuestion.options && currentQuestion.options.map((option, idx) => {
                                                const isSelected = answers[currentQuestion.id.toString()] === option.id.toString();
                                                const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
                                                
                                                return (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => handleSelectOption(currentQuestion.id.toString(), option.id.toString())}
                                                        className={`w-full text-left p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-4 ${
                                                            isSelected 
                                                                ? 'bg-blue-50/70 border-blue-500 text-blue-800 shadow-[0_4px_20px_rgba(59,130,246,0.08)]' 
                                                                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                                                            isSelected 
                                                                ? 'bg-blue-600 text-white' 
                                                                : 'bg-slate-50 border border-slate-200 text-slate-400'
                                                        }`}>
                                                            {optionLabels[idx] || (idx + 1)}
                                                        </div>
                                                        <span className="leading-snug">{option.optionText}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Question Actions footer */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleMarkForReview(currentQuestion.id)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                                                    markedForReview.has(currentQuestion.id)
                                                        ? 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/10'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                <Flag size={14} className={markedForReview.has(currentQuestion.id) ? 'fill-white' : ''} />
                                                <span>রিভিউ</span>
                                            </button>

                                            {answers[currentQuestion.id.toString()] && (
                                                <button
                                                    onClick={() => handleClearAnswer(currentQuestion.id.toString())}
                                                    className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-all"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>উত্তর মুছুন</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                disabled={currentQuestionIndex === 0}
                                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                                className="p-3 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 active:scale-[0.96] transition-all"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            {currentQuestionIndex < totalQuestions - 1 ? (
                                                <button
                                                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md shadow-slate-900/10 active:scale-[0.96] transition-all"
                                                >
                                                    <span>পরবর্তী প্রশ্ন</span>
                                                    <ChevronRight size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setShowConfirmModal(true)}
                                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 active:scale-[0.96] transition-all"
                                                >
                                                    <span>পরীক্ষা শেষ করুন</span>
                                                    <CheckCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 font-bold text-slate-500">কোন প্রশ্ন উপলব্ধ নেই</div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right: Question Palette / Status Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm">
                        <h4 className="font-extrabold text-slate-800 text-sm mb-4">প্রশ্ন তালিকা ও অবস্থা</h4>
                        
                        {/* Summary Info */}
                        <div className="grid grid-cols-3 gap-2 text-center mb-6">
                            <div className="bg-emerald-50 border border-emerald-100/50 p-2.5 rounded-xl">
                                <p className="text-emerald-700 font-black text-sm">{formatBanglaDigits(answeredCount)}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">উত্তর দেওয়া</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100/50 p-2.5 rounded-xl">
                                <p className="text-amber-700 font-black text-sm">{formatBanglaDigits(markedForReview.size)}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">রিভিউ চিহ্নিত</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                                <p className="text-slate-700 font-black text-sm">{formatBanglaDigits(totalQuestions - answeredCount)}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">বাকি আছে</p>
                            </div>
                        </div>

                        {/* Questions Palette Grid */}
                        <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {exam.questions.map((q, idx) => {
                                const isCurrent = idx === currentQuestionIndex;
                                const isAnswered = !!answers[q.id.toString()];
                                const isFlagged = markedForReview.has(q.id);
                                
                                let btnClasses = "h-10 rounded-xl font-black text-xs transition-all active:scale-[0.93] flex items-center justify-center border ";
                                if (isCurrent) {
                                    btnClasses += "bg-blue-600 border-blue-700 text-white ring-4 ring-blue-100";
                                } else if (isFlagged) {
                                    btnClasses += "bg-amber-500 border-amber-600 text-white shadow-sm";
                                } else if (isAnswered) {
                                    btnClasses += "bg-emerald-500 border-emerald-600 text-white shadow-sm";
                                } else {
                                    btnClasses += "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500";
                                }

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={btnClasses}
                                    >
                                        {formatBanglaDigits(idx + 1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Submit Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center"
                    >
                        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
                        
                        <h3 className="text-slate-800 font-black text-lg mb-2">আপনি কি পরীক্ষাটি শেষ করতে চান?</h3>
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">
                            আপনি মোট {formatBanglaDigits(totalQuestions)} টি প্রশ্নের মধ্যে {formatBanglaDigits(answeredCount)} টি প্রশ্নের উত্তর দিয়েছেন। জমা দেওয়ার পর উত্তর আর পরিবর্তন করা যাবে না।
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                                বাতিল করুন
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>জমা হচ্ছে...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>নিশ্চিত জমা দিন</span>
                                        <CheckCircle size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ExamTaker;
