import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, BookOpen, Link as LinkIcon, AlertCircle } from 'lucide-react';
import academicService from '../../../services/academicService';
import axios from 'axios'; // Fallback for session logic if not in service yet

const SubjectList = () => {
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]); // For filter dropdown
    const [globalSubjects, setGlobalSubjects] = useState([]); // For import modal
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ name: '', code: '', academicClassId: '' });
    const [selectedGlobalSubjectId, setSelectedGlobalSubjectId] = useState('');

    useEffect(() => {
        fetchClasses();
        fetchActiveSession();
        // Initial fetch - if no class selected, maybe fetch all if backend supports getAllSubjects
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchSubjectsByClass(selectedClass);
        } else {
            fetchSubjects(); // Fetch all if supported
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const data = await academicService.getAllClasses();
            setClasses(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchActiveSession = async () => {
        try {
            // Assuming academicService or direct axios call
            // We need this ID for mapping endpoints that require sessionId
            const response = await axios.get('http://localhost:8080/api/v1/academic/sessions/active', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.data) {
                setActiveSession(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch active session", error);
        }
    };

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const data = await academicService.getAllSubjects();
            // Map Global Subject to common structure
            const normalized = data.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                type: 'GLOBAL_SUBJECT'
            }));
            setSubjects(normalized);
            setGlobalSubjects(normalized); // Keep a copy for the import modal
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectsByClass = async (classId) => {
        setLoading(true);
        try {
            const data = await academicService.getSubjectsByClass(classId);
            // Map ClassSubjectDTO to common structure
            const normalized = data.map(dto => ({
                id: dto.classSubjectId, // Use the link ID for deletion
                subjectId: dto.subjectId, // Real subject ID
                code: dto.subjectCode,
                name: dto.subjectName,
                type: 'CLASS_SUBJECT'
            }));
            setSubjects(normalized);
        } catch (error) {
            console.error("Failed to fetch subjects by class", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            // If class is selected, use createAndAssign (which uses active session automatically in backend)
            // If NO class selected (Global Library), use createSubject

            if (formData.academicClassId) {
                // Create and Assign to Class (requires classId)
                await academicService.createClassSubject(formData.academicClassId, {
                    name: formData.name,
                    code: formData.code
                });
            } else {
                // Create Global Subject (no classId)
                await academicService.createGlobalSubject({
                    name: formData.name,
                    code: formData.code
                });
            }

            setShowCreateModal(false);
            setFormData({ name: '', code: '', academicClassId: selectedClass || '' });

            // Refresh list
            if (selectedClass) fetchSubjectsByClass(selectedClass);
            else fetchSubjects();
        } catch (error) {
            console.error("Failed to save subject", error);
            alert("Failed to save subject. Code must be unique.");
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!activeSession) {
            alert("No Active Academic Session found! Please create and activate a session first.");
            return;
        }
        try {
            // Call assignSubjectToClass endpoint
            await academicService.assignSubjectToClass(selectedClass, selectedGlobalSubjectId, activeSession.id);

            setShowImportModal(false);
            fetchSubjectsByClass(selectedClass);
        } catch (error) {
            console.error("Failed to map subject", error);
            if (error.response && error.response.status === 500) {
                alert("Failed to map subject. It might already be assigned.");
            } else {
                alert("Failed to map subject.");
            }
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm("Delete this subject?")) return;
        try {
            if (item.type === 'CLASS_SUBJECT') {
                await academicService.deleteClassSubject(item.id);
            } else {
                await academicService.deleteSubject(item.id);
            }

            if (selectedClass) fetchSubjectsByClass(selectedClass);
            else fetchSubjects();
        } catch (error) {
            console.error("Failed to delete", error);
            if (error.response && error.response.status === 409) {
                alert("Cannot delete this subject because it is in use by classes.");
            } else {
                alert("Failed to delete subject.");
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Session Indicator */}
            <div className={`px-4 py-3 rounded-lg flex items-center justify-between ${activeSession ? 'bg-indigo-50 border border-indigo-100' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${activeSession ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Academic Session</h3>
                        <p className={`text-lg font-bold ${activeSession ? 'text-indigo-700' : 'text-amber-700'}`}>
                            {activeSession ? activeSession.name : "No Active Session Selected"}
                        </p>
                    </div>
                </div>
                {!activeSession && (
                    <div className="text-sm text-amber-800 font-medium">
                        Please go to the <strong>Sessions</strong> tab to activate a session.
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100">
                        <Filter size={16} className="text-slate-500" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">View:</span>
                    </div>
                    <select
                        className="bg-transparent border-none text-sm text-slate-700 font-medium focus:ring-0 cursor-pointer outline-none min-w-[150px]"
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setFormData(prev => ({ ...prev, academicClassId: e.target.value }));
                        }}
                    >
                        <option value="">Global Library (All)</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    {selectedClass && (
                        <button
                            onClick={() => {
                                // Refresh global subjects to ensure list is up to date before opening modal
                                academicService.getAllSubjects()
                                    .then(data => {
                                        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                                        setGlobalSubjects(sorted);
                                        setShowImportModal(true);
                                    })
                                    .catch(err => console.error("Failed to fetch global subjects", err));
                            }}
                            className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm"
                            title="Add existing subject from Global Library"
                        >
                            <LinkIcon size={18} /> Map Existing
                        </button>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                    >
                        <Plus size={18} /> {selectedClass ? 'Create & Assign' : 'New Global Subject'}
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b border-slate-200">Code</th>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b border-slate-200">Subject Name</th>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b border-slate-200">Type</th>
                            <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider border-b border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading subjects...</td></tr>
                        ) : subjects.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">No subjects found for this selection.</td></tr>
                        ) : (
                            subjects.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-sm font-mono text-slate-500">{sub.code}</td>
                                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{sub.name}</td>
                                    <td className="px-6 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.type === 'CLASS_SUBJECT' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                            {sub.type === 'CLASS_SUBJECT' ? 'Class Syllabus' : 'Global Library'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleDelete(sub)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                                            title={sub.type === 'CLASS_SUBJECT' ? 'Remove from Class' : 'Delete Global Subject'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">
                                {selectedClass ? 'Create & Assign Subject' : 'New Global Subject'}
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            {selectedClass && (
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                                    Creating and assigning to <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Physics"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="e.g. PHYS-101"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                                >
                                    Save Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Map Global Subject</h2>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleImportSubmit} className="space-y-4">
                            <div className="text-sm text-slate-600 mb-4">
                                Select a subject from the Global Library to assign to <strong>{classes.find(c => c.id === selectedClass)?.name}</strong> for the session <strong>{activeSession?.name || '...'}</strong>.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                                <select
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedGlobalSubjectId}
                                    onChange={e => setSelectedGlobalSubjectId(e.target.value)}
                                >
                                    <option value="">-- Choose Subject --</option>
                                    {globalSubjects
                                        .filter(sub => !subjects.some(existing => existing.subjectId === sub.id))
                                        .map(sub => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.code} - {sub.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors"
                                    disabled={!activeSession}
                                >
                                    Map Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectList;
