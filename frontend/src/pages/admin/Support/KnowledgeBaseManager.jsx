import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, ShieldAlert, CheckCircle2, X, Lightbulb, Inbox, ArrowRight } from 'lucide-react';
import aiKnowledgeService from '../../../services/aiKnowledgeService';
import supportService from '../../../services/supportService';

const KnowledgeBaseManager = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // AI Learning Inbox state
    const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'learning'
    const [learningQueue, setLearningQueue] = useState([]);
    const [loadingQueue, setLoadingQueue] = useState(false);
    
    // Form state
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', tags: '', active: true });
    
    useEffect(() => {
        fetchArticles();
        fetchLearningQueue();
    }, []);

    const fetchLearningQueue = async () => {
        setLoadingQueue(true);
        try {
            const data = await supportService.getAllTickets('OPEN', 0, 10);
            setLearningQueue(data.content || data || []);
        } catch (error) {
            console.error("Failed to fetch learning queue.", error);
        } finally {
            setLoadingQueue(false);
        }
    };

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await aiKnowledgeService.getAllKnowledge();
            setArticles(data);
        } catch (error) {
            console.error("Failed to load knowledge base:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await aiKnowledgeService.updateKnowledge(editingId, formData);
            } else {
                await aiKnowledgeService.createKnowledge(formData);
            }
            setIsModalOpen(false);
            fetchArticles();
        } catch (error) {
            alert('Error saving knowledge article.');
        }
    };

    const handleEdit = (article) => {
        setFormData({
            title: article.title,
            content: article.content,
            tags: article.tags || '',
            active: article.active
        });
        setEditingId(article.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this AI knowledge context?")) {
            await aiKnowledgeService.deleteKnowledge(id);
            fetchArticles();
        }
    };

    const handleToggle = async (id) => {
        await aiKnowledgeService.toggleStatus(id);
        fetchArticles();
    };

    const openCreateModal = () => {
        setFormData({ title: '', content: '', tags: '', active: true });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleTrainFromTicket = (ticket) => {
        setFormData({ 
            title: `[Resolved] ${ticket.subject}`, 
            content: `User asked: ${ticket.lastMessagePreview}\n\nAI Instruction: `, 
            tags: ticket.category?.toLowerCase() || '', 
            active: true 
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-primary" /> AI Support Engine
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage platform rules, FAQs, and guidelines that power the Support Chatbot.</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="bg-primary text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Add Knowledge
                </button>
            </div>

            <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
                <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm shrink-0">
                    <Lightbulb size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">How to enrich the AI Support Engine effectively</h3>
                    <ul className="text-sm text-slate-600 space-y-2 list-none mt-2">
                        <li><span className="text-blue-600 font-bold mr-2">1. Be Specific & Clear:</span> Give specific titles like &quot;Refund Policy&quot; instead of &quot;About Money&quot;. AI matches context based on this.</li>
                        <li><span className="text-blue-600 font-bold mr-2">2. Direct Instructions:</span> Write the context exactly as instructions. E.g. &quot;Do not offer refunds for PDF downloads. Tell them nicely.&quot;</li>
                        <li><span className="text-blue-600 font-bold mr-2">3. Setting Boundaries:</span> If AI shouldn&apos;t answer a topic, explicitly state: &quot;If user asks about manual BKash verify, do not resolve it.&quot;</li>
                        <li><span className="text-blue-600 font-bold mr-2">4. Keywords:</span> Include common misspellings or related Bengali words that users might input for better context matching.</li>
                    </ul>
                </div>
            </div>

            <div className="flex bg-slate-100/80 p-1.5 rounded-xl w-max border border-slate-200">
                <button 
                    onClick={() => setActiveTab('rules')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'rules' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BookOpen size={16} /> Active Rules
                </button>
                <button 
                    onClick={() => setActiveTab('learning')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'learning' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Inbox size={16} /> AI Learning Inbox 
                    {learningQueue.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">{learningQueue.length}</span>}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {activeTab === 'rules' ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                            <Search className="text-slate-400 w-5 h-5 ml-2" />
                            <input 
                                type="text"
                                placeholder="Search knowledge rules..."
                                className="bg-transparent border-none outline-none text-sm w-full font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading AI Engine Data...</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No knowledge rules found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filtered.map(article => (
                                    <div key={article.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-slate-800">{article.title}</h3>
                                                <span onClick={() => handleToggle(article.id)} className={`cursor-pointer px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${article.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {article.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 md:pr-10">{article.content}</p>
                                            <div className="mt-2 text-xs font-semibold text-slate-400">
                                                {article.tags && <span className="bg-slate-200/60 px-2 py-0.5 rounded mr-2">#{article.tags}</span>}
                                                Updated: {new Date(article.updatedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => handleEdit(article)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit3 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(article.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-700">Recent Unresolved User Queries</h2>
                            <p className="text-xs text-slate-500 mt-1">Review topics the AI couldn't resolve automatically and Train the AI to answer them next time.</p>
                        </div>
                        {loadingQueue ? (
                            <div className="p-12 text-center text-slate-400">Checking recent tickets...</div>
                        ) : learningQueue.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20 text-emerald-500" />
                                <p>Great job! No unresolved topics found. AI is handling everything seamlessly.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {learningQueue.map(ticket => (
                                    <div key={ticket.id} className="p-5 flex flex-col hover:bg-slate-50 transition-colors border-l-4 border-l-rose-400">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-800 text-sm">Subject: {ticket.subject}</h3>
                                            <span className="text-xs font-semibold text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="bg-slate-100 text-slate-600 text-sm p-3 rounded-xl mb-4 italic">
                                            "{ticket.lastMessagePreview || 'User submitted a complex query.'}"
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => handleTrainFromTicket(ticket)}
                                                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                                            >
                                                Train AI on this <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ShieldAlert size={20} className="text-primary" /> 
                                {editingId ? 'Edit AI Knowledge' : 'Add AI Knowledge'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Rule Title / FAQ Subject</label>
                                <input 
                                    required type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="e.g. Refund Policy, How to Download Exam"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Context Content (What AI should know)</label>
                                <textarea 
                                    required rows="8" 
                                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none custom-scrollbar font-normal"
                                    value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                                    placeholder="Write exactly what you want the AI to tell users regarding this topic..."
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tags (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                                        value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})}
                                        placeholder="refund, billing, exam"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input 
                                        type="checkbox" 
                                        id="activeStatus"
                                        checked={formData.active}
                                        onChange={e => setFormData({...formData, active: e.target.checked})}
                                        className="w-4 h-4 text-primary"
                                    />
                                    <label htmlFor="activeStatus" className="text-sm font-bold text-slate-700 cursor-pointer">Active in AI Prompt</label>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 pb-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBaseManager;
