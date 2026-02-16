import React, { useState } from 'react';
import { Download, Database, Server, Settings, CheckCircle, AlertCircle, Play } from 'lucide-react';

const ImportApi = () => {
    const [config, setConfig] = useState({
        apiUrl: '',
        apiKey: '',
        provider: 'Custom',
        importType: 'MCQ'
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, connecting, importing, completed, error
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const handleImport = () => {
        if (!config.apiUrl) return;

        setLoading(true);
        setStatus('connecting');
        setLogs([]);
        addLog('Initiating connection to external API...');

        // Simulation
        setTimeout(() => {
            addLog('Connection established.');
            setStatus('importing');
            addLog('Fetching question metadata...');

            setTimeout(() => {
                addLog('Found 150 questions available for import.');
                addLog('Starting batch download...');

                setTimeout(() => {
                    addLog('Batch 1/3 downloaded (50 items).');
                    addLog('Batch 2/3 downloaded (50 items).');
                    addLog('Batch 3/3 downloaded (50 items).');
                    setStatus('completed');
                    setLoading(false);
                    addLog('Import process completed successfully. 150 questions added to Pending queue.');
                }, 2000);
            }, 1500);
        }, 1500);
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Import via API</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Settings size={18} className="text-slate-500" /> Configuration
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.provider}
                                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                                >
                                    <option value="Custom">Custom REST API</option>
                                    <option value="Moodle">Moodle XML</option>
                                    <option value="Canvas">Canvas LMS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint URL</label>
                                <input
                                    type="url"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="https://api.example.com/v1/questions"
                                    value={config.apiUrl}
                                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Token</label>
                                <input
                                    type="password"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="sk_..."
                                    value={config.apiKey}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Import Type</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.importType}
                                    onChange={(e) => setConfig({ ...config, importType: e.target.value })}
                                >
                                    <option value="MCQ">MCQ Only</option>
                                    <option value="ALL">All Supported Types</option>
                                </select>
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={loading || !config.apiUrl}
                                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? 'Processing...' : <><Play size={18} /> Run Import</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Console / Status Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden h-full min-h-[500px] flex flex-col">
                        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <span className="text-slate-400 font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                <Server size={14} /> Import Console
                            </span>
                            {status === 'completed' && <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Finished</span>}
                            {status === 'importing' && <span className="text-blue-400 text-xs font-bold flex items-center gap-1 animate-pulse"><Download size={12} /> Importing...</span>}
                        </div>

                        <div className="flex-1 p-4 font-mono text-sm overflow-y-auto">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                    <Database size={48} className="mb-4 opacity-50" />
                                    <p>Ready to connect...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log, i) => (
                                        <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-3">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportApi;
