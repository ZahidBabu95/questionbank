import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Book, AlertTriangle, Check } from 'lucide-react';
import academicService from '../../../services/academicService';

const AcademicClassList = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', order: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const data = await academicService.getAllClasses();
            // Sort by order
            const sorted = data.sort((a, b) => (a.order || 0) - (b.order || 0));
            setClasses(sorted);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await academicService.createClass(formData);
            fetchClasses();
            setShowModal(false);
            setFormData({ name: '', order: '' });
            setEditingId(null);
        } catch (error) {
            console.error("Failed to save class", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this class? This may delete all associated subjects!")) return;
        try {
            await academicService.deleteClass(id);
            fetchClasses();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700">All Classes</h2>
                <button
                    onClick={() => { setFormData({ name: '', order: '' }); setEditingId(null); setShowModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-transform active:scale-95"
                >
                    <Plus size={18} /> Add Class
                </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Order</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Class Name</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {loading ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">Loading classes...</td></tr>
                        ) : classes.length === 0 ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">No classes found. Add one to get started.</td></tr>
                        ) : (
                            classes.map(cls => (
                                <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-sm text-slate-500">{cls.order}</td>
                                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{cls.name}</td>
                                    <td className="px-6 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleDelete(cls.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                                            title="Delete Class"
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Class' : 'Add New Class'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Class 10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Order (Sort Priority)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={formData.order}
                                    onChange={e => setFormData({ ...formData, order: e.target.value })}
                                    placeholder="e.g. 10"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                                >
                                    Save Class
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademicClassList;
