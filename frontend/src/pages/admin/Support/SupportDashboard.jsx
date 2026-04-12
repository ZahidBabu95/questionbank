import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, CheckCircle, Clock, AlertTriangle, Plus, Search, Filter, Hash, User, Paperclip, MoreVertical, Shield, Bot, Zap, Lightbulb } from 'lucide-react';
import supportService from '../../../services/supportService';

const SupportDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', category: 'GENERAL', initialMessage: '' });

    const messagesEndRef = useRef(null);

    // Safely extract role to prevent crashes
    const userData = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
    const userRoleStr = userData.role || (userData.roles && userData.roles[0]) || '';
    const isAdmin = String(userRoleStr).includes("ADMIN");

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchTicketDetails(selectedTicket.id);
        }
    }, [selectedTicket?.id]);

    useEffect(() => {
        // Auto scroll to bottom of chat
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = isAdmin ? await supportService.getAllTickets() : await supportService.getMyTickets();
            setTickets(data.content || []);
            if (data.content?.length > 0 && !selectedTicket && !isCreating) {
                setSelectedTicket(data.content[0]);
            }
        } catch (error) {
            console.error("Failed to fetch tickets", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async (id) => {
        try {
            const data = await supportService.getTicketDetails(id);
            setMessages(data.messages || []);
        } catch (error) {
            console.error("Failed to load details", error);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            const created = await supportService.createTicket(newTicket);
            setTickets([created, ...tickets]);
            setSelectedTicket(created);
            setIsCreating(false);
            setNewTicket({ subject: '', category: 'GENERAL', initialMessage: '' });
        } catch (error) {
            alert('Failed to create ticket');
        } finally {
            setSending(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSending(true);
        try {
            const updatedTicket = await supportService.replyToTicket(selectedTicket.id, { message: replyText });
            setMessages(updatedTicket.messages);
            setReplyText('');
            // Optional: refresh ticket list to update lastMessagePreview
            setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, lastMessagePreview: replyText } : t));
        } catch (error) {
            alert('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const updated = await supportService.updateTicketStatus(selectedTicket.id, newStatus);
            setSelectedTicket(updated);
            setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        } catch (err) {
            alert('Error updating status');
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'OPEN': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-[calc(100vh-100px)] max-w-7xl mx-auto flex flex-col md:flex-row gap-4 px-4 pb-4">
            
            {/* Left Sidebar: Ticket List */}
            <div className="w-full md:w-1/3 lg:w-96 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full shrink-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Support Inbox</h2>
                        <span className="text-xs font-medium text-slate-500">{tickets.length} total tickets</span>
                    </div>
                    <button 
                        onClick={() => { setIsCreating(true); setSelectedTicket(null); }}
                        className="bg-primary text-white p-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm active:scale-95"
                        title="New Ticket"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                            <MessageSquare size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">No tickets found</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <div 
                                key={ticket.id}
                                onClick={() => { setSelectedTicket(ticket); setIsCreating(false); }}
                                className={`p-4 border-b border-slate-50 cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-blue-50/50 border-l-4 border-l-primary' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <h3 className="font-semibold text-sm text-slate-800 line-clamp-1 flex-1 pr-2">{ticket.subject}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                    {ticket.lastMessagePreview || 'No messages yet...'}
                                </p>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium tracking-wide">
                                    <span className="flex items-center gap-1">
                                        <Hash size={12} /> {ticket.category}
                                    </span>
                                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Chat / Creator View */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative min-w-0">
                
                {isCreating ? (
                    // New Ticket Form
                    <div className="p-6 h-full flex flex-col items-center justify-center p-4 w-full h-full overflow-y-auto custom-scrollbar">
                        <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/50 p-6 md:p-8 my-auto">
                            <div className="text-center mb-4">
                                <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-3 relative shadow-inner">
                                    <Bot size={28} />
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">AI Support is Online!</h2>
                                <p className="text-sm text-slate-500 mt-1">Our intelligent bot will analyze your ticket and reply instantly. If it can't solve it, a human agent will step in.</p>
                            </div>

                            <div className="bg-gradient-to-tr from-emerald-50 to-blue-50 border border-emerald-100/60 rounded-xl p-4 text-xs mb-6 flex gap-3 text-left shadow-sm">
                                <Zap className="flex-shrink-0 text-emerald-500 mt-0.5" size={18} />
                                <div>
                                    <strong className="block mb-1 text-slate-800 font-bold uppercase tracking-wider text-[10px]">Tips for Fastest Resolution:</strong>
                                    <ul className="list-none space-y-1.5 text-slate-600 font-medium">
                                        <li className="flex gap-2"><span>•</span> Provide specific subjects (e.g. &quot;Payment Failure BKash&quot;)</li>
                                        <li className="flex gap-2"><span>•</span> Include Transaction IDs, Email, or Error details</li>
                                        <li className="flex gap-2"><span>•</span> If you need further help after AI replies, simply reply to re-open the ticket.</li>
                                    </ul>
                                </div>
                            </div>

                            <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                                        value={newTicket.category} 
                                        onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                                    >
                                        <option value="GENERAL">General Inquiry</option>
                                        <option value="BUG">Report a Bug</option>
                                        <option value="PAYMENT">Payment Issue</option>
                                        <option value="QUESTION_REPORT">Question Bank Error</option>
                                        <option value="FEATURE_REQUEST">Feature Request</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Brief description of the issue"
                                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium placeholder:font-normal"
                                        value={newTicket.subject} 
                                        onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Describe your issue in detail</label>
                                    <textarea 
                                        required 
                                        rows="4" 
                                        placeholder="Please provide all relevant details..."
                                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none custom-scrollbar font-medium placeholder:font-normal"
                                        value={newTicket.initialMessage} 
                                        onChange={e => setNewTicket({...newTicket, initialMessage: e.target.value})}
                                    />
                                </div>
                                <div className="mt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={sending || !newTicket.subject.trim() || !newTicket.initialMessage.trim()}
                                        className="flex-[2] py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Send size={16} />} 
                                        Submit Ticket
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm">
                            <div className="flex-1 min-w-0 pr-4">
                                <h2 className="text-base font-bold text-slate-800 truncate">{selectedTicket.subject}</h2>
                                <p className="text-xs font-medium text-slate-500 mt-0.5 tracking-wide flex items-center gap-1.5">
                                    <span className="text-slate-400">Created by:</span> <span className="text-slate-700">{selectedTicket.userName}</span> 
                                    <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                                    <span className="uppercase">{selectedTicket.category}</span>
                                </p>
                            </div>

                            {/* Admin Status Controls */}
                            {isAdmin && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 hidden sm:inline-block">Status</span>
                                    <select 
                                        className={`font-bold outline-none rounded-lg px-2 lg:px-3 py-1.5 appearance-none cursor-pointer border shadow-sm ${getStatusColor(selectedTicket.status)}`}
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                    >
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/30 flex flex-col gap-6">
                            
                            <div className="text-center pt-2 pb-6">
                                <span className="bg-slate-100/80 text-slate-500 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-sm">
                                    {new Date(selectedTicket.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            {messages.map((msg, index) => {
                                const isMe = (isAdmin && msg.senderType === 'ADMIN') || (!isAdmin && msg.senderType === 'USER');
                                const isSystem = msg.senderType === 'SYSTEM';
                                const isAi = msg.senderType === 'AI';

                                if (isSystem) {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-2">
                                            <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-4 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
                                                <AlertTriangle size={12} className="inline mr-1.5 text-slate-400 -mt-0.5" />
                                                {msg.message}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-[85%] md:max-w-[75%] gap-2 lg:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            
                                            {/* Avatar */}
                                            <div className="shrink-0 pt-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-white
                                                    ${isAi ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 
                                                      isMe ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                                                    {isAi ? <Shield size={14} /> : msg.senderName ? msg.senderName.charAt(0).toUpperCase() : <User size={14} />}
                                                </div>
                                            </div>

                                            {/* Bubble Envelope */}
                                            <div className="flex flex-col">
                                                {/* Sender Name & Role Label */}
                                                {!isMe && (
                                                    <div className="flex items-center gap-1.5 mb-1 pl-1">
                                                        <span className="text-xs font-bold text-slate-600">{isAi ? 'Support AI' : msg.senderName}</span>
                                                        <span className="bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
                                                            {msg.senderType}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Bubble Content */}
                                                <div className={`p-3.5 md:p-4 rounded-2xl shadow-sm text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap
                                                    ${isMe 
                                                        ? 'bg-primary text-white rounded-tr-sm' 
                                                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                                                    {msg.message}
                                                </div>

                                                {/* Timestamp */}
                                                <div className={`text-[10px] text-slate-400 mt-1 font-medium tracking-wide flex items-center gap-1 ${isMe ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                                                    <Clock size={10} />
                                                    {formatTime(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            {selectedTicket.status === 'CLOSED' ? (
                                <div className="text-center py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium">
                                    <AlertTriangle size={16} className="inline mr-2 -mt-0.5 text-slate-400"/>
                                    This ticket has been closed. You cannot send replies.
                                </div>
                            ) : (
                                <form onSubmit={handleReply} className="flex items-end gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                    <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors mb-0.5">
                                        <Paperclip size={18} />
                                    </button>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your reply here..."
                                        className="flex-1 bg-transparent max-h-32 min-h-[44px] py-2.5 px-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none custom-scrollbar"
                                        rows={Math.min(4, replyText.split('\n').length || 1)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply(e);
                                            }
                                        }}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!replyText.trim() || sending}
                                        className="p-3 bg-primary text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm mb-0.5"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                ) : (
                    // Empty State Check
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <MessageSquare size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-600 mb-1">No Ticket Selected</h3>
                        <p className="text-sm">Select a ticket from the left panel or create a new one.</p>
                        
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="mt-6 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        >
                            Open New Ticket
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportDashboard;
