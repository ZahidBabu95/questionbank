import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Sparkles, AlertCircle, Book, User, Building, ScanLine, Map } from 'lucide-react';

export default function BookCard({
    book,
    idx,
    openEditModal,
    handleDeleteBook,
    getBadgeStyle,
    hasLanguageMismatch
}) {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.5, type: "spring", stiffness: 100 }}
            className="group relative flex flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 overflow-hidden"
        >
            {/* Action Header */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 delay-75">
                <button onClick={(e) => openEditModal(book, e)} className="w-9 h-9 bg-white shadow-xl flex items-center justify-center rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 cursor-pointer">
                    <Edit2 size={16} strokeWidth={2.5} />
                </button>
                <button onClick={(e) => handleDeleteBook(book.id, e)} className="w-9 h-9 bg-white shadow-xl flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-slate-100 cursor-pointer">
                    <Trash2 size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* Type & Sync Badges */}
            <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-1.5 pointer-events-none">
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${getBadgeStyle(book.bookType)}`}>
                    {book.bookType.replace('_', ' ')}
                </span>
                {book.vectorizedChunks > 0 && (
                    <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-indigo-500/30 border border-indigo-400/50"
                    >
                        <Sparkles size={10} strokeWidth={3} className="text-indigo-100" />
                        <span>AI Synced</span>
                    </motion.span>
                )}
                {hasLanguageMismatch(book) && (
                    <motion.span 
                        animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-rose-600 to-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-rose-500/40 border border-rose-500"
                        title="The book medium does not match the curriculum subject medium!"
                    >
                        <AlertCircle size={10} strokeWidth={3} className="animate-pulse text-rose-100" />
                        <span>Mismatch Alert</span>
                    </motion.span>
                )}
            </div>

            <div className="p-6">
                <div className="flex gap-6">
                    {/* Book Cover */}
                    <div className="w-[110px] sm:w-[130px] flex-shrink-0 relative group/cover">
                        <div className="aspect-[3/4.2] rounded-xl overflow-hidden shadow-sm bg-slate-100 border border-slate-200 hover:shadow-md transition-all duration-300">
                            {book.coverImageUrl ? (
                                <img src={book.coverImageUrl} className="w-full h-full object-cover" alt={book.title} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <Book size={40} strokeWidth={1} />
                                    <span className="text-[8px] font-black mt-2 opacity-50 uppercase tracking-tighter">No Preview</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex gap-2 mb-2">
                            {book.language === 'English' && <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase border border-indigo-100 shadow-sm">EN</span>}
                            {book.language === 'Bangla' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-100 shadow-sm">BN</span>}
                            {(book.language === 'Bilingual' || book.language === 'Mixed') && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100 shadow-sm">BI</span>}
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 line-clamp-2 select-text" title={book.title}>
                            {book.title}
                        </h3>
                        
                        <div className="space-y-1.5 mt-auto">
                            <div className="flex items-center gap-2 text-slate-500">
                                <User size={14} className="flex-shrink-0 text-slate-400" />
                                <p className="text-xs font-bold truncate tracking-tight">{book.authorName || 'No Author Info'}</p>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Building size={14} className="flex-shrink-0 text-slate-400" />
                                <p className="text-xs font-bold truncate tracking-tight">{book.publisher || 'Unknown Publisher'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Digitization Progress */}
                <div className="mt-8 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/progress relative overflow-hidden">
                    {book.isProcessing ? (
                        <div className="absolute inset-0 bg-indigo-600 flex flex-col justify-center items-center z-10 px-4 text-center">
                            <div className="w-full flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    Background Engine Active
                                </span>
                                <span className="text-xs font-black text-white">{book.processedPagesCount || 0}/{book.totalPagesToProcess || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-indigo-900/50 rounded-full overflow-hidden flex">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${book.totalPagesToProcess > 0 ? ((book.processedPagesCount || 0) / book.totalPagesToProcess) * 100 : 0}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-white relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/50 w-full animate-[shimmer_1.5s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
                                </motion.div>
                            </div>
                            <p className="text-[9px] text-indigo-200 uppercase font-black tracking-widest mt-2">Uploading & Extracting Base Data...</p>
                        </div>
                    ) : null}

                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digitization Pulse</span>
                        </div>
                        <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                            {book.goldenPages || 0} <span className="text-slate-300 mx-1">/</span> {book.totalPages || 0}
                        </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${book.totalPages > 0 ? ((book.goldenPages || 0) / book.totalPages) * 100 : 0}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative group-hover/progress:from-indigo-600 group-hover/progress:to-indigo-400 transition-all duration-500"
                        />
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${book.totalPages > 0 ? (((book.extractedPages || 0) - (book.goldenPages || 0)) / book.totalPages) * 100 : 0}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 + 0.2 }}
                            className="h-full bg-slate-300/50"
                        />
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span>Golden Record</span>
                        <span className="text-slate-800">{book.totalPages > 0 ? Math.round(((book.goldenPages || 0) / book.totalPages) * 100) : 0}%</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Academic Map</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{book.mappedClassName || 'Global Repo'}</p>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Bookshelf</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{book.bookType.charAt(0) + book.bookType.slice(1).toLowerCase()}</p>
                    </div>
                </div>
            </div>

            {/* Action Footprints */}
            <div className="mt-auto grid grid-cols-2 p-4 pt-0 gap-3">
                <Link 
                    to={`/knowledge-hub/digitization/${book.id}`} 
                    target="_blank" rel="noopener noreferrer"
                    className="group/scan bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300"
                >
                    <ScanLine size={16} className="group-hover/scan:rotate-12 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-wider">Scans</span>
                </Link>
                <Link 
                    to={`/knowledge-hub/proofreading/${book.id}`} 
                    target="_blank" rel="noopener noreferrer"
                    className="bg-indigo-600 hover:bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-100 hover:shadow-none"
                >
                    <Map size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">Focus</span>
                </Link>
            </div>
        </motion.div>
    );
}
