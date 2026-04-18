import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    BookOpen, Layers, CheckCircle, Clock, AlertCircle, FileText,
    TrendingUp, Filter, Download, Database, Boxes, LayoutList, ChevronRight, Check, BarChart, Printer,
    PlayCircle, PauseCircle, Server, HardDrive, Cpu, Activity, CheckCircle2, XCircle
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col justify-between"
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} strokeWidth={2.5} />
            </div>
        </div>
        {subtitle && <p className="text-sm font-medium text-slate-500 mt-4">{subtitle}</p>}
    </motion.div>
);

const KnowledgeHubReport = () => {
    const [loading, setLoading] = useState(true);
    const [hierarchy, setHierarchy] = useState({});
    const [books, setBooks] = useState([]);
    
    const [activeTab, setActiveTab] = useState('SUMMARY'); // 'SUMMARY' or 'DETAILS' or 'ACTIVE_JOBS'
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // New status filter
    const [systemStats, setSystemStats] = useState(null);

    const loadData = async () => {
        try {
            const [hierData, res, sysRes] = await Promise.all([
                academicService.getHierarchy(),
                axios.get('/v1/knowledge-hub/source-books'),
                axios.get('/v1/knowledge-hub/system-health-jobs')
            ]);
            setHierarchy(hierData);
            setBooks(res.data);
            setSystemStats(sysRes.data);
        } catch (error) {
            console.error("Failed to load report data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemStats = async () => {
        try {
            const sysRes = await axios.get('/v1/knowledge-hub/system-health-jobs');
            setSystemStats(sysRes.data);
        } catch (error) {
            console.error("Failed to load system stats", error);
        }
    };

    useEffect(() => {
        loadData();
        
        // Setup STOMP WebSockets for Real-time push updates
        const baseUrl = axios.defaults.baseURL || 'http://localhost:8080/api';
        const socketUrl = baseUrl.replace('/api', '/ws-live-updates');
        
        const stompClient = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log("Connected to Real-time Enterprise WS");
                stompClient.subscribe('/topic/system-health-jobs', (message) => {
                    if (message.body) {
                        const parsedData = JSON.parse(message.body);
                        setSystemStats(parsedData);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            }
        });
        
        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, []);

    // Derived Summary Metrics
    const metrics = useMemo(() => {
        const totalSubjects = hierarchy.classSubjects?.length || 0;
        const totalBooks = books.length;
        
        const mappedSubjectIds = new Set(books.filter(b => b.classSubjectId).map(b => b.classSubjectId));
        const subjectsWithBooks = mappedSubjectIds.size;
        const pendingSubjects = totalSubjects - subjectsWithBooks;

        const processingBooks = books.filter(b => b.isProcessing).length;
        const readyBooks = totalBooks - processingBooks;

        const totalPagesProcessed = books.reduce((sum, b) => sum + (b.extractedPages || 0), 0);

        // Calculate Type Distribution
        const typesCount = books.reduce((acc, b) => {
            acc[b.bookType] = (acc[b.bookType] || 0) + 1;
            return acc;
        }, {});
        
        const typeData = Object.entries(typesCount).map(([name, value]) => ({ name, value }));

        return {
            totalSubjects,
            subjectsWithBooks,
            pendingSubjects,
            totalBooks,
            processingBooks,
            readyBooks,
            totalPagesProcessed,
            typeData,
            coveragePct: totalSubjects ? Math.round((subjectsWithBooks / totalSubjects) * 100) : 0
        };
    }, [hierarchy, books]);

    // Detailed Report Data Generation
    const detailedData = useMemo(() => {
        if (!hierarchy.classSubjects || !hierarchy.classes) return [];
        
        return hierarchy.classSubjects.map(subject => {
            const cls = hierarchy.classes?.find(c => subject._classId === c.id);
            const stream = hierarchy.streams?.find(s => cls?._streamId === s.id);
            const level = hierarchy.levels?.find(l => stream?._levelId === l.id);
            const globalSubject = hierarchy.subjects?.find(s => subject._subjectId === s.id);
            
            const relatedBooks = books.filter(b => b.classSubjectId === subject.id);
            
            let status = 'PENDING UPLOAD';
            let statusColor = 'bg-rose-50 text-rose-600 border-rose-200';
            
            if (relatedBooks.length > 0) {
                if (relatedBooks.some(b => b.isProcessing)) {
                    status = 'PROCESSING BACKGROUND';
                    statusColor = 'bg-amber-50 text-amber-600 border-amber-200';
                } else if (relatedBooks.some(b => (b.extractedPages > 0 && b.extractedPages >= b.totalPages) || (b.processedPagesCount > 0 && b.processedPagesCount >= b.totalPagesToProcess))) {
                    status = 'EXTRACTION COMPLETED';
                    statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                } else if (relatedBooks.some(b => b.extractedPages > 0 || b.processedPagesCount > 0)) {
                    status = 'PARTIALLY EXTRACTED';
                    statusColor = 'bg-blue-50 text-blue-600 border-blue-200';
                } else {
                    status = 'UPLOADED & READY';
                    statusColor = 'bg-slate-100 text-slate-600 border-slate-300';
                }
            }

            return {
                id: subject.id,
                levelId: level?.id,
                streamId: stream?.id,
                classId: cls?.id,
                levelName: level?.name || '-',
                streamName: stream?.name || '-',
                className: cls?.name || '-',
                subjectName: globalSubject?.name || 'Unknown Subject',
                status,
                statusColor,
                books: relatedBooks
            };
        });
    }, [hierarchy, books]);

    // Apply Dropdown Filters
    const filteredDetails = useMemo(() => {
        return detailedData.filter(row => {
            if (filterLevel && row.levelId !== filterLevel) return false;
            if (filterStream && row.streamId !== filterStream) return false;
            if (filterClass && row.classId !== filterClass) return false;
            if (filterStatus) {
                if (filterStatus === 'PROCESSING BACKGROUND' && row.status !== 'PROCESSING BACKGROUND') return false;
                if (filterStatus === 'UPLOADED & READY' && row.status !== 'UPLOADED & READY') return false;
                if (filterStatus === 'EXTRACTION COMPLETED' && row.status !== 'EXTRACTION COMPLETED') return false;
                if (filterStatus === 'PARTIALLY EXTRACTED' && row.status !== 'PARTIALLY EXTRACTED') return false;
                if (filterStatus === 'PENDING UPLOAD' && row.status !== 'PENDING UPLOAD') return false;
            }
            return true;
        });
    }, [detailedData, filterLevel, filterStream, filterClass, filterStatus]);

    const filteredStreams = hierarchy.streams?.filter(s => !filterLevel || s._levelId === filterLevel) || [];
    const filteredClasses = hierarchy.classes?.filter(c => !filterStream || c._streamId === filterStream) || [];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        return `"${String(str).replace(/"/g, '""')}"`;
    };

    const handleExportExcel = () => {
        const headers = ["Level", "Stream", "Class", "Subject", "Status", "Books Attached", "Total Pages Loaded"];
        const rows = filteredDetails.map(row => {
            const booksAttached = row.books.map(b => b.title).join(" | ") || "None";
            const totalPages = row.books.reduce((acc, b) => acc + (b.processedPagesCount || 0), 0);
            return [
                escapeCsv(row.levelName),
                escapeCsv(row.streamName),
                escapeCsv(row.className),
                escapeCsv(row.subjectName),
                escapeCsv(row.status),
                escapeCsv(booksAttached),
                escapeCsv(totalPages)
            ].join(",");
        });
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Knowledge_Hub_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const tableContent = document.getElementById('report-table-container').outerHTML;
        
        let styles = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const rules = document.styleSheets[i].cssRules;
                for (let j = 0; j < rules.length; j++) {
                    styles += rules[j].cssText + ' ';
                }
            } catch (e) {
                // Ignore cross-origin stylesheet rules
            }
        }
        
        const selectedLevelName = hierarchy.levels?.find(l => l.id === filterLevel)?.name || 'All Levels';
        const selectedStreamName = hierarchy.streams?.find(s => s.id === filterStream)?.name || 'All Streams';
        const selectedClassName = hierarchy.classes?.find(c => c.id === filterClass)?.name || 'All Classes';
        
        const totalItems = filteredDetails.length;
        const totalReady = filteredDetails.filter(r => r.status === 'UPLOADED & READY').length;
        const totalPending = filteredDetails.filter(r => r.status === 'PENDING UPLOAD').length;
        const totalPages = filteredDetails.reduce((acc, r) => acc + r.books.reduce((a,b)=>a+(b.processedPagesCount||0),0), 0);

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Knowledge Hub Analytics</title>
                    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        ${styles}
                        @page { size: A4 landscape; margin: 12mm; }
                        body, html { height: auto !important; overflow: visible !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Hind Siliguri', sans-serif !important; color: #1e293b; margin: 0; padding: 0; }
                        .print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                        .print-title { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 5px 0; }
                        .print-date { font-size: 13px; color: #64748b; margin: 0; }
                        
                        /* Parameter Box */
                        .print-params { text-align: right; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 8px; }
                        .print-params-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 5px; }
                        .print-params-text { font-size: 13px; font-weight: 600; color: #334155; }
                        .print-params-text span { color: #2563eb; font-weight: 700; margin-left: 4px; margin-right: 12px; }
                        
                        /* Summary Stats Row */
                        .print-stats { display: flex; gap: 15px; margin-bottom: 25px; }
                        .p-stat { flex: 1; text-align: center; background: #fff; border: 2px solid #f1f5f9; padding: 15px; border-radius: 12px; }
                        .p-stat-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
                        .p-stat-lbl { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; }
                        
                        /* Table Overrides */
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f8fafc !important; color: #475569 !important; font-size: 12px !important; padding: 12px !important; text-align: left; border-bottom: 2px solid #cbd5e1; }
                        td { border-bottom: 1px solid #e2e8f0; padding: 15px 12px !important; vertical-align: top; }
                        tr { page-break-inside: avoid; }
                        td .bg-slate-100 { background-color: #f1f5f9 !important; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 4px; }
                        td .bg-indigo-50 { background-color: #eef2ff !important; border: 1px solid #c7d2fe; color: #4f46e5 !important; padding: 3px 6px; border-radius: 4px; }
                        
                        /* Hide Interactive Elements */
                        .print\\:hidden, svg { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <div>
                            <h1 class="print-title">Knowledge Hub - Book Digitization Report</h1>
                            <p class="print-date">Generated on: ${new Date().toLocaleString()}</p>
                        </div>
                        <div class="print-params">
                            <div class="print-params-title">Filtering Parameters Applied</div>
                            <div class="print-params-text">
                                Lvl: <span>${selectedLevelName}</span> |
                                Str: <span>${selectedStreamName}</span> |
                                Cls: <span>${selectedClassName}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-stats">
                        <div class="p-stat"><div class="p-stat-val" style="color: #475569;">${totalItems}</div><div class="p-stat-lbl">Total Subjects</div></div>
                        <div class="p-stat"><div class="p-stat-val" style="color: #10b981;">${totalReady}</div><div class="p-stat-lbl">Uploaded & Ready</div></div>
                        <div class="p-stat"><div class="p-stat-val" style="color: #f43f5e;">${totalPending}</div><div class="p-stat-lbl">Pending Uploads</div></div>
                        <div class="p-stat"><div class="p-stat-val" style="color: #8b5cf6;">${totalPages.toLocaleString()}</div><div class="p-stat-lbl">Total Valid Vectors</div></div>
                    </div>
                    
                    ${tableContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            // Automatically close window after print dialog is closed/canceled
            // Note: browser behavior varies, but this is best effort
            if (window.navigator.userAgent.indexOf('Chrome') > -1) {
               printWindow.close();
            }
        }, 1500);
    };

    const handleJobAction = async (jobId, jobType, action) => {
        try {
            const endpointType = jobType === "AI_VISION_EXTRACTION" ? "bulk-extract" : "generate-questions";
            await axios.post(`/v1/knowledge-hub/jobs/${endpointType}/${jobId}/${action}`);
            fetchSystemStats(); // Refresh stats immediately
        } catch (error) {
            console.error(`Failed to ${action} job`, error);
        }
    };

    const handleWorkerSizeChange = async () => {
        const current = systemStats?.activeWorkerNodes || 6;
        const inputSize = prompt("ENTER DYNAMIC WORKER POOL SIZE (Max 200 Threads):", current);
        if (inputSize && !isNaN(inputSize)) {
            const size = parseInt(inputSize);
            try {
                await axios.post(`/v1/knowledge-hub/system-health-jobs/workers?size=${size}`);
                alert(`Successfully allocated ${size} CPU worker threads to AI Jobs!`);
                fetchSystemStats();
            } catch (err) {
                alert("Failed to update AI worker pool scale");
            }
        }
    };

    const handleStartExtraction = async (bookId) => {
        try {
            await axios.post(`/v1/knowledge-hub/jobs/bulk-extract/source-books/${bookId}`);
            // Show alert or let the user know, then fetch updated books to sync status
            alert("Book sent to background vector extraction queue successfully.");
            
            const [res, sysRes] = await Promise.all([
                axios.get('/v1/knowledge-hub/source-books'),
                axios.get('/v1/knowledge-hub/system-health-jobs')
            ]);
            setBooks(res.data);
            setSystemStats(sysRes.data);
            
            // Switch tab to show it running
            setActiveTab('ACTIVE_JOBS');
        } catch (error) {
            console.error("Failed to start vector extraction", error);
            alert("Failed to start vector extraction: " + (error.response?.data || error.message));
        }
    };

    if (loading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div id="printable-report" className="p-4 md:p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-8 font-satoshi print:p-0 print:m-0 print:bg-white print:text-black">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-2 print:text-2xl">
                        <Database className="text-primary print:text-slate-800" size={32} />
                        Knowledge Hub Report
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium print:text-slate-600">
                        Comprehensive tracking of digitized books mapped to curriculum structure 
                    </p>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit print:hidden">
                    <button 
                        onClick={() => setActiveTab('SUMMARY')}
                        className={`px-6 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all ${activeTab === 'SUMMARY' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <BarChart size={16}/> Summary View
                    </button>
                    <button 
                        onClick={() => setActiveTab('DETAILS')}
                        className={`px-6 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all ${activeTab === 'DETAILS' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <LayoutList size={16}/> Detailed Mapping
                    </button>
                    <button 
                        onClick={() => setActiveTab('ACTIVE_JOBS')}
                        className={`px-6 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all ${activeTab === 'ACTIVE_JOBS' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <TrendingUp size={16}/> Server & Jobs
                    </button>
                </div>
            </div>

            {activeTab === 'SUMMARY' && (
                <div className="space-y-8">
                    {/* Top Level KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Total Book Uploads"
                            value={metrics.totalBooks}
                            subtitle={`${metrics.processingBooks} currently processing`}
                            icon={BookOpen}
                            color="bg-indigo-500"
                        />
                        <MetricCard
                            title="Curriculum Coverage"
                            value={`${metrics.coveragePct}%`}
                            subtitle={`${metrics.subjectsWithBooks} out of ${metrics.totalSubjects} subjects loaded`}
                            icon={CheckCircle}
                            color="bg-emerald-500"
                        />
                        <MetricCard
                            title="Missing / Pending Subjects"
                            value={metrics.pendingSubjects}
                            subtitle="Syllabus items needing content digitization"
                            icon={AlertCircle}
                            color="bg-rose-500"
                        />
                        <MetricCard
                            title="Total Pages Extracted"
                            value={metrics.totalPagesProcessed.toLocaleString()}
                            subtitle="Total physical pages digitized to Markdown"
                            icon={Layers}
                            color="bg-amber-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Coverage Chart */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Boxes className="text-emerald-500"/> Syllabus Mapping Status
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Mapped to Curriculum', value: metrics.subjectsWithBooks },
                                                { name: 'Missing Content', value: metrics.pendingSubjects }
                                            ]}
                                            cx="50%" cy="50%"
                                            innerRadius={80} outerRadius={110}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#cbd5e1" />
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Document Type Distribution */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <FileText className="text-indigo-500"/> Document Type Distribution
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                                    <ReBarChart data={metrics.typeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} width={120} />
                                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} maxBarSize={40}>
                                            {metrics.typeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'DETAILS' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none">
                    
                    {/* Filters */}
                    <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-wrap items-center gap-4 print:hidden">
                        <div className="flex items-center gap-2 text-slate-700 font-bold mr-2"><Filter size={18}/> Filters:</div>
                        
                        <select 
                            className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
                            value={filterLevel} 
                            onChange={(e) => { setFilterLevel(e.target.value); setFilterStream(''); setFilterClass(''); }}
                        >
                            <option value="">All Levels</option>
                            {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select 
                            className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
                            value={filterStream} 
                            onChange={(e) => { setFilterStream(e.target.value); setFilterClass(''); }}
                            disabled={!filterLevel}
                        >
                            <option value="">All Streams</option>
                            {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select 
                            className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
                            value={filterClass} 
                            onChange={(e) => setFilterClass(e.target.value)}
                            disabled={!filterStream}
                        >
                            <option value="">All Classes</option>
                            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select 
                            className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="UPLOADED & READY">Uploaded & Ready</option>
                            <option value="PARTIALLY EXTRACTED">Partially Extracted</option>
                            <option value="EXTRACTION COMPLETED">Extraction Completed</option>
                            <option value="PROCESSING BACKGROUND">Processing Background</option>
                            <option value="PENDING UPLOAD">Pending Upload</option>
                        </select>
                        
                        <div className="ml-auto flex items-center gap-2 print:hidden">
                            <button 
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl outline-none hover:bg-indigo-100 transition-all border border-indigo-200"
                                onClick={handleExportPDF}
                            >
                                <Printer size={16}/> Print / PDF
                            </button>
                            <button 
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all hover:bg-slate-700"
                                onClick={handleExportExcel}
                            >
                                <Download size={16}/> Excel / CSV
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div id="report-table-container" className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Hierarchy Pathway</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Subject</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Current Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 w-1/3">Attached Documents / Actions Required</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDetails.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-center text-xs font-semibold text-slate-600 gap-1.5 flex-wrap">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{row.levelName}</span>
                                                <ChevronRight size={12} className="text-slate-300"/>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{row.streamName}</span>
                                                <ChevronRight size={12} className="text-slate-300"/>
                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{row.className}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="font-bold text-slate-800">{row.subjectName}</div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className={`inline-flex px-3 py-1.5 rounded-lg border text-xs font-bold leading-none ${row.statusColor}`}>
                                                {row.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            {row.books.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {row.books.map(b => (
                                                        <div key={b.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col gap-1">
                                                            <div className="font-bold text-sm text-slate-800 flex items-center justify-between">
                                                                <span>{b.title}</span>
                                                                {!b.isProcessing && b.extractedPages < b.totalPages && (
                                                                    <button 
                                                                        onClick={() => handleStartExtraction(b.id)}
                                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors rounded-lg text-xs font-bold shadow-sm"
                                                                    >
                                                                        <PlayCircle size={14}/> Auto-Extract
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                                                                <span className="bg-slate-200 px-2 py-0.5 rounded">{b.bookType}</span>
                                                                {b.isProcessing ? (
                                                                    <>
                                                                        <span>{b.processedPagesCount} of {b.totalPagesToProcess} pages tracking</span>
                                                                        <span className="text-amber-500 flex items-center gap-1"><Clock size={12}/> Processing via Background Queue...</span>
                                                                    </>
                                                                ) : (b.extractedPages > 0 && b.extractedPages >= b.totalPages) ? (
                                                                     <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Extraction Completed ({b.extractedPages} pages)</span>
                                                                ) : (b.processedPagesCount > 0 && b.processedPagesCount >= b.totalPagesToProcess) ? (
                                                                     <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Extraction Completed ({b.processedPagesCount} pages)</span>
                                                                ) : (
                                                                    <span>{b.extractedPages} of {b.totalPages} indexed pages</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                    <AlertCircle size={16} className="text-rose-400"/>
                                                    Requires source book upload via Knowledge Hub Library.
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredDetails.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-slate-500 font-medium">
                                            No curriculum pathways matched the applied filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ACTIVE_JOBS' && systemStats && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Server Health Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-6 -bottom-6 text-slate-800/50">
                                <Server size={120} strokeWidth={1} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2"><HardDrive size={14}/> System Memory Usage</h3>
                                <div className="text-4xl text-white font-black tracking-tight">{systemStats.memory?.usagePct || 0} <span className="text-xl text-slate-500 font-bold">%</span></div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${systemStats.memory?.usagePct || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-between text-xs font-semibold text-slate-400">
                                    <span>{systemStats.memory?.allocated} MB Allocated</span>
                                    <span>{systemStats.memory?.max} MB Max</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2"><Boxes size={14}/> Background Queues</h3>
                            <div className="text-4xl text-slate-900 font-black tracking-tight">{(systemStats?.extractionJobs?.length || 0) + (systemStats?.questionJobs?.length || 0)} <span className="text-xl text-slate-400 font-bold">Active</span></div>
                            <p className="text-sm font-medium text-slate-500 mt-2">Combined vector extraction and question generation tasks currently in the worker queue.</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2"><CheckCircle size={14}/> Server AI Threads</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                <div className="text-3xl text-slate-900 font-black tracking-tight">{systemStats?.activeWorkerNodes || 6} <span className="text-base font-bold text-slate-400">Workers</span></div>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-2 mb-3">Dynamically adjust the API dispatcher capacity.</p>
                            <button onClick={handleWorkerSizeChange} className="w-full py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-sm">
                                Reallocate Worker Nodes
                            </button>
                        </div>
                    </div>

                    {/* Active Jobs List */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Activity size={20} className="text-indigo-600"/> Background Processing Jobs
                            </h3>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <span className="relative flex h-2.5 w-2.5 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                Auto-Refreshing
                            </div>
                        </div>
                        <div className="p-0">
                            {(!systemStats.extractionJobs?.length && !systemStats.questionJobs?.length) ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <CheckCircle size={48} className="text-slate-300 mb-4"/>
                                    <h4 className="text-xl font-bold text-slate-800 mb-2">No Active Jobs</h4>
                                    <p className="text-slate-500 font-medium">The Knowledge Hub queue is empty. System is fully synced.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {[...(systemStats.extractionJobs || []), ...(systemStats.questionJobs || [])].map((job) => (
                                        <div key={job.id} className="p-6 hover:bg-slate-50 flex items-center justify-between gap-6 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${
                                                        job.type === 'AI_VISION_EXTRACTION' ? 'bg-indigo-100 text-indigo-700' : 'bg-fuchsia-100 text-fuchsia-700'
                                                    }`}>
                                                        {job.type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${
                                                        job.status === 'IN_PROGRESS' || job.status === 'QUEUED' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {job.status}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-900 leading-tight">
                                                    {job.bookTitle || 'Unknown Book Document'}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex-1 h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden max-w-md">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${job.status === 'PAUSED' ? 'bg-slate-400' : 'bg-emerald-500'}`} style={{ width: `${job.progress}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">{job.progress}% ({job.processedPages} / {job.totalPages})</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {job.status === 'PAUSED' ? (
                                                    <button 
                                                        onClick={() => handleJobAction(job.id, job.type, 'resume')}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                        title="Resume Job"
                                                    >
                                                        <PlayCircle size={20} className={job.status !== 'PAUSED' ? 'fill-current' : ''} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleJobAction(job.id, job.type, 'pause')}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                                        title="Pause Job"
                                                    >
                                                        <PauseCircle size={20} className={job.status === 'IN_PROGRESS' ? 'fill-current' : ''} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to cancel this job? It cannot be resumed later.')) {
                                                            handleJobAction(job.id, job.type, 'cancel');
                                                        }
                                                    }}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Cancel Job"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeHubReport;
