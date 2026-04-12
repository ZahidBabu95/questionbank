import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, FileText, Paperclip, Calendar, MoreHorizontal, Edit, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import lectureService from '../../../services/lectureService';

const LectureList = () => {
    const [lectures, setLectures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchLectures();
    }, []);

    const fetchLectures = async () => {
        setLoading(true);
        try {
            const res = await lectureService.listLectures();
            // Backend returns Map.of("data", Page<LectureDTO>)
            setLectures(res.data?.content || []);
        } catch (err) {
            console.error('Failed to fetch lectures:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLectures = lectures.filter(l =>
        l.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lecture Sheets</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your classroom lectures and attached resources.</p>
                </div>
                <button
                    onClick={() => navigate('/lectures/create')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                    <Plus size={18} />
                    <span>Create New Lecture</span>
                </button>
            </div>

            {/* Stats / Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search lectures by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    />
                </div>
                <div className="flex gap-2">
                    <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none">
                        <option>All Subjects</option>
                    </select>
                    <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                        Filter
                    </button>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 animate-pulse">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                            <div className="h-6 bg-slate-100 rounded-lg w-3/4" />
                            <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                            <div className="pt-4 flex gap-2">
                                <div className="h-8 bg-slate-100 rounded-lg flex-1" />
                                <div className="h-8 bg-slate-100 rounded-lg flex-1" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredLectures.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mx-auto mb-4">
                        <Layers size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No lectures found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Start by creating your first lecture sheet and attaching resources for your students.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLectures.map(lecture => (
                        <div key={lecture.id} className="group bg-white rounded-2xl border border-slate-100 p-6 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 text-secondary rounded-xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                                    <FileText size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-secondary"><Edit size={16} /></button>
                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-secondary transition-colors">{lecture.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(lecture.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 font-bold text-indigo-500"><Paperclip size={14} /> Attachments</span>
                            </div>

                            <p className="text-slate-500 text-sm mt-4 line-clamp-2">
                                {lecture.topicName || 'General classroom lecture for student practice and review.'}
                            </p>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
                                <button
                                    onClick={() => navigate(`/lectures/create?id=${lecture.id}`)}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
                                >
                                    Edit Content
                                </button>
                                <button
                                    onClick={() => navigate(`/lectures/create?id=${lecture.id}&attachments=open`)}
                                    className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2"
                                >
                                    Attachments
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LectureList;
