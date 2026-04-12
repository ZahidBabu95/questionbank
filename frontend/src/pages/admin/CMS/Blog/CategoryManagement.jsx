import React, { useState, useEffect } from 'react';
import {
    Folder, Plus, Edit, Trash2, X, Save,
    Search, ExternalLink, ChevronRight, Hash,
    Layers, CornerDownRight, MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import blogService from '../../../../services/blogService';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [showForm, setShowForm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await blogService.getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await blogService.updateCategory(editingId, form);
            } else {
                await blogService.createCategory(form);
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ name: '', description: '' });
            fetchCategories();
        } catch (err) {
            alert('Failed to save category');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this category? Posts within this category will become Uncategorized.')) {
            try {
                await blogService.deleteCategory(id);
                fetchCategories();
            } catch (err) {
                alert('Delete failed');
            }
        }
    };

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setForm({ name: cat.name, description: cat.description || '' });
        setShowForm(true);
    };

    return (
        <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/cms/blog/posts')}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taxonomy: Categories</h1>
                        <p className="text-slate-500 mt-1 font-medium italic">Classification domains for your academic articles.</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '' }); }}
                        className="flex items-center gap-2 px-8 py-4 bg-secondary text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={20} />
                        Add Domain
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Search & List */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="relative w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search taxonomies..."
                                className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-4 space-y-2">
                            {categories.map((cat, idx) => (
                                <motion.div
                                    key={cat.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-6 rounded-[2rem] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group flex items-start justify-between"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-secondary group-hover:text-white transition-colors">
                                            <Folder size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">{cat.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">slug: {cat.slug}</p>
                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2 max-w-md">{cat.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(cat)}
                                                className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-secondary rounded-xl hover:border-indigo-100 hover:bg-indigo-50/20 transition-all"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl hover:border-rose-100 hover:bg-rose-50/20 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Post Count: 0</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        {categories.length === 0 && !loading && (
                            <div className="p-20 text-center opacity-40">
                                <Layers size={48} className="mx-auto mb-4" />
                                <p className="font-bold">No categories defined yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Inline Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full lg:w-96"
                        >
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-8 sticky top-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-black text-slate-900">
                                        {editingId ? 'Modify Domain' : 'Define Domain'}
                                    </h2>
                                    <button onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-500"><X size={20} /></button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                            <Hash size={12} />
                                            Domain Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition"
                                            placeholder="e.g. Exam Strategy"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Scope Description</label>
                                        <textarea
                                            rows={5}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-500 outline-none focus:ring-2 focus:ring-indigo-100 transition"
                                            placeholder="Explain what this domain covers..."
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                                    >
                                        <Save size={18} />
                                        {editingId ? 'Confirm Update' : 'Initialize Domain'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CategoryManagement;
