import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowLeft, Shield, CheckCircle, Layout, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import cmsService from '../../services/cmsService';
import { useBranding } from '../../context/BrandingContext';

const LANG_DISPLAY_NAMES = {
    en: 'English',
    bn: 'বাংলা'
};

const TermsOfService = () => {
    const [terms, setTerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLang, setCurrentLang] = useState('en');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [anchors, setAnchors] = useState([]);
    const [activeAnchor, setActiveAnchor] = useState('');
    const branding = useBranding();

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('token'));
        
        const storedLang = localStorage.getItem('user-language');
        if (storedLang === 'bn' || storedLang === 'en') {
            setCurrentLang(storedLang);
        }

        const fetchTerms = async () => {
            try {
                const data = await cmsService.getPublicSection('TERMS_SECTION');
                setTerms(data);
                
                // Extract headings for dynamic anchor navigation
                if (data) {
                    const bodyItem = data.contents.find(c => c.contentKey === 'BODY_CONTENT');
                    if (bodyItem && bodyItem.contentValue) {
                        let text = bodyItem.contentValue;
                        try {
                            const json = JSON.parse(text);
                            text = json[currentLang] || json['en'] || '';
                        } catch (e) {
                            // fallback plain text
                        }
                        
                        const extracted = [];
                        text.split('\n').forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('## ') || trimmed.startsWith('##')) {
                                const title = trimmed.replace(/^##\s*/, '').trim();
                                const id = title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-');
                                extracted.push({ id, title });
                            }
                        });
                        setAnchors(extracted);
                        if (extracted.length > 0) {
                            setActiveAnchor(extracted[0].id);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load terms of service:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTerms();
    }, [currentLang]);

    // Handle scroll to highlight active anchor
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 200;
            for (const anchor of anchors) {
                const el = document.getElementById(anchor.id);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPos >= top && scrollPos < top + height + 100) {
                        setActiveAnchor(anchor.id);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [anchors]);

    const toggleLanguage = () => {
        const nextLang = currentLang === 'en' ? 'bn' : 'en';
        setCurrentLang(nextLang);
        localStorage.setItem('user-language', nextLang);
    };

    const getTranslationValue = (itemKey) => {
        if (!terms) return '';
        const item = terms.contents.find(c => c.contentKey === itemKey);
        if (!item || !item.contentValue) return '';
        try {
            const json = JSON.parse(item.contentValue);
            return json[currentLang] || json['en'] || '';
        } catch (e) {
            return currentLang === 'bn' ? item.contentValue : '';
        }
    };

    const renderMarkdown = (text) => {
        if (!text) return null;
        return text.split('\n\n').map((paragraph, idx) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('###')) {
                return (
                    <h4 key={idx} className="text-sm font-bold text-slate-800 mt-6 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                        {trimmed.replace(/^###\s*/, '')}
                    </h4>
                );
            }
            if (trimmed.startsWith('##')) {
                const headerText = trimmed.replace(/^##\s*/, '');
                const headerId = headerText.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-');
                return (
                    <h3 id={headerId} key={idx} className="text-lg sm:text-xl font-extrabold text-slate-900 mt-12 mb-6 border-l-4 border-indigo-600 pl-4 scroll-mt-24">
                        {headerText}
                    </h3>
                );
            }
            if (trimmed.startsWith('#')) {
                return (
                    <h2 key={idx} className="text-2xl font-black text-slate-900 mt-10 mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        {trimmed.replace(/^#\s*/, '')}
                    </h2>
                );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <ul key={idx} className="list-disc pl-6 space-y-3 mb-6 text-slate-600 text-sm sm:text-base leading-relaxed">
                        {trimmed.split('\n').map((li, lIdx) => {
                            const liText = li.replace(/^[\-\*]\s*/, '').trim();
                            if (!liText) return null;
                            return <li key={lIdx} className="pl-1">{liText}</li>;
                        })}
                    </ul>
                );
            }
            if (/^\d+\.\s/.test(trimmed)) {
                return (
                    <ol key={idx} className="list-decimal pl-6 space-y-3 mb-6 text-slate-600 text-sm sm:text-base leading-relaxed">
                        {trimmed.split('\n').map((li, lIdx) => {
                            const liText = li.replace(/^\d+\.\s*/, '').trim();
                            if (!liText) return null;
                            return <li key={lIdx} className="pl-1">{liText}</li>;
                        })}
                    </ol>
                );
            }
            return <p key={idx} className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base font-normal">{trimmed}</p>;
        });
    };

    const pageTitle = getTranslationValue('TITLE') || (currentLang === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service');
    const bodyContent = getTranslationValue('BODY_CONTENT');

    const scrollToAnchor = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setActiveAnchor(id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden flex flex-col font-sans selection:bg-indigo-600/10 selection:text-indigo-900">
            {/* Subtle light gradient glow */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-50/70 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            {/* Corporate Header Navbar */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-50 transition-all select-none">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Back & Brand Logo */}
                        <div className="flex items-center gap-5">
                            <Link to="/" className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/60 rounded-2xl transition-all active:scale-95 shadow-sm bg-white">
                                <ArrowLeft size={18} />
                            </Link>
                            <Link to="/" className="flex items-center gap-3">
                                {branding?.logo_url ? (
                                    <img src={branding.logo_url} alt="Logo" className="h-10 w-auto object-contain select-none" />
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                                            <Layout strokeWidth={2.5} size={20} />
                                        </div>
                                        <span className="font-extrabold text-slate-900 text-lg tracking-tight">QuestionShaper</span>
                                    </>
                                )}
                            </Link>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-600/30 bg-white shadow-sm transition-all select-none active:scale-95"
                            >
                                <Globe size={14} className="text-slate-400" />
                                {LANG_DISPLAY_NAMES[currentLang]}
                            </button>

                            {isLoggedIn ? (
                                <Link to="/dashboard" className="inline-flex items-center px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all">
                                    {currentLang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
                                </Link>
                            ) : (
                                <Link to="/login" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition bg-white border border-slate-200 px-4.5 py-2.5 rounded-xl shadow-sm">
                                    {currentLang === 'bn' ? 'লগইন' : 'Log In'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Layout Body with Sidebar Anchor List */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col lg:flex-row gap-10">
                
                {/* Sticky Section Sidebar - Tablet / Desktop */}
                {anchors.length > 0 && (
                    <aside className="hidden lg:block w-72 shrink-0">
                        <div className="sticky top-32 space-y-4">
                            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-200/60">
                                <FileText size={16} className="text-indigo-600" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Contents</span>
                            </div>
                            <nav className="space-y-1">
                                {anchors.map(anchor => (
                                    <button
                                        key={anchor.id}
                                        onClick={() => scrollToAnchor(anchor.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs font-bold transition-all border ${
                                            activeAnchor === anchor.id
                                                ? 'bg-indigo-50/55 text-indigo-700 border-indigo-200/50 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 border-transparent'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{anchor.title}</span>
                                        <ChevronRight size={14} className={`shrink-0 transition-transform ${activeAnchor === anchor.id ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400'}`} />
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>
                )}

                {/* Content Article Glass Card */}
                <div className="flex-grow">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 text-sm font-medium">{currentLang === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading secure terms...'}</p>
                        </div>
                    ) : (
                        <motion.article 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 sm:p-14 shadow-[0_8px_30px_rgba(0,0,0,0.02)] relative overflow-hidden"
                        >
                            {/* Decorative glowing gradient sweeping header */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
                            
                            {/* Title & Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Shield size={26} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">LEGAL DOCUMENT</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                <CheckCircle size={10} /> Certified
                                            </span>
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[10px] sm:text-xs font-semibold text-slate-500 w-fit select-none">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                                    {currentLang === 'bn' ? 'সর্বশেষ আপডেট: মে ২০২৬' : 'Last Updated: May 2026'}
                                </div>
                            </div>

                            {/* Terms Text Content */}
                            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed leading-relaxed font-normal">
                                {renderMarkdown(bodyContent) || (
                                    <p className="text-slate-400 italic text-center py-20">
                                        {currentLang === 'bn' ? 'শর্তাবলী উপলব্ধ নেই।' : 'No terms content available.'}
                                    </p>
                                )}
                            </div>
                        </motion.article>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/60 text-center select-none">
                <p className="text-xs text-slate-400">
                    {branding?.footer_text || `© ${new Date().getFullYear()} QuestionShaper Inc. All rights reserved.`}
                </p>
            </footer>
        </div>
    );
};

export default TermsOfService;
