import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, FileText, Paperclip, Calendar, Edit, Trash2, ChevronDown, BookOpen, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axios';
import lectureService from '../../../services/lectureService';
import academicService from '../../../services/academicService';

const LectureList = () => {
    const [lectures, setLectures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('All Classes');
    const [selectedSubject, setSelectedSubject] = useState('All Subjects');
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchLectures();
        fetchAcademicHierarchy();
    }, []);

    const fetchLectures = async () => {
        setLoading(true);
        try {
            const res = await lectureService.listLectures();
            setLectures(res.data?.content || []);
        } catch (err) {
            console.error('Failed to fetch lectures:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademicHierarchy = async () => {
        try {
            const hData = await academicService.getHierarchy();
            if (hData) {
                setClasses(hData.classes || []);
                setSubjects(hData.subjects || []);
            }
        } catch (err) {
            console.error('Failed to fetch academic hierarchy:', err);
        }
    };

    const handleDeleteLecture = async (id, title) => {
        if (window.confirm(`আপনি কি নিশ্চিতভাবে "${title}" লেকচারশীটটি মুছে ফেলতে চান?`)) {
            try {
                await lectureService.deleteLecture(id);
                fetchLectures();
            } catch (err) {
                console.error('Failed to delete lecture:', err);
                alert('লেকচারশীটটি মুছতে ব্যর্থ হয়েছে।');
            }
        }
    };

    const handleAttachmentsClick = (lecture) => {
        const chapterId = lecture.chapterId || '';
        if (lecture.classSubjectId) {
            navigate(`/knowledge-hub/ai-reader?classSubjectId=${lecture.classSubjectId}&lectureId=${lecture.id}&chapterId=${chapterId}`);
        } else {
            navigate('/knowledge-hub/ai-reader');
        }
    };

    const filteredLectures = lectures.filter(l => {
        const matchesSearch = (l.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (l.className || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (l.subjectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (l.topicName || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesClass = selectedClass === 'All Classes' || l.className === selectedClass || l.classId === selectedClass;
        const matchesSubject = selectedSubject === 'All Subjects' || l.subjectName === selectedSubject || l.classSubjectId === selectedSubject;
        
        return matchesSearch && matchesClass && matchesSubject;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedClass('All Classes');
        setSelectedSubject('All Subjects');
    };

    return (
        <div className="space-y-6 pb-12 font-outfit">
            {/* Redesigned Compact & Premium Toolbar */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 p-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-center justify-between gap-3">
                {/* Compact Search */}
                <div className="relative w-full lg:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        placeholder="লেকচার বা টপিক খুঁজুন..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-semibold text-slate-700 placeholder-slate-400"
                    />
                </div>

                {/* Compact Filters & Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                    {/* Compact Class Selector */}
                    <div className="relative flex-1 sm:flex-initial">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full sm:w-36 pl-3 pr-8 py-1.5 bg-slate-50/70 border border-slate-200/60 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer appearance-none"
                        >
                            <option value="All Classes">All Classes</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                    </div>

                    {/* Compact Subject Selector */}
                    <div className="relative flex-1 sm:flex-initial">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full sm:w-36 pl-3 pr-8 py-1.5 bg-slate-50/70 border border-slate-200/60 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer appearance-none"
                        >
                            <option value="All Subjects">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                    </div>

                    {/* Compact Create Button */}
                    <button
                        onClick={() => navigate('/lectures/editor')}
                        className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-[11px] rounded-xl shadow-md shadow-indigo-500/10 transition duration-150 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>নতুন লেকচারশীট</span>
                    </button>
                </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                                <div className="h-6 bg-slate-100 rounded-full w-24" />
                            </div>
                            <div className="h-6 bg-slate-100 rounded-lg w-3/4" />
                            <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                            <div className="pt-4 flex gap-2">
                                <div className="h-9 bg-slate-100 rounded-xl flex-1" />
                                <div className="h-9 bg-slate-100 rounded-xl flex-1" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredLectures.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mx-auto mb-4 border border-slate-100">
                        <Layers size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">কোনো লেকচারশীট পাওয়া যায়নি</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
                        আপনার সিলেক্ট করা ফিল্টারের সাথে মিলে এমন কোনো লেকচারশীট নেই। নতুন লেকচারশীট তৈরি করুন অথবা ফিল্টার রিসেট করুন।
                    </p>
                    <button
                        onClick={resetFilters}
                        className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                        ফিল্টার রিসেট করুন
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLectures.map(lecture => (
                        <div
                            key={lecture.id}
                            className="group bg-white rounded-3xl border border-slate-100/90 p-6 hover:border-indigo-200/80 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative flex flex-col justify-between"
                        >
                            <div>
                                {/* Card Top Row */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100/30 group-hover:from-indigo-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                        <FileText size={22} />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[70%]">
                                        {lecture.className && (
                                            <span className="px-2.5 py-1 bg-blue-50/70 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100/20">
                                                {lecture.className}
                                            </span>
                                        )}
                                        {lecture.subjectName && (
                                            <span className="px-2.5 py-1 bg-purple-50/70 text-purple-600 text-[10px] font-black rounded-lg border border-purple-100/20">
                                                {lecture.subjectName}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                                    {lecture.title}
                                </h3>

                                {/* Chapter & Topic description */}
                                <div className="mb-4">
                                    {lecture.chapterName && (
                                        <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-bold mb-1">
                                            <BookOpen size={13} />
                                            <span className="truncate">{lecture.chapterName}</span>
                                        </div>
                                    )}
                                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 font-medium">
                                        {lecture.topicName || 'শ্রেণিকক্ষে ব্যবহারের জন্য প্রস্তুতকৃত লেকচার শীট ও প্র্যাকটিস ম্যাটেরিয়াল।'}
                                    </p>
                                </div>
                            </div>

                            {/* Card Footer Info & Buttons */}
                            <div className="mt-4 pt-4 border-t border-slate-50">
                                {/* Meta stats */}
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-4">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={13} />
                                        {new Date(lecture.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    {lecture.lectureTimeMinutes && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={13} />
                                            {lecture.lectureTimeMinutes} মিনিট
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons - English labels */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => navigate(`/lectures/editor/${lecture.id}`)}
                                        className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-[0.98] border border-slate-100 flex items-center justify-center gap-1.5"
                                    >
                                        <Edit size={12} />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleAttachmentsClick(lecture)}
                                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                                    >
                                        <Paperclip size={12} />
                                        <span>Attachments</span>
                                    </button>
                                    
                                    {/* Real Delete Button */}
                                    <button
                                        onClick={() => handleDeleteLecture(lecture.id, lecture.title)}
                                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-xl transition-all active:scale-95 border border-rose-100/30"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LectureList;
