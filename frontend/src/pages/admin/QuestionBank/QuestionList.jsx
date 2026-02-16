import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Filter, Search } from 'lucide-react';
import questionService from '../../../services/questionService';

const QuestionList = () => {
    const location = useLocation();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        // Determine status based on URL path
        if (location.pathname.includes('/approved')) setFilterStatus('APPROVED');
        else if (location.pathname.includes('/pending')) setFilterStatus('PENDING');
        else if (location.pathname.includes('/rejected')) setFilterStatus('REJECTED');
        else setFilterStatus('ALL');

        fetchQuestions();
    }, [location.pathname]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const data = await questionService.getAllQuestions();
            setQuestions(data);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredQuestions = () => {
        if (filterStatus === 'ALL') return questions;
        return questions.filter(q => q.status === filterStatus);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await questionService.deleteQuestion(id);
                setQuestions(questions.filter(q => q.id !== id));
            } catch (error) {
                console.error("Failed to delete", error);
            }
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
            case 'REJECTED': return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
            case 'PENDING': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12} /> Pending</span>;
            default: return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Draft</span>;
        }
    };

    const filteredQuestions = getFilteredQuestions();

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">
                    {filterStatus === 'ALL' ? 'Question Repository' : `${filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()} Questions`}
                </h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                        <Filter size={18} /> Filter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Question Text</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Class/Subject</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Difficulty</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading questions...</td></tr>
                        ) : filteredQuestions.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No questions found.</td></tr>
                        ) : (
                            filteredQuestions.map(q => (
                                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.questionText?.substring(0, 100) }} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-semi-bold">{q.type}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-900">{q.subject?.name || 'N/A'}</div>
                                        <div className="text-xs text-slate-500">{q.academicClass?.name || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                                                q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>{q.difficulty}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(q.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye size={16} /></button>
                                            <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"><Edit size={16} /></button>
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QuestionList;
