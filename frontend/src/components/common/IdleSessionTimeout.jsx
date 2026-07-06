import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, ShieldAlert, RefreshCw } from 'lucide-react';
import axios from '../../utils/axios';

const IdleSessionTimeout = () => {
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    // 14 minutes of inactivity before warning (14 * 60 * 1000 ms)
    const IDLE_LIMIT = 14 * 60 * 1000;
    // 60 seconds warning countdown
    const WARNING_LIMIT = 60;

    const idleTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const warningOpenRef = useRef(false);
    const lastWriteRef = useRef(0);

    // Synchronize warning state with ref to read inside event handlers
    useEffect(() => {
        warningOpenRef.current = isWarningOpen;
    }, [isWarningOpen]);

    // Throttled activity tracker to reset idle timer
    const resetIdleTimer = (isFromStorageEvent = false) => {
        // If warning modal is already open and it's NOT a storage event, do not reset idle timer on activity
        if (warningOpenRef.current && !isFromStorageEvent) return;

        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }

        idleTimerRef.current = setTimeout(() => {
            triggerWarning();
        }, IDLE_LIMIT);

        // If this reset came from a storage event of another tab, do not write back to storage (prevent loop)
        if (!isFromStorageEvent) {
            const now = Date.now();
            // Throttle localStorage writes to once every 10 seconds to protect performance
            if (now - lastWriteRef.current > 10000) {
                localStorage.setItem('lastActivity', now.toString());
                lastWriteRef.current = now;
            }
        }
    };

    // Open warning countdown modal
    const triggerWarning = () => {
        setIsWarningOpen(true);
        setCountdown(WARNING_LIMIT);
    };

    // Action: Call Backend API to refresh JWT token (Sliding Session)
    const handleKeepWorking = async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/v1/auth/refresh-token', { token });
            if (response.data.success && response.data.data) {
                // Save new refreshed token
                localStorage.setItem('token', response.data.data);
                
                // Clear warning state and reset idle timer
                setIsWarningOpen(false);
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
                resetIdleTimer();
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            handleLogout();
        } finally {
            setRefreshing(false);
        }
    };

    // Action: Logout and redirect to login page
    const handleLogout = () => {
        setIsWarningOpen(false);
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
    };

    // Set up activity event listeners on mount
    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
        
        const onActivity = () => {
            resetIdleTimer();
        };

        const onStorageChange = (e) => {
            if (e.key === 'lastActivity') {
                // Another tab reported activity!
                // Reset our idle timer, marking it as from storage event to prevent write-back
                resetIdleTimer(true);
                
                // If warning modal is open, close it because session was kept active in another tab
                setIsWarningOpen(false);
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
            } else if (e.key === 'token' && !e.newValue) {
                // Token was removed (logout triggered in another tab)
                handleLogout();
            }
        };

        // Initialize timer
        resetIdleTimer();

        // Bind events
        events.forEach(event => {
            window.addEventListener(event, onActivity);
        });

        window.addEventListener('storage', onStorageChange);

        // Cleanup
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            events.forEach(event => {
                window.removeEventListener(event, onActivity);
            });
            window.removeEventListener('storage', onStorageChange);
        };
    }, []);

    // Set up countdown interval when warning is open
    useEffect(() => {
        if (isWarningOpen) {
            countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current);
                        handleLogout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [isWarningOpen]);

    return (
        <AnimatePresence>
            {isWarningOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Glassmorphic Dark Blur Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleKeepWorking} // Clicking backdrop defaults to keeping working safely
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />

                    {/* Premium Warning Card */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                        className="bg-white/95 border border-slate-100 rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden z-10"
                    >
                        {/* Alarm pulsing top decoration */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 animate-pulse" />

                        <div className="flex flex-col items-center text-center">
                            {/* Pulsating Icon */}
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center mb-6 relative">
                                <ShieldAlert size={32} className="animate-pulse" />
                                <div className="absolute inset-0 rounded-2xl bg-orange-400/10 animate-ping -z-10" />
                            </div>

                            {/* Warning Header */}
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                নিষ্ক্রিয়তার সতর্কতা
                            </h3>
                            
                            {/* Warning Details */}
                            <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
                                আপনি দীর্ঘ সময় ধরে কোনো কাজ করছেন না। আপনার নিরাপত্তার স্বার্থে সেশনটি স্বয়ংক্রিয়ভাবে শেষ হতে চলেছে।
                            </p>

                            {/* Countdown Circular indicator wrapper */}
                            <div className="my-6 bg-slate-50 rounded-2xl border border-slate-100 px-6 py-4 flex items-center gap-3">
                                <Clock size={18} className="text-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
                                <span className="text-sm font-bold text-slate-700">
                                    সেশন শেষ হতে বাকি: <span className="text-rose-600 font-extrabold text-base font-mono">{countdown}</span> সেকেন্ড
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full mt-2">
                                <button
                                    onClick={handleKeepWorking}
                                    disabled={refreshing}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 sm:py-3.5 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-75 disabled:transform-none shrink-0"
                                >
                                    {refreshing ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <Clock size={16} />
                                    )}
                                    <span>কাজ চালিয়ে যান</span>
                                </button>
                                
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3.5 px-6 rounded-2xl font-bold text-sm transition-all border border-slate-200/60 active:scale-95 shrink-0"
                                >
                                    <LogOut size={16} />
                                    <span>লগআউট করুন</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default IdleSessionTimeout;
