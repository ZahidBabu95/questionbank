import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { Mail, Lock, ArrowRight, CheckCircle, Layout, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('password');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await axios.post('/v1/auth/login', { email: username, password });
            if (response.data.success) {
                localStorage.setItem('token', response.data.data);
                navigate('/dashboard');
            } else {
                setError(response.data.message || 'Login failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Check your credentials and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Placeholder for Google Login logic
        console.log("Google Login Clicked");
        alert("Google Login is under development.");
    };

    return (
        <div className="min-h-screen flex bg-white font-sans text-slate-900">
            {/* Left Side - Visual & Branding */}
            <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-between p-16 text-white">
                <div className="absolute inset-0 z-0 select-none">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"
                    ></motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]"
                    ></motion.div>
                </div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3 mb-10"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                            <Layout strokeWidth={2.5} size={24} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">QuestionShaper</span>
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h2 className="text-5xl font-bold mb-8 leading-tight tracking-tight">
                            Transform how you <br />
                            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">manage education.</span>
                        </h2>
                        <p className="text-slate-400 text-xl leading-relaxed mb-12">
                            Join thousands of educators leveraging AI to create better assessments in less time.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors duration-300">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Automated Papers</h4>
                                <p className="text-sm text-slate-400">Generate exam questions in seconds</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors duration-300">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Smart Analytics</h4>
                                <p className="text-sm text-slate-400">Track student and batch performance</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="relative z-10 flex justify-between items-center text-sm text-slate-500 font-medium"
                >
                    <p>© {new Date().getFullYear()} QuestionShaper Inc.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[420px] space-y-10"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
                        <p className="mt-2 text-slate-500">Sign in to your account to continue.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-6">
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-slate-700 font-bold shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-slate-100 w-full absolute"></div>
                            <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest relative z-10">or sign in with email</span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-slate-700 ml-1">Email or Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Mail size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                                    <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 tab-index-[-1]">Forgot password?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Sign In <ArrowRight size={20} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="text-center pt-2">
                        <p className="text-slate-500 font-medium">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline">
                                Create free account
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
