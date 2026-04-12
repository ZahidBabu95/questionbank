import React, { useState, useEffect } from 'react';
import {
    Search, Calendar, User, ArrowRight, BookOpen,
    Tag, ChevronRight, Hash, Globe, Mail,
    Facebook, Twitter, Linkedin, Github
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import blogService from '../../../services/blogService';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../../../context/BrandingContext';


const BlogListing = () => {
    const { category, tag } = useParams();
    const [searchParams] = useSearchParams();
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const branding = useBranding();


    useEffect(() => {
        fetchData();
        fetchMetadata();
    }, [category, tag, page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let data;
            if (category) {
                data = await blogService.getPostsByCategory(category, page);
            } else if (tag) {
                data = await blogService.getPostsByTag(tag, page);
            } else {
                data = await blogService.getPublicPosts(page);
            }
            setPosts(data.content);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch blog posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const catData = await blogService.getPublicCategories();
            setCategories(catData);
        } catch (err) {
            console.error('Failed to fetch categories');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans selection:bg-indigo-100 selection:text-secondary">
            {/* Simple Hero Section */}
            <section className="relative pt-20 pb-12 overflow-hidden bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-secondary text-[10px] font-black uppercase tracking-widest">
                            <BookOpen size={12} />
                            Platform Insights
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                            Latest from <span className="bg-gradient-to-r from-secondary to-purple-600 bg-clip-text text-transparent">{branding?.system_name || 'QuestionShaper'}</span>
                        </h1>

                        <p className="text-lg text-slate-500 max-w-2xl font-medium">Educational trends, platform updates, and best practices for modern teaching.</p>

                        {/* Status/Context Indicator */}
                        {(category || tag) && (
                            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200">
                                <span>Filtering by {category ? 'Category' : 'Tag'}:</span>
                                <span className="text-indigo-400 capitalize">{category || tag}</span>
                                <Link to="/blog" className="ml-2 p-1 hover:text-rose-400 transition-colors"><Mail size={14} className="rotate-45" /></Link>
                            </div>
                        )}
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-[100px] -z-0 translate-x-1/2 -translate-y-1/2 opacity-50"></div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Main Feed */}
                    <div className="flex-1 space-y-12">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="bg-white h-96 rounded-[2.5rem] border border-slate-100"></div>)}
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                                {posts.map((post, idx) => (
                                    <motion.article
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex flex-col space-y-4 group cursor-pointer"
                                    >
                                        <Link to={`/blog/${post.slug}`} className="block overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 relative aspect-[16/10]">
                                            {post.featuredImage ? (
                                                <img
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                                    <BookOpen size={48} className="opacity-40" />
                                                </div>
                                            )}
                                            <div className="absolute top-6 left-6">
                                                <span className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-xl text-[10px] font-black text-slate-900 shadow-xl uppercase tracking-widest border border-white/20">
                                                    {post.category?.name || 'Academic'}
                                                </span>
                                            </div>
                                        </Link>

                                        <div className="space-y-3 px-2">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                                <div className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(post.publishDate).toLocaleDateString()}</div>
                                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                <Link to={`/blog/author/${post.authorName}`} className="hover:text-secondary transition-colors">{post.authorName || 'Staff Writer'}</Link>
                                            </div>
                                            <Link to={`/blog/${post.slug}`}>
                                                <h3 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-secondary transition-colors line-clamp-2">
                                                    {post.title}
                                                </h3>
                                            </Link>
                                            <p className="text-slate-500 line-clamp-3 leading-relaxed font-medium">
                                                {post.summary}
                                            </p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {post.tags?.map(tag => (
                                                    <Link
                                                        key={tag.id}
                                                        to={`/blog/tag/${tag.slug}`}
                                                        className="text-[10px] font-black text-indigo-500 bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all"
                                                    >
                                                        #{tag.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>
                        ) : (
                            <div className="h-96 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[4rem] border border-dashed border-slate-200">
                                <BookOpen size={48} className="text-slate-200" />
                                <h3 className="text-xl font-black text-slate-400">No stories found here yet.</h3>
                                <Link to="/blog" className="text-secondary font-black flex items-center gap-2 hover:gap-3 transition-all">Back to main feed <ArrowRight size={18} /></Link>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pt-12 flex justify-center gap-4">
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-600 font-black hover:bg-indigo-50 hover:text-secondary transition shadow-sm disabled:opacity-30 disabled:hover:bg-white"
                                >
                                    <ChevronRight className="rotate-180" size={24} />
                                </button>
                                <div className="flex items-center px-8 bg-white border border-slate-100 rounded-2xl text-sm font-black text-slate-900 shadow-sm">
                                    {page + 1} / {totalPages}
                                </div>
                                <button
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-600 font-black hover:bg-indigo-50 hover:text-secondary transition shadow-sm disabled:opacity-30 disabled:hover:bg-white"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-96 space-y-12 shrink-0">
                        {/* Categories List */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 sticky top-24">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-50 pb-4 flex items-center gap-2.5">
                                <Folder size={20} className="text-secondary" />
                                Topics
                            </h3>
                            <div className="space-y-4">
                                {categories.map(cat => (
                                    <Link
                                        key={cat.id}
                                        to={`/blog/category/${cat.slug}`}
                                        className={`flex items-center justify-between group p-2 -mx-2 rounded-xl transition-all ${category === cat.slug ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full transition-colors ${category === cat.slug ? 'bg-secondary' : 'bg-slate-200 group-hover:bg-indigo-400'}`}></div>
                                            <span className={`text-sm font-black ${category === cat.slug ? 'text-secondary' : 'text-slate-600 group-hover:text-secondary'}`}>{cat.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-400">View</span>
                                    </Link>
                                ))}
                            </div>

                            {/* Newsletter Mini CTA */}
                            <div className="mt-12 bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform"><Mail size={80} className="text-white" /></div>
                                <h4 className="text-white font-black text-lg leading-tight relative z-10">Get academic <br /> updates daily.</h4>
                                <div className="mt-6 flex flex-col gap-3 relative z-10">
                                    <input type="text" placeholder="your@email.com" className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/40 outline-none" />
                                    <button className="w-full bg-white text-slate-900 font-black text-[10px] py-2.5 rounded-xl uppercase tracking-widest hover:bg-slate-100 transition shadow-2xl">Subscribe</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-slate-100 py-20 mt-20">
                <div className="max-w-7xl mx-auto px-4 text-center space-y-8">
                    <div className="flex justify-center gap-8 text-slate-300">
                        <Facebook size={20} className="hover:text-secondary transition-colors cursor-pointer" />
                        <Twitter size={20} className="hover:text-indigo-400 transition-colors cursor-pointer" />
                        <Linkedin size={20} className="hover:text-indigo-700 transition-colors cursor-pointer" />
                        <Github size={20} className="hover:text-slate-900 transition-colors cursor-pointer" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{branding?.footer_text || `© ${new Date().getFullYear()} QuestionShaper Editorial. All Rights Reserved.`}</p>

                </div>
            </footer>
        </div>
    );
};

export default BlogListing;
