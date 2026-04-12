import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Filter, Save, X,
    Image as ImageIcon, Globe, Eye, Settings,
    CheckCircle, XCircle, Clock, Link as LinkIcon,
    Tag, ChevronRight, Hash, Sparkles
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import blogService from '../../../../services/blogService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion, AnimatePresence } from 'framer-motion';

const BlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        title: '',
        slug: '',
        summary: '',
        content: '',
        featuredImage: '',
        categoryId: '',
        tagIds: [],
        status: 'DRAFT',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        ogImage: ''
    });

    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        fetchMetadata();
        if (isEdit) fetchPost();
    }, [id]);

    const fetchMetadata = async () => {
        const [catData, tagData] = await Promise.all([
            blogService.getCategories(),
            blogService.getTags()
        ]);
        setCategories(catData);
        setTags(tagData);
    };

    const fetchPost = async () => {
        try {
            const data = await blogService.getPostById(id);
            setForm({
                ...data,
                categoryId: data.category?.id || '',
                tagIds: data.tags?.map(t => t.id) || []
            });
        } catch (err) {
            console.error('Failed to fetch post:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await blogService.updatePost(id, form);
            } else {
                await blogService.createPost(form);
            }
            alert('Post saved successfully!');
            navigate('/cms/blog/posts');
        } catch (err) {
            alert('Failed to save post: ' + err.message);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'video'],
            ['clean'],
            [{ 'color': [] }, { 'background': [] }],
            ['blockquote', 'code-block']
        ],
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/cms/blog/posts')}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                            <Sparkles size={10} />
                            Editorial CMS
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {isEdit ? 'Modify Article' : 'Draft New Story'}
                        </h1>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        type="submit"
                        onClick={() => setForm({ ...form, status: 'DRAFT' })}
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition duration-300"
                    >
                        {isEdit ? 'Keep as Draft' : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        onClick={() => setForm({ ...form, status: 'PUBLISHED' })}
                        className="px-10 py-3 bg-secondary text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        {isEdit ? 'Update & Live' : 'Go Live Now'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8">
                        {/* Title & Slug */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <FileText size={12} />
                                    Main Article Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter a catchy title..."
                                    className="w-full text-4xl font-black text-slate-900 placeholder:text-slate-200 outline-none focus:ring-0"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2 px-1">
                                <span className="text-xs font-bold text-slate-300 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-100">
                                    <Globe size={12} />
                                    questionshaper.com/blog/
                                </span>
                                <input
                                    type="text"
                                    placeholder="url-friendly-slug-auto-generated"
                                    className="flex-1 text-sm font-bold text-indigo-500 focus:text-secondary outline-none italic"
                                    value={form.slug}
                                    onChange={e => setForm({ ...form, slug: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-2 pt-4 border-t border-slate-50">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Short Narrative (Meta Summary)</label>
                            <textarea
                                rows={3}
                                placeholder="A brief hook for the listing page and search engines..."
                                className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition resize-none leading-relaxed"
                                value={form.summary}
                                onChange={e => setForm({ ...form, summary: e.target.value })}
                            />
                        </div>

                        {/* Rich Text Content */}
                        <div className="space-y-2 pt-4 border-t border-slate-50">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4 block">Deep Content (Rich Text Body)</label>
                            <div className="quill-premium-wrapper">
                                <ReactQuill
                                    theme="snow"
                                    value={form.content}
                                    onChange={val => setForm({ ...form, content: val })}
                                    modules={modules}
                                    className="bg-white rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEO Fields Area - Premium Collapsible Style Idea */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                                <Search className="text-indigo-500" size={24} />
                                Search Engine Optimization
                            </h3>
                            <div className="px-4 py-1.5 bg-indigo-50 text-secondary text-[10px] font-black rounded-lg uppercase tracking-wider">SEO Level: High</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Title Tag</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50/30 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                                        value={form.metaTitle}
                                        onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Keywords</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50/30 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-300"
                                        placeholder="education, exam tips, quiz generation..."
                                        value={form.metaKeywords}
                                        onChange={e => setForm({ ...form, metaKeywords: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Description</label>
                                <textarea
                                    rows={5}
                                    className="w-full px-6 py-4 bg-slate-50/30 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                                    value={form.metaDescription}
                                    onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-8">
                    {/* Publishing Status */}
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20"><Settings size={80} /></div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Publish Matrix</h3>
                        <div className="space-y-3 relative z-10">
                            {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map(stat => (
                                <button
                                    key={stat}
                                    type="button"
                                    onClick={() => setForm({ ...form, status: stat })}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${form.status === stat
                                        ? 'bg-white text-slate-900 shadow-xl'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {stat === 'PUBLISHED' ? <CheckCircle size={18} /> :
                                            stat === 'DRAFT' ? <Clock size={18} /> : <XCircle size={18} />}
                                        {stat}
                                    </div>
                                    {form.status === stat && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Media & Featured Image */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                            <ImageIcon className="text-indigo-500" size={20} />
                            Featured Visual
                        </h3>
                        <div className="space-y-4">
                            <div className="w-full aspect-[16/10] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 overflow-hidden group hover:border-indigo-200 transition-colors cursor-pointer relative">
                                {form.featuredImage ? (
                                    <img src={form.featuredImage} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                        <ImageIcon size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">Upload Visual</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="External JPG/PNG Image URL..."
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                                value={form.featuredImage}
                                onChange={e => setForm({ ...form, featuredImage: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Taxonomy (Categories & Tags) */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                                <Settings className="text-indigo-500" size={20} />
                                Categorization
                            </h3>
                            <div className="space-y-2">
                                <select
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none cursor-pointer"
                                    value={form.categoryId}
                                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                >
                                    <option value="">Select Domain...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-8 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                                    <Tag className="text-indigo-500" size={20} />
                                    Taxonomy Tags
                                </h3>
                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Multiple</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                            const updated = form.tagIds.includes(tag.id)
                                                ? form.tagIds.filter(tid => tid !== tag.id)
                                                : [...form.tagIds, tag.id];
                                            setForm({ ...form, tagIds: updated });
                                        }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${form.tagIds.includes(tag.id)
                                            ? 'bg-secondary text-white shadow-lg shadow-indigo-100'
                                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                            }`}
                                    >
                                        #{tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default BlogEditor;
