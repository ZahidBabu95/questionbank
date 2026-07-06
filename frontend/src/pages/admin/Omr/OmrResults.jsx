import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area 
} from 'recharts';
import { 
    BarChart3, Users, Award, AlertCircle, FileSpreadsheet, Eye, 
    Edit2, Check, RefreshCw, X, ArrowLeft, ChevronRight, 
    Filter, Search, Download, Trash2, HelpCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { AnimatePresence, motion } from 'framer-motion';

const OmrResults = () => {
    const [selectedExamId, setSelectedExamId] = useState('exam-1');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [reviewStudent, setReviewStudent] = useState(null);
    const [editingAnswers, setEditingAnswers] = useState({});
    const [editingCqMarks, setEditingCqMarks] = useState({});

    // Mock Active Exams list for dropdown
    const examsList = [
        { id: 'exam-1', title: 'পদার্থবিজ্ঞান অর্ধবার্ষিক মডেল টেস্ট - ২০২৬', subject: 'Physics', className: 'Class 10' },
        { id: 'exam-2', title: 'রসায়ন প্রথম পত্র সাপ্তাহিক পরীক্ষা - ২০২৬', subject: 'Chemistry', className: 'Class 11' },
        { id: 'exam-3', title: 'সাধারণ গণিত চ্যাপ্টার ২ টেস্ট', subject: 'Math', className: 'Class 9' }
    ];

    // Stats
    const stats = {
        totalScanned: 48,
        averageScore: 21.4,
        topScore: 29,
        invalidSheets: 2
    };

    // Chart Data (Score Distribution)
    const scoreDistribution = [
        { scoreRange: '0-5', count: 1 },
        { scoreRange: '6-10', count: 3 },
        { scoreRange: '11-15', count: 8 },
        { scoreRange: '16-20', count: 12 },
        { scoreRange: '21-25', count: 18 },
        { scoreRange: '26-30', count: 6 }
    ];

    // Mock Student OMR submissions
    const [studentsData, setStudentsData] = useState([
        { id: 'st-1', name: 'তাহমিদ হাসান রনি', roll: '১০০২৫', class: 'Class 10', mcqScore: 24, cqScore: 42, totalScore: 66, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-2', name: 'সাফওয়ান চৌধুরী', roll: '১০০২৮', class: 'Class 10', mcqScore: 28, cqScore: 45, totalScore: 73, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-3', name: 'নাসরিন সুলতানা মৌ', roll: '১০০৩৪', class: 'Class 10', mcqScore: 19, cqScore: 35, totalScore: 54, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-4', name: 'কাজী আরিয়ান', roll: '১০০৩৬', class: 'Class 10', mcqScore: 15, cqScore: 28, totalScore: 43, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-5', name: 'মাইশা রহমান', roll: '১০০৪০', class: 'Class 10', mcqScore: 22, cqScore: 40, totalScore: 62, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-6', name: 'রাকিবুল ইসলাম', roll: '১০০৪৩', class: 'Class 10', mcqScore: 26, cqScore: 43, totalScore: 69, status: 'GRADED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-7', name: 'আনিকা তাবাসসুম', roll: '১০০০৫', class: 'Class 10', mcqScore: 8, cqScore: 18, totalScore: 26, status: 'FAILED', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' },
        { id: 'st-8', name: 'শরিফ আহমেদ', roll: '১০০০৯', class: 'Class 10', mcqScore: 0, cqScore: 0, totalScore: 0, status: 'INVALID_ROLL', scannedUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop' }
    ]);

    // Student MCQ answers for correction interface (simulating 10 questions)
    const mockStudentAnswers = {
        'st-1': { 1: 'ক', 2: 'খ', 3: 'গ', 4: 'ঘ', 5: 'ক', 6: 'খ', 7: 'গ', 8: 'ঘ', 9: 'ক', 10: 'খ' },
        'st-2': { 1: 'ক', 2: 'খ', 3: 'খ', 4: 'ঘ', 5: 'ক', 6: 'খ', 7: 'গ', 8: 'ঘ', 9: 'ক', 10: 'গ' }
    };

    // Correct Answer Key for reference
    const correctAnswerKey = { 1: 'ক', 2: 'খ', 3: 'গ', 4: 'ঘ', 5: 'ক', 6: 'খ', 7: 'গ', 8: 'ঘ', 9: 'ক', 10: 'ঘ' };

    const handleOpenReview = (student) => {
        setReviewStudent(student);
        const currentAnswers = mockStudentAnswers[student.id] || { 1: 'ক', 2: 'ক', 3: 'ক', 4: 'ক', 5: 'ক', 6: 'ক', 7: 'ক', 8: 'ক', 9: 'ক', 10: 'ক' };
        setEditingAnswers(currentAnswers);
        setEditingCqMarks({
            cq1: Math.floor(student.cqScore / 10) || 5,
            cq2: student.cqScore % 10 || 5
        });
    };

    const handleSaveReview = () => {
        // Calculate new MCQ score
        let newMcqScore = 0;
        Object.keys(editingAnswers).forEach(qNum => {
            if (editingAnswers[qNum] === correctAnswerKey[qNum]) {
                newMcqScore++;
            }
        });

        const newCqScore = (Number(editingCqMarks.cq1) || 0) + (Number(editingCqMarks.cq2) || 0);

        setStudentsData(prev => prev.map(s => {
            if (s.id === reviewStudent.id) {
                return {
                    ...s,
                    mcqScore: newMcqScore,
                    cqScore: newCqScore,
                    totalScore: newMcqScore + newCqScore,
                    status: 'GRADED'
                };
            }
            return s;
        }));

        setReviewStudent(null);
    };

    const filteredStudents = studentsData.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll.includes(searchTerm);
        const matchClass = !selectedClass || s.class === selectedClass;
        return matchSearch && matchClass;
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-100 font-outfit pb-20 p-4 md:p-8 flex flex-col gap-6">
            
            {/* Top Bar */}
            <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">OMR Results & Analytics</h1>
                            <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                                Live Sync
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">ওএমআর পরীক্ষার ফলাফল, পারফরম্যান্স অ্যানালিটিক্স ও উত্তরপত্র রিভিউ হাব</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 outline-none focus:border-purple-500 cursor-pointer"
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                        {examsList.map(e => (
                            <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Core Stats Section */}
            <div className="max-w-[1600px] w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মোট স্ক্যানকৃত শিট</span>
                        <span className="text-2xl font-black text-white">{stats.totalScanned}টি</span>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
                        <Users size={20} />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">গড় প্রাপ্ত স্কোর</span>
                        <span className="text-2xl font-black text-white">{stats.averageScore}</span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                        <BarChart3 size={20} />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">সর্বোচ্চ নম্বর</span>
                        <span className="text-2xl font-black text-white">{stats.topScore}</span>
                    </div>
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
                        <Award size={20} />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ত্রুটিযুক্ত শিট</span>
                        <span className="text-2xl font-black text-rose-400">{stats.invalidSheets}টি</span>
                    </div>
                    <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
                        <AlertCircle size={20} />
                    </div>
                </div>
            </div>

            {/* Split area for charts & filtering list */}
            <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Score Chart & List Panel */}
                <div className="lg:col-span-12 flex flex-col gap-6">
                    
                    {/* Charts Card */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
                        <h3 className="font-bold text-white text-sm mb-4">নম্বর বিন্যাস অ্যানালিটিক্স (Score Distribution)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                                    <XAxis dataKey="scoreRange" stroke="#94A3B8" />
                                    <YAxis stroke="#94A3B8" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: 'white' }}
                                        cursor={{ fill: '#1E293B', opacity: 0.4 }}
                                    />
                                    <Bar dataKey="count" fill="url(#purpleGradient)" radius={[8, 8, 0, 0]}>
                                        {/* Gradient tag */}
                                        <defs>
                                            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#A855F7" />
                                                <stop offset="100%" stopColor="#4F46E5" />
                                            </linearGradient>
                                        </defs>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Student directories list */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                            <h3 className="font-bold text-white text-sm">শিক্ষার্থীদের ফলাফল ও খাতা তালিকা</h3>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search input */}
                                <div className="relative w-full md:w-60">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="খুঁজুন (নাম/রোল)..." 
                                        className="bg-slate-800 border border-slate-700 text-xs font-semibold rounded-xl pl-9 pr-4 py-2.5 w-full outline-none focus:border-purple-500 text-slate-200"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Class filter */}
                                <select 
                                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300 outline-none cursor-pointer"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="">সকল ক্লাস</option>
                                    <option value="Class 10">Class 10</option>
                                    <option value="Class 11">Class 11</option>
                                </select>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-400">
                                <thead className="bg-slate-800/40 text-slate-300 uppercase tracking-wider text-[10px] font-black border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">স্টুডেন্ট নাম ও রোল</th>
                                        <th className="px-6 py-4">শ্রেণী</th>
                                        <th className="px-6 py-4">MCQ স্কোর (৩০)</th>
                                        <th className="px-6 py-4">CQ স্কোর (৭০)</th>
                                        <th className="px-6 py-4">মোট স্কোর</th>
                                        <th className="px-6 py-4">স্ট্যাটাস</th>
                                        <th className="px-6 py-4 text-right">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-xs">{student.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">রোল: {student.roll}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold">{student.class}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-200">{student.mcqScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-200">{student.cqScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-emerald-400">{student.totalScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${
                                                    student.status === 'GRADED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    student.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {student.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleOpenReview(student)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                                                >
                                                    <Eye size={12} /> Review Sheet
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>

            {/* Split Screen Side-by-Side Review Dialog / Modal */}
            <AnimatePresence>
                {reviewStudent && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 15 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{reviewStudent.name} এর উত্তরপত্র রিভিউ</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">রোল: {reviewStudent.roll} | ক্লাস: {reviewStudent.class} | স্ট্যাটাস: {reviewStudent.status}</p>
                                    </div>
                                </div>
                                <button onClick={() => setReviewStudent(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body: Split-Pane view */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
                                
                                {/* Left pane: Scanned Image View */}
                                <div className="border-r border-slate-800 bg-slate-950/60 p-6 overflow-y-auto flex flex-col items-center justify-center gap-4 relative custom-scrollbar">
                                    <span className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded text-[10px] text-slate-400 font-bold uppercase tracking-wider z-10">
                                        Scanned Sheet View
                                    </span>
                                    <div className="relative max-w-sm border border-slate-800 rounded-xl overflow-hidden shadow-lg bg-white p-2">
                                        <img 
                                            src={reviewStudent.scannedUrl} 
                                            alt="OMR Scanned" 
                                            className="w-full h-auto object-contain rounded"
                                        />
                                        
                                        {/* Mock bubble overlay markers to represent parsed bubbles */}
                                        <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-emerald-500/40 border-2 border-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">✓</div>
                                        <div className="absolute top-2/5 left-1/3 w-4 h-4 bg-emerald-500/40 border-2 border-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">✓</div>
                                        <div className="absolute top-1/2 left-2/5 w-4 h-4 bg-rose-500/40 border-2 border-rose-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">✗</div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-center leading-relaxed max-w-xs">
                                        * ওএমআর ইঞ্জিনের রিডিং ভুল মনে হলে আপনি ডানদিকের প্যানেলে ম্যানুয়ালি অপশন আপডেট করে দিতে পারেন।
                                    </p>
                                </div>

                                {/* Right pane: OMR Data Grid & Correction Editor */}
                                <div className="p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar bg-slate-900/30">
                                    
                                    {/* MCQ Answers Sheet Section */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-white text-xs border-b border-slate-800 pb-2">বহুনির্বাচনী উত্তরপত্র সংশোধন (MCQ Corrections)</h4>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                            {[1,2,3,4,5,6,7,8,9,10].map(qNum => {
                                                const currentAnswer = editingAnswers[qNum] || 'ক';
                                                const isCorrect = currentAnswer === correctAnswerKey[qNum];
                                                
                                                return (
                                                    <div key={qNum} className="flex items-center justify-between bg-slate-800/40 border border-slate-800 p-2 rounded-xl">
                                                        <span className="text-xs font-bold text-slate-400">প্রশ্ন {qNum}:</span>
                                                        <div className="flex gap-1.5">
                                                            {['ক', 'খ', 'গ', 'ঘ'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => setEditingAnswers(prev => ({ ...prev, [qNum]: opt }))}
                                                                    className={`w-6 h-6 rounded-full text-[10px] font-bold border transition-all ${
                                                                        currentAnswer === opt 
                                                                            ? (opt === correctAnswerKey[qNum]
                                                                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                                                                : 'bg-rose-500 border-rose-400 text-white')
                                                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                                                    }`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* CQ Marks Section */}
                                    <div className="space-y-3 border-t border-slate-800 pt-4">
                                        <h4 className="font-bold text-white text-xs border-b border-slate-800 pb-2">সৃজনশীল প্রশ্নের নম্বর সংশোধন (CQ Scores)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-slate-400">সৃজনশীল ১ (CQ 1)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="50" 
                                                    className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                                                    value={editingCqMarks.cq1 || 0}
                                                    onChange={(e) => setEditingCqMarks(prev => ({ ...prev, cq1: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-slate-400">সৃজনশীল ২ (CQ 2)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="50" 
                                                    className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                                                    value={editingCqMarks.cq2 || 0}
                                                    onChange={(e) => setEditingCqMarks(prev => ({ ...prev, cq2: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                                <button 
                                    onClick={() => setReviewStudent(null)}
                                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveReview}
                                    className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                >
                                    <Check size={14} /> Save Changes
                                </button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OmrResults;
