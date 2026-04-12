import React, { useState, useEffect } from 'react';
import {
    Calendar, User, ArrowLeft, BookOpen,
    Tag, Link as LinkIcon, Share2, Facebook,
    Twitter, Linkedin, Bookmark, MessageSquare,
    Eye, CornerUpRight, Clipboard
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import blogService from '../../../services/blogService';
import { motion } from 'framer-motion';
import { useBranding } from '../../../context/BrandingContext';


const BlogPostDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const branding = useBranding();


    useEffect(() => {
        fetchPost();
        window.scrollTo(0, 0);
    }, [slug]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const data = await blogService.getPublicPost(slug);
            setPost(data);
            // Dynamic Title for SEO optimization
            document.title = data.metaTitle || `${data.title} | ${branding?.system_name || 'QuestionShaper'} Blog`;

        } catch (err) {
            console.error('Failed to fetch blog post:', err);
            navigate('/blog');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4 animate-pulse">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200">
                <BookOpen size={32} />
            </div>
            <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Loading Story...</p>
        </div>
    );

    if (!post) return null;

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-secondary">
            {/* Reading Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 lg:py-6">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link to="/blog" className="flex items-center gap-2 group text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest">Back to Library</span>
                    </Link>
                    <div className="flex gap-4">
                        <button onClick={copyToClipboard} className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl hover:bg-white hover:shadow-lg transition-all relative">
                            {copySuccess ? <CheckDouble size={18} className="text-emerald-500" /> : <Clipboard size={18} />}
                            {copySuccess && <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">Copied!</span>}
                        </button>
                        <button className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl hover:bg-white hover:shadow-lg transition-all">
                            <Bookmark size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <article className="max-w-4xl mx-auto px-4 py-16">
                {/* Visual Header */}
                <div className="space-y-10">
                    <div className="space-y-6 flex flex-col items-center text-center">
                        <div className="flex items-center gap-3">
                            <Link
                                to={`/blog/category/${post.category?.slug}`}
                                className="px-4 py-1.5 bg-indigo-50 text-secondary text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100/50 hover:bg-secondary hover:text-white transition-all"
                            >
                                {post.category?.name || 'Topic'}
                            </Link>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                <Eye size={12} /> 12 min read
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                            {post.title}
                        </h1>
                        <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed italic">
                            “{post.summary}”
                        </p>

                        <div className="flex items-center gap-4 pt-6">
                            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black border-4 border-slate-50 shadow-2xl overflow-hidden relative group">
                                {post.authorName?.substring(0, 1).toUpperCase()}
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{post.authorName || 'Staff Writer'}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12} />Published: {new Date(post.publishDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100 shadow-2xl relative group aspect-[21/9]">
                        {post.featuredImage ? (
                            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-indigo-900 to-slate-900 flex items-center justify-center text-white">
                                <BookOpen size={80} className="opacity-10 rotate-12" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                    </div>
                </div>

                {/* Actual Article Content */}
                <div className="py-16 flex flex-col lg:flex-row gap-16 relative">
                    {/* Share Vertical Bar (Desktop Only) */}
                    <aside className="hidden lg:flex flex-col gap-6 sticky top-40 h-fit py-4 -ml-24">
                        {[Facebook, Twitter, Linkedin, MessageSquare].map((Icon, idx) => (
                            <button key={idx} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <Icon size={20} />
                            </button>
                        ))}
                    </aside>

                    {/* Rich Text Body */}
                    <div className="flex-1">
                        <div className="prose prose-lg prose-indigo max-w-none prose-p:text-slate-600 prose-headings:text-slate-900 prose-headings:font-black prose-p:leading-[1.8] prose-p:font-medium text-slate-700 selection:bg-indigo-100 selection:text-indigo-700"
                            dangerouslySetInnerHTML={{ __html: post.content }} />

                        {/* Tags Section */}
                        <div className="mt-20 pt-10 border-t border-slate-50 flex flex-wrap gap-3">
                            {post.tags?.map(tag => (
                                <Link
                                    key={tag.id}
                                    to={`/blog/tag/${tag.slug}`}
                                    className="px-6 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-200 hover:bg-indigo-50 hover:text-secondary transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Tag size={12} />
                                    {tag.name}
                                </Link>
                            ))}
                        </div>

                        {/* Author Bio Simple CTA */}
                        <div className="mt-20 p-10 lg:p-12 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-500"><Sparkles size={120} className="text-slate-900" /></div>
                            <div className="w-24 h-24 bg-secondary rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl relative z-10">
                                {post.authorName?.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="space-y-2 relative z-10 flex-1">
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Article Contributor</p>
                                <h4 className="text-2xl font-black text-slate-900">{post.authorName || 'Staff Writer'}</h4>
                                <p className="text-slate-500 font-medium leading-relaxed max-w-md">Expert contributor and academic researcher focusing on the intersection of AI, pedagogy, and assessment strategies in modern ed-tech environments.</p>
                            </div>
                            <button className="px-8 py-3 bg-white text-slate-900 border border-slate-200 font-black rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">Follow Author</button>
                        </div>
                    </div>
                </div>
            </article>

            {/* Next Articles / Footer Mini */}
            <div className="bg-slate-900 py-32 mt-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                <div className="max-w-4xl mx-auto px-4 relative z-10 flex flex-col items-center text-center space-y-6">
                    <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Up Next</h5>
                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Ready to elevate your <br /> teaching strategy?</h2>
                    <p className="text-slate-400 text-lg font-medium max-w-xl">Join 50,000+ educators using {branding?.system_name || 'QuestionShaper'} to craft perfect exams and engage students in a new era of learning.</p>

                    <Link to="/signup" className="mt-8 px-12 py-5 bg-secondary text-white font-black rounded-[2rem] hover:bg-white hover:text-slate-900 transition-all shadow-2xl shadow-indigo-500/20 text-lg">
                        Get Started for Free
                    </Link>
                </div>
            </div>
        </div>
    );
};

// Helper Icon Internal
const CheckDouble = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 7 17l-5-5" />
        <path d="m22 10-7.5 7.5L13 16" />
    </svg>
)

export default BlogPostDetail;
