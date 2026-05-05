import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, CheckCircle, Layout, Users,
    ArrowRight, Zap, Globe, Shield, Star, Menu, X, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import cmsService from '../services/cmsService';
import { useBranding } from '../context/BrandingContext';


const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cmsData, setCmsData] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const branding = useBranding();


    useEffect(() => {
        const loadContent = async () => {
            try {
                const [data, packagesData] = await Promise.all([
                    cmsService.getPublicLanding(),
                    cmsService.getPublicPackages()
                ]);
                setCmsData(data);
                setPackages(packagesData);
            } catch (err) {
                console.error('Failed to load CMS content');
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, []);

    const findSection = (key) => cmsData.find(s => s.sectionKey === key);
    const getContent = (section, key, fallback) => {
        if (!section) return fallback;
        const item = section.contents.find(c => c.contentKey === key);
        return item ? item.contentValue : fallback;
    };

    const hero = findSection('HERO_SECTION');
    const features = findSection('FEATURES_SECTION');
    const stats = findSection('STATS_SECTION');
    const cta = findSection('CTA_SECTION');

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-200/60 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link to="/" className="flex-shrink-0">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center"
                            >
                                {branding?.logo_url ? (
                                    <img
                                        src={branding.logo_url}
                                        alt="Logo"
                                        className="h-12 w-auto object-contain drop-shadow-sm select-none"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 text-white">

                                        <Layout strokeWidth={2.5} size={28} />
                                    </div>
                                )}
                            </motion.div>
                        </Link>





                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</a>
                            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Pricing</a>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link to="/signup" className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-primary hover:brightness-110 transition-all shadow-lg shadow-primary/30">
                                    Get Started
                                </Link>
                            </motion.div>
                        </div>

                        {/* Mobile Menu Toggle Button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={toggleMenu}
                                className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Drawer */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 overflow-hidden"
                        >
                            <div className="px-4 py-6 space-y-4 flex flex-col items-center">
                                <a href="#features" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">Features</a>
                                <a href="#pricing" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">Pricing</a>
                                
                                <div className="w-full h-px bg-slate-100 my-2"></div>
                                
                                <Link to="/login" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">Log in</Link>
                                <Link to="/signup" onClick={toggleMenu} className="block w-full text-center px-5 py-4 text-base font-bold rounded-xl text-white bg-primary shadow-lg shadow-primary/30">
                                    Get Started Free
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Dynamic Hero Section */}
            <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
                >
                    <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8">

                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {getContent(hero, 'BADGE_TEXT', 'New v2.0 Released')}
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        {getContent(hero, 'TITLE', 'Smart Exam Management')} <br />
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Question Shaper
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {getContent(hero, 'DESCRIPTION', 'Empower your institute with AI-driven question generation and performance analytics.')}
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link
                            to={getContent(hero, 'CTA_LINK', '/signup')}
                            className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-xl shadow-primary/30 hover:-translate-y-1 flex items-center gap-2 group w-full sm:w-auto justify-center"

                        >
                            {getContent(hero, 'CTA_TEXT', 'Start Free Trial')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </motion.div>

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]" />
                </div>
            </section>

            {/* Smart Client Logo Marquee */}
            <section className="py-8 bg-white border-y border-slate-100 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 text-center mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trusted by top educational institutions</p>
                </div>
                <div className="flex whitespace-nowrap animate-marquee md:animate-marquee-slow hover:[animation-play-state:paused]">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex gap-12 md:gap-24 px-6 md:px-12 items-center">
                            <h2 className="text-xl md:text-2xl font-black text-slate-200">NDCC</h2>
                            <h2 className="text-xl md:text-2xl font-black text-slate-200">DHAKA COLLEGE</h2>
                            <h2 className="text-xl md:text-2xl font-black text-slate-200">IDEAL SCHOOL</h2>
                            <h2 className="text-xl md:text-2xl font-black text-slate-200">VIQARUNNISA</h2>
                            <h2 className="text-xl md:text-2xl font-black text-slate-200">RAJUK COLLEGE</h2>
                        </div>
                    ))}
                </div>
            </section>

            {/* Dynamic Features Grid */}
            < section id="features" className="py-24 bg-white relative" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            {getContent(features, 'SECTION_TITLE', 'Everything you need to run exams')}
                        </h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {/* If features exist as dynamic rows, they'd be mapped here. 
                            For now, we map the static keys to CMS items if available. */}
                        <FeatureCard
                            icon={<Layout className="w-6 h-6 text-primary" />}
                            title={getContent(features, 'F1_TITLE', 'Question Bank')}
                            desc={getContent(features, 'F1_DESC', 'Organize questions by Class, Subject, and Topic.')}
                            color="bg-blue-50"
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title={getContent(features, 'F2_TITLE', 'Auto Generator')}
                            desc={getContent(features, 'F2_DESC', 'Create balanced exam papers in seconds.')}
                            color="bg-amber-50"
                        />
                        <FeatureCard
                            icon={<Users className="w-6 h-6 text-emerald-500" />}
                            title={getContent(features, 'F3_TITLE', 'Multi-Tenant')}
                            desc={getContent(features, 'F3_DESC', 'Perfect for coaching centers and large schools.')}
                            color="bg-emerald-50"
                        />
                    </motion.div>
                </div>
            </section>

            {/* Responsive Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Simple, Transparent Pricing</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">Start for free, then upgrade as your institution grows.</p>
                    </motion.div>

                    <div className="flex justify-center -mx-4 md:mx-0">
                        {/* Mobile: Horizontal scroll snapping, Desktop: Grid center */}
                        <div className="flex md:grid md:grid-cols-2 gap-6 px-4 md:px-0 w-full md:max-w-4xl overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-8 md:pb-0 hide-scrollbar justify-start md:justify-center">
                            
                            {packages.length > 0 ? (
                                packages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((pkg) => {
                                    const isPremium = pkg.type === 'ENTERPRISE' || pkg.name.toUpperCase().includes('ENTERPRISE') || pkg.name.toUpperCase().includes('PREMIUM') || pkg.highlightBadge;
                                    
                                    const featuresList = [
                                        pkg.maxStudents === 0 ? 'Unlimited Students' : `Up to ${pkg.maxStudents} Students`,
                                        pkg.maxTeachers === 0 ? 'Unlimited Teachers' : `Up to ${pkg.maxTeachers} Teachers`,
                                        pkg.aiLimitPerMonth === 0 ? 'Unlimited AI Limit' : `AI Limit: ${pkg.aiLimitPerMonth} /mo`,
                                        ...(pkg.featureFlags ? Object.entries(pkg.featureFlags).filter(([_, v]) => v).map(([k, _]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : [])
                                    ];

                                    if (isPremium) {
                                        return (
                                            <motion.div 
                                                key={pkg.id}
                                                variants={fadeInUp}
                                                className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-[#0F172A] rounded-3xl p-8 shadow-xl shadow-primary/20 border border-slate-700 snap-center shrink-0 flex flex-col relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary rounded-full blur-2xl opacity-50"></div>
                                                {pkg.highlightBadge && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-max mb-4">
                                                        <Star size={12} className="fill-current" /> {pkg.highlightBadge}
                                                    </div>
                                                )}
                                                <h3 className="text-2xl font-bold text-white">{pkg.displayName || pkg.name}</h3>
                                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white">
                                                    ৳{pkg.price} <span className="ml-1 text-xl font-medium text-slate-400">/{pkg.billingCycle === 'MONTHLY' ? 'mo' : pkg.billingCycle === 'YEARLY' ? 'yr' : pkg.billingCycle.toLowerCase()}</span>
                                                </div>
                                                <p className="mt-4 text-sm text-slate-300">{pkg.description}</p>
                                                <ul className="mt-8 space-y-4 flex-1">
                                                    {featuresList.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <CheckCircle className="text-primary w-5 h-5 shrink-0" />
                                                            <span className="text-slate-200 text-sm font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-primary text-white font-bold text-center rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                                                    Get Started
                                                </Link>
                                            </motion.div>
                                        );
                                    } else {
                                        return (
                                            <motion.div 
                                                key={pkg.id}
                                                variants={fadeInUp}
                                                className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200 snap-center shrink-0 flex flex-col"
                                            >
                                                <h3 className="text-2xl font-bold text-slate-900">{pkg.displayName || pkg.name}</h3>
                                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-slate-900">
                                                    ৳{pkg.price} <span className="ml-1 text-xl font-medium text-slate-500">/{pkg.billingCycle === 'MONTHLY' ? 'mo' : pkg.billingCycle === 'YEARLY' ? 'yr' : pkg.billingCycle.toLowerCase()}</span>
                                                </div>
                                                <p className="mt-4 text-sm text-slate-500">{pkg.description}</p>
                                                <ul className="mt-8 space-y-4 flex-1">
                                                    {featuresList.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                                                            <span className="text-slate-600 text-sm font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-slate-50 text-slate-900 font-bold text-center rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                                                    Get Started
                                                </Link>
                                            </motion.div>
                                        );
                                    }
                                })
                            ) : (
                                <>
                                    {/* Pro Plan Card */}
                                    <motion.div 
                                        variants={fadeInUp}
                                        className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200 snap-center shrink-0 flex flex-col"
                                    >
                                        <h3 className="text-2xl font-bold text-slate-900">Standard</h3>
                                        <div className="mt-4 flex items-baseline text-4xl font-extrabold text-slate-900">
                                            ৳২৯৯ <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
                                        </div>
                                        <p className="mt-4 text-sm text-slate-500">Essential tools for individual teachers and small coaching centers.</p>
                                        <ul className="mt-8 space-y-4 flex-1">
                                            {['Up to 500 Students', 'AI Question Generator', 'Basic OMR Scanning', 'Email Support'].map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3">
                                                    <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                                                    <span className="text-slate-600 text-sm font-medium">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-slate-50 text-slate-900 font-bold text-center rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                                            Get Started
                                        </Link>
                                    </motion.div>

                                    {/* Premium Plan Card */}
                                    <motion.div 
                                        variants={fadeInUp}
                                        className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-[#0F172A] rounded-3xl p-8 shadow-xl shadow-primary/20 border border-slate-700 snap-center shrink-0 flex flex-col relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary rounded-full blur-2xl opacity-50"></div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-max mb-4">
                                            <Star size={12} className="fill-current" /> Most Popular
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                                        <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white">
                                            ৳৯৯৯ <span className="ml-1 text-xl font-medium text-slate-400">/mo</span>
                                        </div>
                                        <p className="mt-4 text-sm text-slate-300">Complete suite for large schools and franchise institutions.</p>
                                        <ul className="mt-8 space-y-4 flex-1">
                                            {['Unlimited Students', 'Advanced Neural Engine', 'White-labeling & Own Branding', 'Priority Phone Support', 'API Access'].map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3">
                                                    <CheckCircle className="text-primary w-5 h-5 shrink-0" />
                                                    <span className="text-slate-200 text-sm font-medium">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-primary text-white font-bold text-center rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                                            Upgrade to Enterprise
                                        </Link>
                                    </motion.div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </section>

            {/* Dynamic CTA Section */}
            {
                cta && (
                    <section className="py-24 relative overflow-hidden bg-white">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="max-w-4xl mx-auto px-4 text-center relative z-10"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                                {getContent(cta, 'TITLE', 'Ready to modernize your institute?')}
                            </h2>
                            <Link
                                to={getContent(cta, 'BTN_LINK', '/signup')}
                                className="inline-block px-10 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 hover:scale-105"
                            >
                                {getContent(cta, 'BTN_TEXT', 'Get Started Now')}
                            </Link>
                        </motion.div>
                    </section>
                )
            }

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm">
                            {branding?.footer_text || `© ${new Date().getFullYear()} QuestionShaper Inc. All rights reserved.`}

                        </p>
                    </div>
                </div>
            </footer>
        </div >
    );
};

const FeatureCard = ({ icon, title, desc, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
    >
        <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-6`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{desc}</p>
    </motion.div>
);

export default LandingPage;
