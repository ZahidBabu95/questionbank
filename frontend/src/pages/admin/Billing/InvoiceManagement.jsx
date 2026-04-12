import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Download, FileText, CheckCircle, XCircle,
    MoreHorizontal, Eye, Trash2, Calendar, CreditCard, DollarSign,
    ChevronLeft, ChevronRight, Clock, MapPin, Printer
} from 'lucide-react';
import invoiceService from '../../../services/invoiceService';
import { motion, AnimatePresence } from 'framer-motion';

const InvoiceManagement = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [expandedInvoice, setExpandedInvoice] = useState(null);

    useEffect(() => {
        fetchInvoices();
    }, [page, statusFilter]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: 10,
                // Add status filtering logic here if backend supports it via Pageable/Params
            };
            const data = await invoiceService.getInvoices(params);
            setInvoices(data.content || []);
            setTotalPages(data.totalPages || 0);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, number) => {
        try {
            await invoiceService.downloadPdf(id, number);
        } catch (err) {
            alert('Failed to download invoice');
        }
    };

    const markAsPaid = async (id) => {
        if (!window.confirm('Mark this invoice as PAID?')) return;
        try {
            await invoiceService.updatePayment(id, {
                status: 'PAID',
                method: 'MANUAL',
                reference: 'Admin Manual Entry'
            });
            fetchInvoices();
        } catch (err) {
            alert('Update failed');
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            PAID: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            PENDING: 'bg-amber-50 text-amber-600 border-amber-100',
            FAILED: 'bg-rose-50 text-rose-600 border-rose-100',
            CANCELLED: 'bg-slate-50 text-slate-500 border-slate-100'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status] || styles.PENDING}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Subscription Invoices</h1>
                    <p className="text-slate-500 mt-1">Track payments, generate receipts, and manage billing history.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by invoice number or institute..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institute</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-6 py-6"><div className="h-6 bg-slate-50 rounded-lg w-full"></div></td>
                                </tr>
                            ))
                        ) : invoices.map(inv => (
                            <React.Fragment key={inv.id}>
                                <tr className="hover:bg-slate-50/50 transition group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-secondary rounded-lg">
                                                <FileText size={18} />
                                            </div>
                                            <span className="font-bold text-slate-700">{inv.invoiceNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-900">{inv.instituteName}</div>
                                        <div className="text-[10px] text-indigo-500 font-bold uppercase">{inv.packageName || 'Custom Billing'}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-black text-slate-900">${inv.totalAmount}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black">{inv.currency}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-medium text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-rose-500 font-bold">Due {new Date(inv.dueDate).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={inv.paymentStatus} />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                                                title="Download PDF"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                                                className="p-2 bg-indigo-50 text-secondary rounded-lg hover:bg-secondary hover:text-white transition"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {inv.paymentStatus === 'PENDING' && (
                                                <button
                                                    onClick={() => markAsPaid(inv.id)}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition"
                                                    title="Mark as Paid"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedInvoice === inv.id && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-0 border-none">
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="bg-slate-50/50 p-8 rounded-2xl mb-6 mx-2 border border-slate-100">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items</h4>
                                                                <div className="space-y-3">
                                                                    {inv.items.map(item => (
                                                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                                                            <span className="text-slate-600 font-medium">{item.itemName} x{item.quantity}</span>
                                                                            <span className="font-bold text-slate-900">${item.totalPrice}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-secondary">
                                                                    <span>TOTAL</span>
                                                                    <span>${inv.totalAmount}</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Info</h4>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                                        <CreditCard size={14} /> Method: {inv.paymentMethod || 'N/A'}
                                                                    </div>
                                                                    {inv.paymentReference && (
                                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                                            <DollarSign size={14} /> Ref: {inv.paymentReference}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Notes</h4>
                                                                <p className="text-xs text-slate-500 italic">
                                                                    {inv.notes || 'No notes available for this invoice.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="p-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {page + 1} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceManagement;
