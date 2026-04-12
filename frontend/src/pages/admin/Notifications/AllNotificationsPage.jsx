import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight, Inbox, MailOpen } from 'lucide-react';
import notificationService from '../../../services/notificationService';
import { useNavigate } from 'react-router-dom';

const AllNotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filter, setFilter] = useState('ALL'); // ALL, UNREAD
    const PAGE_SIZE = 15;

    useEffect(() => {
        fetchData();
    }, [page, filter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications(page, PAGE_SIZE);
            const count = await notificationService.getUnreadCount();
            
            setUnreadCount(count);
            
            if (filter === 'UNREAD') {
                setNotifications((data.content || []).filter(n => !n.read));
                // Note: Real API pagination needs a backend filter param for accurate unread paging.
                // For now, this is a basic UI filter if the unread count is low.
            } else {
                setNotifications(data.content || []);
            }
            
            setTotalPages(data.totalPages || 0);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id, currentReadStatus) => {
        if (currentReadStatus) return; // Already read
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            if (filter === 'UNREAD') {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
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
            if (filter === 'UNREAD') {
                setNotifications([]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'REVISION_APPROVED':
            case 'ACHIEVEMENT':
                return <CheckCircle className="text-emerald-500" size={20} />;
            case 'REVISION_REJECTED':
            case 'WARNING':
                return <AlertTriangle className="text-rose-500" size={20} />;
            default:
                return <Info className="text-blue-500" size={20} />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="text-primary" size={28} />
                        Notification Center
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and view all your system alerts and activities.</p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button 
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
                        >
                            <MailOpen size={16} /> Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => { setFilter('ALL'); setPage(0); }}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${filter === 'ALL' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    All Notifications
                </button>
                <button
                    onClick={() => { setFilter('UNREAD'); setPage(0); }}
                    className={`px-6 py-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${filter === 'UNREAD' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Unread 
                    {unreadCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Notification List Body */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Inbox size={64} strokeWidth={1} className="mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-600 mb-1">No notifications found</h3>
                        <p className="text-sm">You're all caught up! Empty inbox.</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                        {notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => {
                                    handleMarkAsRead(notif.id, notif.read);
                                    if (notif.relatedEntityId) {
                                        navigate(`/questions?view=${notif.relatedEntityId}`);
                                    }
                                }}
                                className={`flex items-start gap-4 p-5 sm:p-6 transition-colors cursor-pointer ${
                                    notif.read ? 'bg-white hover:bg-slate-50 opacity-80' : 'bg-blue-50/20 hover:bg-blue-50/40 relative'
                                }`}
                            >
                                {!notif.read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                )}
                                
                                <div className="shrink-0 pt-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${notif.read ? 'bg-slate-100' : 'bg-white border-2 border-primary/10'}`}>
                                        {getIconForType(notif.type)}
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                                        <h3 className={`text-base leading-tight ${notif.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                                            {notif.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            <Clock size={12} />
                                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    <p className={`text-sm leading-relaxed ${notif.read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                                        {notif.message}
                                    </p>
                                    
                                    {/* Additional actionable tags/info can go here */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded ${notif.read ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                            {notif.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && filter !== 'UNREAD' && (
                <div className="flex items-center justify-between mt-6 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                    <span className="text-sm font-medium text-slate-500">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(page + 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllNotificationsPage;
