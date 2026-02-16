import React from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, CheckCircle, Layout, Users,
    ArrowRight, Zap, Globe, Shield, Star, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-200/60 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <motion.div
                                initial={{ rotate: -10, scale: 0.9 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white"
                            >
                                <Layout strokeWidth={2.5} size={22} />
                            </motion.div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">
                                QuestionShaper
                            </span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                            <a href="#solutions" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Solutions</a>
                            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                                Log in
                            </Link>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    to="/signup"
                                    className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                                >
                                    Get Started
                                </Link>
                            </motion.div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="text-slate-500 hover:text-slate-700 p-2"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:hidden bg-white border-b border-slate-100 absolute w-full px-4 py-4 space-y-3 shadow-xl"
                    >
                        <a href="#features" className="block text-base font-medium text-slate-600 hover:text-blue-600">Features</a>
                        <a href="#solutions" className="block text-base font-medium text-slate-600 hover:text-blue-600">Solutions</a>
                        <a href="#pricing" className="block text-base font-medium text-slate-600 hover:text-blue-600">Pricing</a>
                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <Link to="/login" className="block text-center w-full py-2.5 text-slate-600 font-semibold border border-slate-200 rounded-xl">
                                Log in
                            </Link>
                            <Link to="/signup" className="block text-center w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30">
                                Get Started
                            </Link>
                        </div>
                    </motion.div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
                >
                    <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-8">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        New v2.0 Released
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        Smart Exam Management <br />
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Made Simple.
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Empower your institute with AI-driven question generation, automated grading, and comprehensive performance analytics.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link
                            to="/signup"
                            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-1 flex items-center gap-2 group w-full sm:w-auto justify-center"
                        >
                            Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="px-8 py-4 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm hover:shadow-md w-full sm:w-auto">
                            View Demo
                        </button>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="mt-12 flex items-center justify-center gap-8 text-slate-400 grayscale opacity-70">
                        {/* Placeholder logos */}
                        <div className="font-bold text-xl">ACADEMY</div>
                        <div className="font-bold text-xl">INSTITUTE</div>
                        <div className="font-bold text-xl">COLLEGE</div>
                        <div className="font-bold text-xl hidden sm:block">SCHOOL</div>
                    </motion.div>
                </motion.div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <motion.div
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]"
                    ></motion.div>
                    <motion.div
                        animate={{
                            y: [0, 20, 0],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 7,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 1
                        }}
                        className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[80px]"
                    ></motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Everything you need to run exams</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                            Powerful tools designed to streamline your assessment workflow from creation to grading.
                        </p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        <FeatureCard
                            icon={<Layout className="w-6 h-6 text-blue-600" />}
                            title="Question Bank"
                            desc="Organize questions by Class, Subject, Chapter, and Topic with our intuitive structured tagging system."
                            color="bg-blue-50"
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title="Auto Generator"
                            desc="Create balanced exam papers in seconds using smart algorithms that follow your blueprint."
                            color="bg-amber-50"
                        />
                        <FeatureCard
                            icon={<Users className="w-6 h-6 text-emerald-500" />}
                            title="Multi-Tenant"
                            desc="Perfect for individual teachers, coaching centers, and large schools with role-based access."
                            color="bg-emerald-50"
                        />
                        <FeatureCard
                            icon={<BookOpen className="w-6 h-6 text-indigo-500" />}
                            title="Lecture Sheets"
                            desc="Design professional handouts and study materials directly within the platform."
                            color="bg-indigo-50"
                        />
                        <FeatureCard
                            icon={<CheckCircle className="w-6 h-6 text-rose-500" />}
                            title="Smart Grading"
                            desc="Automated OMR scanning and instant result processing for objective questions."
                            color="bg-rose-50"
                        />
                        <FeatureCard
                            icon={<Globe className="w-6 h-6 text-cyan-500" />}
                            title="Online Exams"
                            desc="Conduct secure, timed online assessments accessible from any device anywhere."
                            color="bg-cyan-50"
                        />
                    </motion.div>
                </div>
            </section>

            {/* Stats/Social Proof */}
            <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-4 gap-12"
                    >
                        <motion.div variants={fadeInUp} className="space-y-2">
                            <h3 className="text-4xl font-extrabold text-blue-400">50k+</h3>
                            <p className="text-slate-400 font-medium">Questions Banked</p>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="space-y-2">
                            <h3 className="text-4xl font-extrabold text-indigo-400">100+</h3>
                            <p className="text-slate-400 font-medium">Institutes</p>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="space-y-2">
                            <h3 className="text-4xl font-extrabold text-emerald-400">1M+</h3>
                            <p className="text-slate-400 font-medium">Exams Taken</p>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="space-y-2">
                            <h3 className="text-4xl font-extrabold text-amber-400">99.9%</h3>
                            <p className="text-slate-400 font-medium">Uptime</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="max-w-4xl mx-auto px-4 text-center relative z-10"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Ready to modernize your institute?</h2>
                    <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
                        Join the fastest growing education platform today. No credit card required.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-block px-10 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 hover:scale-105"
                    >
                        Get Started Now
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                    <Layout size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-lg font-bold text-slate-900">QuestionShaper</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Building the future of educational assessment and management.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">API</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Careers</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Security</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm">
                            © 2024 QuestionShaper Inc. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            {/* Social icons would go here */}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, color }) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ y: -5 }}
        className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
    >
        <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">
            {desc}
        </p>
    </motion.div>
);

export default LandingPage;
