import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Award, Clock, X } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch unread count periodically
    const fetchUnreadCount = async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count", error);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications(0, 10);
            setNotifications(data.content || []);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, currentReadStatus) => {
        if (currentReadStatus) return; // Already read
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'REVISION_APPROVED':
            case 'ACHIEVEMENT':
                return <CheckCircle className="text-emerald-500" size={16} />;
            case 'REVISION_REJECTED':
            case 'WARNING':
                return <AlertTriangle className="text-rose-500" size={16} />;
            default:
                return <Info className="text-blue-500" size={16} />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-colors active:scale-90 ${isOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white border-[1.5px] border-white rounded-full text-[9px] font-black flex items-center justify-center translate-x-1/4 -translate-y-1/4">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel (Bottom Sheet on Mobile, Dropdown on Desktop) */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Mobile Backdrop overlay */}
                        {isMobile && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
                                onClick={() => setIsOpen(false)}
                            />
                        )}

                        <motion.div
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: -10 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={`
                                z-[60] flex flex-col bg-white overflow-hidden shadow-2xl
                                ${isMobile 
                                    ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] border-t border-slate-200' 
                                    : 'absolute right-0 mt-2 w-96 rounded-2xl border border-slate-200 origin-top-right'
                                }
                            `}
                        >
                            
                            {/* Mobile Drag Handle */}
                            {isMobile && (
                                <div className="flex justify-center pt-3 pb-1 w-full bg-white shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-slate-900 md:text-sm text-lg tracking-tight">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="bg-rose-100 text-rose-700 text-[10px] md:text-[11px] font-black px-2.5 py-0.5 rounded-full">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs md:text-[11px] font-bold text-slate-500 hover:text-primary flex items-center gap-1 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg active:scale-95"
                            >
                                <Check size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 overscroll-contain" style={{ maxHeight: isMobile ? 'calc(85vh - 130px)' : '350px'}}>
                        {loading ? (
                            <div className="py-10 flex justify-center">
                                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                                <Bell size={32} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => {
                                            handleMarkAsRead(notif.id, notif.read);
                                            setIsOpen(false);
                                            if (notif.relatedEntityId) {
                                                navigate(`/questions?view=${notif.relatedEntityId}`);
                                            }
                                        }}
                                        className={`flex gap-3 p-4 border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                                            notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/50'
                                        }`}
                                    >
                                        <div className="shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                {getIconForType(notif.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className={`text-[13px] leading-tight truncate ${notif.read ? 'font-semibold text-slate-700' : 'font-black text-slate-900'}`}>
                                                    {notif.title}
                                                </h4>
                                                {!notif.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1"></span>}
                                            </div>
                                            <p className={`text-[12px] leading-snug line-clamp-2 ${notif.read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                                                {notif.message}
                                            </p>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
                                                <Clock size={10} />
                                                {new Date(notif.createdAt).toLocaleString('bn-BD', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-3 md:p-2 bg-slate-50 border-t border-slate-100 text-center shrink-0 safe-area-bottom">
                        <button 
                            onClick={() => { setIsOpen(false); window.location.href = '/notifications'; }}
                            className="text-[13px] md:text-[12px] font-bold text-primary transition-colors w-full py-2.5 md:py-1.5 rounded-xl hover:bg-blue-100 active:scale-95 bg-blue-50/50 md:bg-transparent">
                            View all notifications
                        </button>
                    </div>
                </motion.div>
                </>
            )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationDropdown;
