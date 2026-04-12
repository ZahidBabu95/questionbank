import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Filter, MoreVertical,
    ExternalLink, Edit, Trash2, CheckCircle, XCircle, Clock,
    Eye, CornerUpRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import blogService from '../../../../services/blogService';
import { motion, AnimatePresence } from 'framer-motion';

const BlogList = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchPosts();
    }, [page]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const data = await blogService.getAllPosts(page);
            setPosts(data.content);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await blogService.deletePost(id);
                fetchPosts();
            } catch (err) {
                alert('Delete failed');
            }
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PUBLISHED':
                return <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"><CheckCircle size={14} /> Published</span>;
            case 'DRAFT':
                return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"><Clock size={14} /> Draft</span>;
            case 'ARCHIVED':
                return <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"><XCircle size={14} /> Archived</span>;
            default:
                return status;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Blog CMS</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Manage your portal's academic content and news.</p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/cms/blog/categories"
                        className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all hover:border-slate-300"
                    >
                        Categories
                    </Link>
                    <Link
                        to="/cms/blog/create"
                        className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={20} />
                        Create New Post
                    </Link>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Posts', value: posts.length, color: 'indigo' },
                    { label: 'Published', value: posts.filter(p => p.status === 'PUBLISHED').length, color: 'emerald' },
                    { label: 'Drafts', value: posts.filter(p => p.status === 'DRAFT').length, color: 'amber' },
                    { label: 'Archived', value: posts.filter(p => p.status === 'ARCHIVED').length, color: 'slate' }
                ].map(stat => (
                    <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
                        </div>
                        <div className={`w-12 h-12 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                            <FileText size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by title, author or category..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl border border-slate-100 hover:bg-slate-100 transition">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Posts Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Article Content</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Category & Tags</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Author</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Updated</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence mode="popLayout">
                                {posts.map((post, idx) => (
                                    <motion.tr
                                        key={post.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-slate-50/30 transition-colors group cursor-default"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0">
                                                    {post.featuredImage ? (
                                                        <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <FileText size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-secondary transition-colors">
                                                        {post.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 mt-1 font-medium italic">/{post.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {post.category?.name || 'Uncategorized'}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {post.tags?.map(tag => (
                                                        <span key={tag.id} className="text-[10px] font-bold text-indigo-500">#{tag.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {getStatusBadge(post.status)}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">
                                                    {post.authorName?.substring(0, 2).toUpperCase() || 'AD'}
                                                </div>
                                                <span className="text-sm font-bold text-slate-600">{post.authorName || 'Admin'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-bold text-slate-500">
                                                {new Date(post.updatedAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(post.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                                                    className="p-2.5 text-slate-400 hover:text-secondary hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="View Live Article"
                                                >
                                                    <CornerUpRight size={18} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/cms/blog/edit/${post.id}`)}
                                                    className="p-2.5 text-slate-400 hover:text-secondary hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Edit Article"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Delete Permanently"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {!loading && posts.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <FileText size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">No blog posts found</h3>
                            <p className="text-slate-500 max-w-xs mt-1">Start by creating your first article to engage with your academy users.</p>
                        </div>
                        <Link
                            to="/cms/blog/create"
                            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all"
                        >
                            Create Post
                        </Link>
                    </div>
                )}

                {/* Pagination Placeholder */}
                <div className="px-8 py-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/20">
                    <p className="text-xs font-bold text-slate-400">Showing {posts.length} of {totalPages * 10} posts</p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-6 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-white transition"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-6 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-white transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogList;
