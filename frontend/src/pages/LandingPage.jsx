import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, CheckCircle, Layout, Users,
    ArrowRight, Zap, Globe, Shield, Star, Menu, X, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import cmsService from '../services/cmsService';
import { useBranding } from '../context/BrandingContext';


const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cmsData, setCmsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const branding = useBranding();


    useEffect(() => {
        const loadContent = async () => {
            try {
                const data = await cmsService.getPublicLanding();
                setCmsData(data);
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

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700 overflow-x-hidden">
            {/* Navbar stays largely same as it's structurally fixed usually */}
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
                    </div>
                </div>
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
            </section >

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
            </section >

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

