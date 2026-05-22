import React from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const FormField = ({ field, value, onChange }) => {
    const { name, label, type, required, description, options } = field;

    const handleChange = (newVal) => {
        onChange(name, newVal);
    };

    switch (type) {
        case 'text':
            return (
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {description && <p className="text-[10px] text-slate-400 mb-1">{description}</p>}
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            );

        case 'textarea':
            return (
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {description && <p className="text-[10px] text-slate-400 mb-1">{description}</p>}
                    <textarea
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                    />
                </div>
            );

        case 'richtext':
            return (
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {description && <p className="text-[10px] text-slate-400 mb-1">{description}</p>}
                    <RichTextEditor
                        value={value || ''}
                        onChange={(val) => handleChange(val)}
                        height="h-32"
                    />
                </div>
            );

        case 'dropdown':
            return (
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {description && <p className="text-[10px] text-slate-400 mb-1">{description}</p>}
                    <select
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">Select option...</option>
                        {(options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            );

        case 'dynamic_list':
            const listItems = Array.isArray(value) ? value : [];
            const handleAdd = () => {
                let newItem = typeof field.itemSchema === 'object' && !Array.isArray(field.itemSchema) ? {} : '';
                if (Array.isArray(field.itemSchema)) {
                    newItem = {};
                    field.itemSchema.forEach(s => newItem[s.name] = '');
                }
                handleChange([...listItems, newItem]);
            };

            const handleRemove = (index) => {
                const newList = [...listItems];
                newList.splice(index, 1);
                handleChange(newList);
            };

            const handleItemChange = (index, itemVal) => {
                const newList = [...listItems];
                newList[index] = itemVal;
                handleChange(newList);
            };

            return (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-slate-700">
                            {label} {required && <span className="text-rose-500">*</span>}
                        </label>
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200 transition-colors"
                        >
                            <Plus size={14} /> Add {label}
                        </button>
                    </div>
                    {description && <p className="text-[10px] text-slate-400 mb-3">{description}</p>}

                    {listItems.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs italic">No items added.</div>
                    ) : (
                        <div className="space-y-3">
                            {listItems.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="flex-1">
                                        {Array.isArray(field.itemSchema) ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {field.itemSchema.map(subField => (
                                                    <FormField
                                                        key={subField.name}
                                                        field={subField}
                                                        value={(item || {})[subField.name]}
                                                        onChange={(n, v) => handleItemChange(index, { ...item, [n]: v })}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={item || ''}
                                                onChange={(e) => handleItemChange(index, e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                placeholder="Item value..."
                                            />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(index)}
                                        className="mt-1 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

        default:
            return <div className="text-rose-500 text-xs mb-2">Unsupported field type: {type}</div>;
    }
};

const QuestionFormEngine = ({ schema, value, onChange }) => {
    if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
        return (
            <div className="p-4 bg-rose-50 text-rose-500 border border-rose-200 rounded-xl text-sm flex items-center gap-2">
                <Info size={16} /> Invalid or empty schema format.
            </div>
        );
    }

    const handleChange = (name, val) => {
        onChange({ ...value, [name]: val });
    };

    return (
        <div className="space-y-2">
            {schema.fields.map(field => (
                <FormField
                    key={field.name}
                    field={field}
                    value={(value || {})[field.name]}
                    onChange={handleChange}
                />
            ))}
        </div>
    );
};

export default QuestionFormEngine;
