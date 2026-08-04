import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Code, Search, RefreshCw, Copy, Check, Play, Share2, Terminal, 
    Layers, Shield, Server, ArrowRight, ExternalLink, CheckCircle2, 
    AlertCircle, Sparkles, Filter, ChevronRight, FileText, Database, Info, Sliders
} from 'lucide-react';
import axios from '../../../utils/axios';

const METHOD_COLORS = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    POST: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    DELETE: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200'
};

const extractPathParams = (path) => {
    if (!path) return [];
    const matches = path.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[\{\}]/g, ''));
};

const ApiManager = () => {
    const [endpoints, setEndpoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedMethod, setSelectedMethod] = useState('ALL');
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);

    // Path Parameters & Payload State
    const [pathParamValues, setPathParamValues] = useState({});
    const [requestBody, setRequestBody] = useState('');
    
    // Testing & Execution State
    const [testResponse, setTestResponse] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [copiedField, setCopiedField] = useState('');

    useEffect(() => {
        fetchEndpoints();
    }, []);

    // Reset parameters when selected endpoint changes
    useEffect(() => {
        if (selectedEndpoint) {
            const params = extractPathParams(selectedEndpoint.path);
            const initialValues = {};
            params.forEach(p => {
                // If parameter looks like an ID, default to sample UUID
                if (p.toLowerCase().includes('id') || p.toLowerCase().includes('uuid')) {
                    initialValues[p] = '123e4567-e89b-12d3-a456-426614174000';
                } else if (p.toLowerCase().includes('code')) {
                    initialValues[p] = 'EX-849201';
                } else {
                    initialValues[p] = 'sample';
                }
            });
            setPathParamValues(initialValues);
            
            const method = selectedEndpoint.method.split(',')[0].trim().toUpperCase();
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                setRequestBody(JSON.stringify({ name: "Sample Data", active: true }, null, 2));
            } else {
                setRequestBody('');
            }
            setTestResponse(null);
        }
    }, [selectedEndpoint]);

    const fetchEndpoints = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/v1/ai/tools/endpoints');
            if (data.success && Array.isArray(data.data)) {
                setEndpoints(data.data);
                if (data.data.length > 0) {
                    setSelectedEndpoint(data.data[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load API endpoints", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter categories dynamically
    const categories = useMemo(() => {
        const set = new Set(endpoints.map(e => e.category || 'Core Operations'));
        const list = Array.from(set);
        list.sort((a, b) => {
            if (a.includes('⭐') || a.includes('কাস্টম')) return -1;
            if (b.includes('⭐') || b.includes('কাস্টম')) return 1;
            return a.localeCompare(b);
        });
        return ['ALL', ...list];
    }, [endpoints]);

    // Filter endpoints
    const filteredEndpoints = useMemo(() => {
        return endpoints.filter(ep => {
            const matchesSearch = ep.path.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  ep.controller.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'ALL' || (ep.category || 'Core Operations') === selectedCategory;
            const matchesMethod = selectedMethod === 'ALL' || ep.method.toUpperCase().includes(selectedMethod);
            return matchesSearch && matchesCategory && matchesMethod;
        });
    }, [endpoints, searchQuery, selectedCategory, selectedMethod]);

    const pathParamsList = useMemo(() => {
        return extractPathParams(selectedEndpoint?.path || '');
    }, [selectedEndpoint]);

    // Resolve URL with path parameters filled
    const resolvedPath = useMemo(() => {
        if (!selectedEndpoint) return '';
        let path = selectedEndpoint.path;
        pathParamsList.forEach(param => {
            const val = pathParamValues[param] !== undefined ? pathParamValues[param] : `{${param}}`;
            path = path.replace(`{${param}}`, val);
        });
        return path.startsWith('/') ? path : `/${path}`;
    }, [selectedEndpoint, pathParamValues, pathParamsList]);

    const fullApiUrl = useMemo(() => {
        if (!resolvedPath) return '';
        const origin = window.location.origin.replace(':5173', ':8080');
        return `${origin}/api${resolvedPath}`;
    }, [resolvedPath]);

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const generateCurl = (ep) => {
        if (!ep) return '';
        const token = localStorage.getItem('token') || '<YOUR_JWT_TOKEN>';
        const method = ep.method.includes(',') ? ep.method.split(',')[0].trim().toUpperCase() : ep.method.toUpperCase();
        const baseUrl = window.location.origin.replace(':5173', ':8080');
        const fullUrl = `${baseUrl}/api${resolvedPath}`;
        
        const isPublicShare = ep.controller === 'PublicExamShareController' || ep.path.includes('/public/exams/share');

        let curl = `curl -X ${method} "${fullUrl}" \\\n`;
        if (isPublicShare) {
            curl += `  -H "X-APP-SECRET-KEY: QS-MOBILE-SEC-849201" \\\n`;
        } else {
            curl += `  -H "Authorization: Bearer ${token}" \\\n`;
        }
        curl += `  -H "Content-Type: application/json"`;

        if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
            curl += ` \\\n  -d '${requestBody.replace(/'/g, "'\\''")}'`;
        }
        return curl;
    };

    const handleTestEndpoint = async () => {
        if (!selectedEndpoint) return;
        setIsTesting(true);
        setTestResponse(null);
        const startTime = performance.now();
        const method = (selectedEndpoint.method.split(',')[0] || 'GET').trim().toLowerCase();

        let payload = null;
        if (['post', 'put', 'patch'].includes(method) && requestBody) {
            try {
                payload = JSON.parse(requestBody);
            } catch (e) {
                payload = requestBody;
            }
        }
        
        try {
            const isPublicShare = selectedEndpoint.controller === 'PublicExamShareController' || selectedEndpoint.path.includes('/public/exams/share');
            const customHeaders = {};
            if (isPublicShare) {
                customHeaders['X-APP-SECRET-KEY'] = 'QS-MOBILE-SEC-849201';
            }

            const res = await axios({
                method: method,
                url: resolvedPath,
                headers: customHeaders,
                data: payload
            });
            const duration = Math.round(performance.now() - startTime);
            setTestResponse({
                status: res.status,
                statusText: res.statusText || 'OK',
                duration: `${duration}ms`,
                headers: res.headers,
                data: res.data
            });
        } catch (err) {
            const duration = Math.round(performance.now() - startTime);
            setTestResponse({
                status: err.response?.status || 500,
                statusText: err.response?.statusText || 'Error',
                duration: `${duration}ms`,
                headers: err.response?.headers || {},
                data: err.response?.data || { error: err.message }
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                            <Code size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                System API Manager
                                <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-full">
                                    {endpoints.length} Active APIs
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                প্রজেক্টের ব্যাকএন্ড এপিআই ক্যাটালগ, ডায়নামিক রিকোয়েস্ট ফিল্ডস, শেয়ারিং ও রিয়েল-টাইম টেস্ট প্লেগ্রাউন্ড
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchEndpoints}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Catalog
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 relative">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search endpoint path or controller (e.g. /v1/questions, AcademicController)..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                <div className="md:col-span-3">
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                        {categories.map((cat, i) => (
                            <option key={i} value={cat}>
                                {cat === 'ALL' ? '📁 All Categories' : cat.includes('⭐') ? `${cat}` : `📂 ${cat}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-3">
                    <select
                        value={selectedMethod}
                        onChange={e => setSelectedMethod(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                        <option value="ALL">⚡ All HTTP Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </div>
            </div>

            {/* Main Content Layout: Sidebar List + Endpoint Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                
                {/* Left Side: Endpoints List */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            API Endpoints ({filteredEndpoints.length})
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[680px]">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                                <RefreshCw size={20} className="animate-spin text-indigo-600" />
                                Loading endpoints catalog...
                            </div>
                        ) : filteredEndpoints.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                No APIs match your search criteria.
                            </div>
                        ) : (
                            filteredEndpoints.map((ep, idx) => {
                                const method = ep.method.split(',')[0].trim().toUpperCase();
                                const isSelected = selectedEndpoint && selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedEndpoint(ep)}
                                        className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                            isSelected 
                                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${METHOD_COLORS[method] || METHOD_COLORS.DEFAULT}`}>
                                                {method}
                                            </span>
                                            <div className="truncate">
                                                <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {ep.path}
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                                    <span>{ep.controller}</span>
                                                    <span>•</span>
                                                    <span className="text-indigo-500">{ep.category || 'Core'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Selected Endpoint Inspector */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    {selectedEndpoint ? (
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[750px]">
                            {/* Top Badge & Actions */}
                            <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${METHOD_COLORS[selectedEndpoint.method.split(',')[0].trim().toUpperCase()] || METHOD_COLORS.DEFAULT}`}>
                                                {selectedEndpoint.method}
                                            </span>
                                            <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full flex items-center gap-1">
                                                {selectedEndpoint.category || 'Core Operations'}
                                            </span>
                                        </div>
                                        <h2 className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 break-all">
                                            Controller: {selectedEndpoint.controller}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        <button 
                                            onClick={() => handleCopy(fullApiUrl, 'fullUrl')}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                                            title="লাইভ ডোমেইন সহ সম্পূর্ণ এপিআই ইউআরএল কপি করুন"
                                        >
                                            {copiedField === 'fullUrl' ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedField === 'fullUrl' ? 'কপি হয়েছে (Full URL)' : '📋 Copy Full API URL'}
                                        </button>

                                        <button 
                                            onClick={() => handleCopy(generateCurl(selectedEndpoint), 'curl')}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            {copiedField === 'curl' ? <Check size={14} className="text-emerald-500" /> : <Terminal size={14} />}
                                            {copiedField === 'curl' ? 'Copied cURL' : 'Copy cURL'}
                                        </button>

                                        <button 
                                            onClick={() => handleCopy(JSON.stringify(selectedEndpoint, null, 2), 'spec')}
                                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            {copiedField === 'spec' ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                                            {copiedField === 'spec' ? 'Copied JSON' : 'Share Spec'}
                                        </button>
                                    </div>
                                </div>

                                {/* Full Live Absolute API URL Display Box */}
                                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 uppercase tracking-wider shrink-0">
                                            Live Full URL
                                        </span>
                                        <span className="truncate selection:bg-emerald-500 selection:text-slate-900 font-bold text-white">
                                            {fullApiUrl}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(fullApiUrl, 'fullUrl')}
                                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 border border-emerald-500/30"
                                    >
                                        {copiedField === 'fullUrl' ? <Check size={13} /> : <Copy size={13} />}
                                        {copiedField === 'fullUrl' ? 'কপি হয়েছে!' : 'কপি করুন'}
                                    </button>
                                </div>

                                {/* Global Mobile App Secret Key Display Box */}
                                {(selectedEndpoint.controller === 'PublicExamShareController' || selectedEndpoint.path.includes('/public/exams/share')) && (
                                    <div className="p-3 bg-indigo-950/80 text-amber-300 font-mono text-xs rounded-xl border border-indigo-800/80 flex items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                                <Shield size={11} /> Required App Header Key
                                            </span>
                                            <span className="truncate font-bold text-white">
                                                X-APP-SECRET-KEY: <span className="text-amber-400 font-extrabold">QS-MOBILE-SEC-849201</span>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy('X-APP-SECRET-KEY: QS-MOBILE-SEC-849201', 'secKey')}
                                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 border border-amber-500/30"
                                        >
                                            {copiedField === 'secKey' ? <Check size={13} /> : <Copy size={13} />}
                                            {copiedField === 'secKey' ? 'কপি হয়েছে!' : 'সিকিউরিটি কোড কপি'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Controller</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedEndpoint.controller}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Authentication Header</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                        {selectedEndpoint.controller === 'PublicExamShareController' || selectedEndpoint.path.includes('/public/exams/share') ? (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                <Shield size={12} /> X-APP-SECRET-KEY
                                            </span>
                                        ) : (
                                            <><Shield size={12} className="text-indigo-500" /> Bearer JWT</>
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Content-Type</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">application/json</span>
                                </div>
                            </div>

                            {/* Dynamic Path Parameters Configurator */}
                            {pathParamsList.length > 0 && (
                                <div className="space-y-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                                    <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sliders size={14} /> Dynamic Path Parameters ({pathParamsList.length})
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {pathParamsList.map((param, i) => (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                                        {`{${param}}`}
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPathParamValues({ ...pathParamValues, [param]: '123e4567-e89b-12d3-a456-426614174000' })}
                                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-mono font-semibold"
                                                    >
                                                        + Sample UUID
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={pathParamValues[param] || ''}
                                                    onChange={e => setPathParamValues({ ...pathParamValues, [param]: e.target.value })}
                                                    placeholder={`Enter UUID for ${param}`}
                                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Request Body Payload Editor (For POST, PUT, PATCH) */}
                            {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method.split(',')[0].trim().toUpperCase()) && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText size={14} /> Request Body (JSON Payload)
                                    </h3>
                                    <textarea
                                        value={requestBody}
                                        onChange={e => setRequestBody(e.target.value)}
                                        placeholder="Enter JSON payload..."
                                        className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 h-28 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                                    />
                                </div>
                            )}

                            {/* Expected Data Properties Summary */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Database size={14} /> Endpoint Metadata
                                </h3>
                                <div className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                                    <div><span className="text-slate-500">// Resolved Path Spec</span></div>
                                    <div><span className="text-indigo-400">"resolvedUrl"</span>: <span className="text-emerald-400">"/api{resolvedPath}"</span>,</div>
                                    <div><span className="text-indigo-400">"method"</span>: <span className="text-amber-400">"{selectedEndpoint.method}"</span>,</div>
                                    <div><span className="text-indigo-400">"controllerClass"</span>: <span className="text-cyan-400">"com.testshaper.controller.{selectedEndpoint.controller}"</span>,</div>
                                    <div><span className="text-indigo-400">"category"</span>: <span className="text-purple-400">"{selectedEndpoint.category || 'Core'}"</span></div>
                                </div>
                            </div>

                            {/* Live Test Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Play size={14} className="text-indigo-600" /> Live Endpoint Tester
                                    </h3>
                                    <button
                                        onClick={handleTestEndpoint}
                                        disabled={isTesting}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                        {isTesting ? 'Executing Request...' : 'Fetch Response Data'}
                                    </button>
                                </div>

                                {testResponse && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 text-xs font-mono space-y-3"
                                    >
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                                    testResponse.status < 300 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                                                }`}>
                                                    HTTP {testResponse.status} {testResponse.statusText}
                                                </span>
                                                <span className="text-slate-400 text-[11px]">{testResponse.duration}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleCopy(JSON.stringify(testResponse.data, null, 2), 'response')}
                                                className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                                            >
                                                {copiedField === 'response' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                {copiedField === 'response' ? 'Copied' : 'Copy Data'}
                                            </button>
                                        </div>

                                        <pre className="max-h-64 overflow-y-auto text-slate-300 text-[11px] whitespace-pre-wrap">
                                            {JSON.stringify(testResponse.data, null, 2)}
                                        </pre>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center flex-1">
                            <Info size={32} className="mb-2 text-slate-300" />
                            Select an endpoint from the left menu to view specification, schema, and live test options.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiManager;
