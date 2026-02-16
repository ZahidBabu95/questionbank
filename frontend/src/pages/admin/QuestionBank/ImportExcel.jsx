import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';

const ImportExcel = () => {
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (file) => {
        if (file) {
            const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
            if (validTypes.includes(file.type)) {
                setFile(file);
                setMessage(null);
            } else {
                setMessage({ type: 'error', text: 'Please upload a valid Excel file (.xlsx or .xls)' });
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        // Simulate upload delay for now as backend endpoint might not be ready
        setTimeout(() => {
            setUploading(false);
            setMessage({ type: 'success', text: 'File uploaded successfully! Processing started...' });
            setFile(null);
        }, 2000);

        // TODO: Implement actual API call
        // const formData = new FormData();
        // formData.append('file', file);
        // await axios.post('/api/v1/questions/import/excel', formData);
    };

    const handleDownloadTemplate = () => {
        // Create a multi-sheet Excel template (simulated with CSV for now, ideally use a library like xlsx)
        // For simplicity, we will download a CSV template for MCQ as the primary format.

        const headers = [
            'Question Text', 'Type (MCQ/CQ/SHORT)', 'Class', 'Subject', 'Chapter', 'Topic',
            'Difficulty (EASY/MEDIUM/HARD)', 'Marks', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option (A/B/C/D)', 'Answer/Explanation'
        ];

        const sampleRowMCQ = [
            'What is the capital of Bangladesh?', 'MCQ', 'Class 10', 'General Knowledge', 'Geography', 'Capitals',
            'EASY', '1', 'Dhaka', 'Chittagong', 'Khulna', 'Sylhet', 'A', 'Dhaka is the capital.'
        ];

        const sampleRowShort = [
            'Define Photosynthesis.', 'SHORT', 'Class 9', 'Biology', 'Botany', 'Photosynthesis',
            'MEDIUM', '2', '', '', '', '', '', 'Process by which plants make food.'
        ];

        const csvContent = [
            headers.join(','),
            sampleRowMCQ.join(','),
            sampleRowShort.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'question_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Bulk Import Questions (Excel/CSV)</h1>

            {/* Instructions & Template */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={20} /> Instructions
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>Download the sample template before uploading.</li>
                        <li>Do not change the header columns.</li>
                        <li>Supported types: <strong>MCQ, SHORT, CQ</strong>.</li>
                        <li>For CQ, put the Stem in 'Question Text' and sub-questions in 'Answer/Explanation' separated by pipes (|) or newlines.</li>
                    </ul>
                </div>
                <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                >
                    <Download size={18} /> Download Template
                </button>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${dragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet size={32} />
                </div>

                {file ? (
                    <div className="mb-6">
                        <p className="text-lg font-medium text-slate-800">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                        <button
                            onClick={() => setFile(null)}
                            className="text-sm text-red-500 hover:text-red-700 mt-2 font-medium"
                        >
                            Remove File
                        </button>
                    </div>
                ) : (
                    <div className="mb-6">
                        <p className="text-lg font-medium text-slate-800 mb-2">Drag & Drop your Excel file here</p>
                        <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                        <input
                            type="file"
                            id="fileInput"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleFileSelect}
                        />
                        <label
                            htmlFor="fileInput"
                            className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-md shadow-blue-500/20"
                        >
                            Browse Files
                        </label>
                    </div>
                )}
            </div>

            {/* Status Message */}
            {message && (
                <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Upload Action */}
            {file && !message?.type === 'success' && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>Uploading...</>
                        ) : (
                            <><Upload size={20} /> Start Import</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImportExcel;
