import React from 'react';
import { Library, CheckCircle, Layers, AlertCircle } from 'lucide-react';

export default function LibraryStats({ books }) {
    const totalBooks = books.length;
    const digitizedPages = books.reduce((acc, curr) => acc + (curr.goldenPages || 0), 0);
    const inProgressCount = books.filter(b => (b.extractedPages || 0) > (b.goldenPages || 0)).length;
    const pendingCount = books.filter(b => (b.totalPages || 0) === 0).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Library size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Books</p>
                    <h4 className="text-2xl font-black text-slate-800">{totalBooks}</h4>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digitized</p>
                    <h4 className="text-2xl font-black text-slate-800">{digitizedPages}</h4>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Layers size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In Progress</p>
                    <h4 className="text-2xl font-black text-slate-800">{inProgressCount}</h4>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                    <h4 className="text-2xl font-black text-slate-800">{pendingCount}</h4>
                </div>
            </div>
        </div>
    );
}
