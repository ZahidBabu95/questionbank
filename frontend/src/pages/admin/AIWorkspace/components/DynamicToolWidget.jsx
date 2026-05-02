import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export default function DynamicToolWidget({ toolConfig, isDark, onComplete, isPreview }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [stepData, setStepData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // toolConfig should be the parsed JSON schema
    const config = toolConfig || {};
    const steps = config.steps || [];
    const step = steps[currentStep];

    useEffect(() => {
        if (!step) return;

        // Automatically fetch data if step is api_select
        if (step.type === 'api_select' || step.type === 'api_multiselect') {
            fetchStepData(step);
        }
    }, [currentStep, step]);

    const fetchStepData = async (currentStepConfig) => {
        setIsLoading(true);
        setError(null);
        try {
            if (isPreview) {
                // Mock API call for preview mode
                setTimeout(() => {
                    setStepData([
                        { id: 'mock-1', name: 'Mock Option 1 (Preview)' },
                        { id: 'mock-2', name: 'Mock Option 2 (Preview)' },
                        { id: 'mock-3', name: 'Mock Option 3 (Preview)' }
                    ]);
                    setIsLoading(false);
                }, 800);
                return;
            }

            let url = currentStepConfig.apiEndpoint;
            // Replace variables like {{subjectId}}
            Object.keys(formData).forEach(key => {
                url = url.replace(`{{${key}}}`, formData[key]);
            });

            const { data } = await axios.get(url);
            // Assuming ApiResponse format: { success: true, data: [...] }
            if (data?.success) {
                setStepData(Array.isArray(data.data) ? data.data : [data.data]);
            } else {
                setStepData(data || []);
            }
        } catch (err) {
            console.error("Failed to fetch step data", err);
            setError("Failed to load options.");
        } finally {
            if (!isPreview) setIsLoading(false);
        }
    };

    const handleNext = async (value, key) => {
        const newFormData = { ...formData, [key]: value };
        setFormData(newFormData);

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await submitFinalData(newFormData);
        }
    };

    const submitFinalData = async (finalData) => {
        setIsLoading(true);
        setError(null);
        try {
            const submitAction = config.submitAction;
            if (!submitAction) {
                if (onComplete) onComplete("Process finished successfully.", finalData);
                return;
            }

            // Construct payload by replacing variables
            let payload = { ...submitAction.payloadTemplate };
            if (payload) {
                // simple deep replace for string templates
                const payloadStr = JSON.stringify(payload).replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
                    return finalData[p1] !== undefined ? finalData[p1] : match;
                });
                payload = JSON.parse(payloadStr);
            }

            // Call the endpoint
            let response = { data: { message: "Mock Success" } };
            
            if (isPreview) {
                // Simulate network delay in preview
                await new Promise(r => setTimeout(r, 1000));
            } else {
                if (submitAction.method === 'POST') {
                    response = await axios.post(submitAction.endpoint, payload);
                } else {
                    // default to GET
                    response = await axios.get(submitAction.endpoint, { params: payload });
                }
            }

            // Generate completion message
            let successMessage = submitAction.successMessage || "Action completed successfully!";
            successMessage = successMessage.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
                return finalData[p1] !== undefined ? finalData[p1] : match;
            });

            // Trigger completion callback to parent chat
            if (onComplete) {
                onComplete(successMessage, response.data);
            }

        } catch (err) {
            console.error("Submission failed", err);
            setError("Failed to process request.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!step) {
        return (
            <div className={`p-4 rounded-xl border text-[13px] ${isDark ? 'bg-[#111118] border-[#252535] text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                Invalid tool configuration. No steps found.
            </div>
        );
    }

    return (
        <div className={`w-full max-w-[480px] rounded-2xl border shadow-sm overflow-hidden mt-3 ${
            isDark ? 'bg-[#111118] border-[#252535]' : 'bg-white border-slate-200'
        }`}>
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b ${
                isDark ? 'border-[#252535] bg-[#1a1a28]' : 'border-slate-100 bg-slate-50'
            }`}>
                <div className="flex items-center gap-2 text-primary font-bold text-[13px]">
                    <CheckCircle size={14} className="text-primary/70" />
                    {config.title || 'Dynamic Agent'}
                </div>
                <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-[#2a2a3d] text-slate-300' : 'bg-slate-200 text-slate-600'
                }`}>
                    Step {currentStep + 1}/{steps.length}
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                <h3 className={`text-[13px] font-medium mb-3 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                    {step.title}
                </h3>

                {error && (
                    <div className="mb-3 text-red-500 text-[12px] bg-red-50 p-2 rounded-md">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* API Select Type */}
                        {(step.type === 'api_select' || step.type === 'api_multiselect') && stepData.map((item, idx) => {
                            const label = item[step.mapping?.label || 'name'];
                            const value = item[step.mapping?.value || 'id'];
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleNext(value, step.storeAs)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all text-[13px] font-medium active:scale-[0.98] ${
                                        isDark 
                                            ? 'border-[#252535] hover:border-indigo-500/50 hover:bg-[#1a1a28] text-slate-300' 
                                            : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <span className="truncate pr-4">{label}</span>
                                    <ChevronRight size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                </button>
                            );
                        })}

                        {/* Form Inputs Type */}
                        {step.type === 'form_inputs' && (
                            <div className="space-y-4">
                                {step.fields?.map((field, idx) => (
                                    <div key={idx}>
                                        <label className={`block text-[12px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {field.label}
                                        </label>
                                        {field.type === 'select' ? (
                                            <select 
                                                className={`w-full p-2.5 rounded-lg border text-[13px] ${isDark ? 'bg-[#1a1a28] border-[#252535] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                                onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                                                value={formData[field.name] || field.default || ''}
                                            >
                                                <option value="" disabled>Select option</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type={field.type || 'text'}
                                                className={`w-full p-2.5 rounded-lg border text-[13px] ${isDark ? 'bg-[#1a1a28] border-[#252535] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                                onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                                                value={formData[field.name] || field.default || ''}
                                            />
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => handleNext(formData, step.storeAs || 'form')}
                                    className="w-full py-2.5 mt-2 bg-primary text-white rounded-lg text-[13px] font-bold hover:bg-primary/90 transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                        
                        {/* No Options Fallback */}
                        {((step.type === 'api_select' || step.type === 'api_multiselect') && stepData.length === 0 && !isLoading) && (
                            <div className={`text-center py-4 text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                No options available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Back Button */}
            {currentStep > 0 && (
                <div className={`p-3 border-t flex justify-center ${isDark ? 'border-[#252535] bg-[#1a1a28]/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <button 
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className={`flex items-center gap-1 text-[12px] font-bold transition-colors ${
                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-primary'
                        }`}
                    >
                        <ArrowLeft size={13} /> Back to Previous Step
                    </button>
                </div>
            )}
        </div>
    );
}
