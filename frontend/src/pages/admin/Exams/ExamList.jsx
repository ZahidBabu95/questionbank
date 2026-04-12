import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Download, FileDown, Search, Loader2, ArrowUpDown } from 'lucide-react';
import examService from '../../../services/examService';
import ExamDownloadModal from './ExamDownloadModal';

const ExamList = () => {
    const location = useLocation();

    // Determine default mode based on route (just in case we want to customize UI based on route)
    const [mode] = useState(
        location.pathname.includes('word') ? 'word' : 'pdf'
    );

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [selectedExam, setSelectedExam] = useState(null);

    const fetchExams = async (params = {}) => {
        setLoading(true);
        try {
            const res = await examService.listExams({
                page: params.page ?? page,
                size: 10,
                title: params.title ?? searchTerm
            });
            if (res.success) {
                setExams(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err) {
            console.error('Failed to load exams', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, [page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        fetchExams({ page: 0, title: searchTerm });
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {mode === 'pdf' ? <FileDown className="text-rose-600" /> : <FileText className="text-primary" />}
                        Download Exam Papers
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Select an exam paper from your repository to download as PDF or Word document.
                    </p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            className="bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-64 pl-10 p-2.5 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Exam Title</th>
                                <th className="px-5 py-4 font-semibold">Class & Subject</th>
                                <th className="px-5 py-4 font-semibold">Generated</th>
                                <th className="px-5 py-4 font-semibold">Marks & Time</th>
                                <th className="px-5 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-5 py-10 text-center">
                                        <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                                        <p className="text-slate-500 mt-2">Loading exams...</p>
                                    </td>
                                </tr>
                            ) : exams.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                                        No exams found. Create one from the Generator menu first!
                                    </td>
                                </tr>
                            ) : (
                                exams.map((exam) => (
                                    <tr key={exam.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">{exam.title}</div>
                                            <div className="text-xs text-slate-500">{exam.instruction || exam.examType}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-800">{exam.classSubject?.academicClass?.name || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{exam.classSubject?.subject?.name || 'N/A'}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {new Date(exam.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-medium inline-block px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                                                {exam.totalMarks} Marks
                                            </div>
                                            <span className="ml-2 text-slate-500 text-xs">{exam.durationMinutes} min</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedExam(exam)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-200"
                                            >
                                                <Download size={15} />
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Showing page {page + 1} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive Download Modal (Single Modal for both PDF and Word!) */}
            {selectedExam && (
                <ExamDownloadModal
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                />
            )}
        </div>
    );
};

export default ExamList;
