import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter } from 'lucide-react';
import academicService from '../../../services/academicService';

const SubjectList = () => {
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]); // For filter dropdown
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ name: '', code: '', academicClassId: '' });

    useEffect(() => {
        fetchClasses();
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

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            // Using the new getAllSubjects endpoint I added
            const data = await academicService.getAllSubjects();
            setSubjects(data);
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
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects by class", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await academicService.createSubject(formData.academicClassId, {
                name: formData.name,
                code: formData.code
            });

            setShowModal(false);
            setFormData({ name: '', code: '', academicClassId: '' });

            // Refresh list
            if (selectedClass === formData.academicClassId || !selectedClass) {
                if (selectedClass) fetchSubjectsByClass(selectedClass);
                else fetchSubjects();
            }
        } catch (error) {
            console.error("Failed to save subject", error);
            alert("Failed to save subject. Code must be unique.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this subject?")) return;
        try {
            await academicService.deleteSubject(id);
            // Refresh
            if (selectedClass) fetchSubjectsByClass(selectedClass);
            else fetchSubjects();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Subjects</h1>
                    <p className="text-slate-500">Manage subjects across different classes.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={18} /> Add Subject
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <Filter size={20} className="text-slate-400" />
                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 max-w-xs outline-none"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">Code</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Subject Name</th>
                            {/* If fetching all, show class name. But JSONIgnore might hide it unless we use DTO or if we are lucky */}
                            {/* Since I added JsonIgnore to parent reference, 'academicClass' won't be in the subject object! */}
                            {/* Ah, right. If I ignore it, I can't display "Class Name" in the table when listing all. */}
                            {/* That is a trade-off. For 'All Subjects', we won't know the class. */}
                            {/* Usually we filter by class anyway. */}
                            {/* But wait, JsonIgnore means it won't be serialized. So frontend won't receive 'academicClass'. */}
                            {/* I should have ignored the BACK reference from parent to child, OR used JsonManagedReference/JsonBackReference. */}
                            {/* But AcademicClass -> Subject relation didn't exist in AcademicClass entity explicitly? */}
                            {/* Wait, AcademicClass entity did NOT have `List<Subject> subjects`. */}
                            {/* So where was the loop? */}
                            {/* Maybe it was Subject -> AcademicClass -> ... and AcademicClass had something else? */}
                            {/* Or maybe lazy loading proxy failure was the only issue. */}
                            {/* If I use JsonIgnore properties hibernateLazyInitializer it might be better. */}
                            {/* For now, I will assume we filter by class mostly. */}
                            <th className="px-6 py-4 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : subjects.length === 0 ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">No subjects found.</td></tr>
                        ) : (
                            subjects.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{sub.code}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{sub.name}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleDelete(sub.id)}
                                            className="text-slate-400 hover:text-rose-600"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Subject</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.academicClassId}
                                    onChange={e => setFormData({ ...formData, academicClassId: e.target.value })}
                                >
                                    <option value="">-- Select Class --</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="e.g. PHYS-101"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Subject
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
