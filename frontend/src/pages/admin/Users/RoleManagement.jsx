import React, { useState, useEffect } from 'react';
import { Plus, Save, Loader2, ShieldCheck, Trash2, Edit2, Check, ChevronRight, ChevronDown } from 'lucide-react';
import userService from '../../../services/userService';
import { MENU_ITEMS } from '../../../components/layout/Sidebar';

// Utility to generate a safe uppercase ID mapping for menus
const generateMenuId = (title, parentId = '') => {
    let baseId = title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    return parentId ? `${parentId}_${baseId}` : baseId;
};

// Recursively parse the Sidebar MENU_ITEMS into our Permission modules table structure
const buildModulesList = (items, parentId = '') => {
    return items.map(item => {
        let id = generateMenuId(item.title, parentId);
        const moduleItem = { id, name: item.title };
        if (item.submenu && item.submenu.length > 0) {
            moduleItem.submenus = buildModulesList(item.submenu, id);
        }
        return moduleItem;
    });
};

// Generate the dynamic list exactly based on real sidebar!
const dynamicModulesList = buildModulesList(MENU_ITEMS);

// Helper to extract all nested module IDs
const getAllChildTreeIds = (moduleObj) => {
    let ids = [moduleObj.id];
    if (moduleObj.submenus) {
        moduleObj.submenus.forEach(sub => {
            ids = [...ids, ...getAllChildTreeIds(sub)];
        });
    }
    return ids;
};

// Helper to get every single possible required permission string exactly matching the dynamic tree
const getAllRequiredPermissionStrings = () => {
    const actions = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
    const perms = [];
    const traverse = (nodes) => {
        nodes.forEach(node => {
            actions.forEach(a => perms.push(`${node.id}_${a}`));
            if (node.submenus) traverse(node.submenus);
        });
    };
    traverse(dynamicModulesList);
    return perms;
};

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermIds, setSelectedPermIds] = useState([]);
    const [expandedModules, setExpandedModules] = useState({});

    // Role Edit/Create Modal
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const requiredPerms = getAllRequiredPermissionStrings();
            
            // 1. Sync UI Menus with Backend (Auto-creates missing ones!)
            const permsRes = await userService.syncPermissions(requiredPerms);
            
            // 2. Fetch roles
            const rolesRes = await userService.getRoles();

            if (rolesRes.success) {
                setRoles(rolesRes.data);
                if (!selectedRole && rolesRes.data.length > 0) {
                    handleSelectRole(rolesRes.data[0]);
                } else if (selectedRole) {
                    const updatedRole = rolesRes.data.find(r => r.id === selectedRole.id);
                    if (updatedRole) handleSelectRole(updatedRole);
                }
            }

            if (permsRes.success) {
                setPermissions(permsRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectRole = (role) => {
        setSelectedRole(role);
        if (role.permissions) {
            setSelectedPermIds(role.permissions.map(p => p.id));
        } else {
            setSelectedPermIds([]);
        }
    };

    const getPermId = (moduleId, action) => {
        const permName = `${moduleId}_${action}`;
        const perm = permissions.find(p => p.name === permName);
        return perm ? perm.id : null;
    };

    const toggleModule = (id) => {
        setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleTogglePermission = (nodeData, action) => {
        const primaryPermId = getPermId(nodeData.id, action);
        if (!primaryPermId) return;

        // Get all nested IDs from this node downwards
        const allTreeIds = getAllChildTreeIds(nodeData);

        setSelectedPermIds(prev => {
            const isCurrentlyChecked = prev.includes(primaryPermId);
            let newIds = new Set(prev); // Use Set for efficient add/remove

            if (isCurrentlyChecked) {
                // If checking off, remove this node and ALL its children for this action
                allTreeIds.forEach(tId => {
                    const pid = getPermId(tId, action);
                    if (pid) newIds.delete(pid);
                });
            } else {
                // If checking on, add this node and ALL its children for this action
                allTreeIds.forEach(tId => {
                    const pid = getPermId(tId, action);
                    if (pid) newIds.add(pid);
                });
            }
            return Array.from(newIds);
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            setSaving(true);
            const roleData = {
                name: selectedRole.name,
                description: selectedRole.description,
                permissions: selectedPermIds.map(id => ({ id }))
            };
            await userService.updateRole(selectedRole.id, roleData);
            await fetchData();
            alert('Permissions updated successfully!');
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert('Failed to update permissions.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            if (roleForm.id) {
                await userService.updateRole(roleForm.id, { 
                    name: roleForm.name, 
                    description: roleForm.description, 
                    permissions: selectedRole?.permissions || [] 
                });
            } else {
                await userService.createRole({ 
                    name: roleForm.name.toUpperCase(), 
                    description: roleForm.description, 
                    permissions: [] 
                });
            }
            setShowRoleModal(false);
            fetchData();
        } catch (error) {
            alert('Failed to save role');
        }
    };

    const handleDeleteRole = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you certain you want to delete this role?')) {
            try {
                await userService.deleteRole(id);
                if (selectedRole?.id === id) setSelectedRole(null);
                fetchData();
            } catch (error) {
                alert('Failed to delete role');
            }
        }
    };

    const openRoleModal = (role = null, e = null) => {
        if (e) e.stopPropagation();
        if (role) {
            setRoleForm({ id: role.id, name: role.name, description: role.description || '' });
        } else {
            setRoleForm({ id: null, name: '', description: '' });
        }
        setShowRoleModal(true);
    };

    // Recursive row renderer
    const renderRow = (mod, level = 0, isLastItem = false) => {
        const hasSubmenus = mod.submenus && mod.submenus.length > 0;
        const isExpanded = expandedModules[mod.id];
        
        let rowPaddingClass = "pl-6"; 
        if (level === 1) rowPaddingClass = "pl-14";
        if (level === 2) rowPaddingClass = "pl-[88px]";
        if (level === 3) rowPaddingClass = "pl-[120px]";

        const rows = [
            <tr 
                key={mod.id}
                className={`transition-colors ${level === 0 ? 'hover:bg-slate-50 border-b border-slate-100' : 'bg-slate-50/50 hover:bg-slate-100/50'} ${level === 1 && isLastItem && !isExpanded ? 'border-b border-slate-100' : ''}`}
            >
                <td className={`py-3.5 pr-6 font-semibold whitespace-nowrap ${rowPaddingClass}`}>
                    <div className="flex items-center gap-2">
                        {level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}
                        {hasSubmenus ? (
                            <button 
                                onClick={() => toggleModule(mod.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        ) : (
                            level === 0 && <div className="w-6" /> // spacer for level 0 items without submenus
                        )}
                        <span className={`${isExpanded && level === 0 ? 'text-primary' : ''} ${level === 0 ? 'text-[13px] text-slate-800' : level === 1 ? 'text-[13px] text-slate-700' : 'text-[12px] text-slate-600 font-medium'}`}>
                            {mod.name}
                        </span>
                    </div>
                </td>
                
                {['VIEW', 'CREATE', 'EDIT', 'DELETE'].map(action => {
                    const permId = getPermId(mod.id, action);
                    const isSuperAdmin = selectedRole?.name === 'SUPER_ADMIN';
                    const isChecked = isSuperAdmin ? true : (permId ? selectedPermIds.includes(permId) : false);
                    
                    return (
                        <td key={action} className="py-3 px-4 text-center">
                            {permId ? (
                                <div 
                                    onClick={() => !isSuperAdmin && handleTogglePermission(mod, action)}
                                    className={`inline-flex p-1.5 rounded-md transition-colors tooltip-target relative group ${
                                        isSuperAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:bg-slate-100/80'
                                    }`}
                                    title={isSuperAdmin ? 'System Bypass - SUPER_ADMIN has full access automatically.' : (permId ? `Permission Generated ID: ${mod.id}_${action}` : '')}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                        isChecked 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-slate-300'
                                    }`}>
                                        {isChecked && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-200">-</span>
                            )}
                        </td>
                    )
                })}
            </tr>
        ];

        if (hasSubmenus && isExpanded) {
            mod.submenus.forEach((sub, sIndex) => {
                const isLastSub = sIndex === mod.submenus.length - 1;
                rows.push(...renderRow(sub, level + 1, isLastSub));
            });
        }

        return rows;
    };


    if (loading && roles.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="pb-8 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Dynamic Menu Access Control</h1>
                    <p className="text-slate-500 mt-1">Automatically mapped from your active Sidebar. Add/remove sidebar items and they appear here instantly.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT PANE: ROLES LIST */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-4 border-b border-blue-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <h2 className="text-base font-bold text-slate-800">Available Roles</h2>
                        <button
                            onClick={() => openRoleModal()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm shadow-primary/20 transition-all"
                        >
                            <Plus size={14} /> Add Role
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {roles.map(role => {
                            const isSelected = selectedRole?.id === role.id;
                            return (
                                <div
                                    key={role.id}
                                    onClick={() => handleSelectRole(role)}
                                    className={`relative px-4 py-3.5 rounded-lg cursor-pointer transition-all duration-200 border border-transparent group flex justify-between items-center ${
                                        isSelected 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                        : 'hover:bg-slate-50 border-b border-slate-100/50'
                                    }`}
                                >
                                    <div>
                                        <div className={`font-bold text-[14px] ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {role.name}
                                            {role.name === 'SUPER_ADMIN' && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-slate-900/20 text-white font-normal relative -top-0.5" title="Has automated overriding access">Automated</span>}
                                        </div>
                                        <div className={`text-[11px] mt-0.5 max-w-[160px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                            {role.description || 'Full system access'}
                                        </div>
                                    </div>
                                    
                                    <div className={`flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                        <button onClick={(e) => openRoleModal(role, e)} className="p-1 hover:bg-black/10 rounded">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={(e) => handleDeleteRole(role.id, e)} className="p-1 hover:bg-rose-500/20 hover:text-rose-100 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* RIGHT PANE: PERMISSION MATRIX */}
                <div className="lg:col-span-9 bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden flex flex-col h-[750px]">
                    <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                        <h2 className="text-[15px] font-semibold text-slate-700 font-sans">
                            Permissions for: <span className="text-primary font-bold ml-1">{selectedRole?.name || 'Select a role'}</span>
                        </h2>
                        <button
                            onClick={handleSavePermissions}
                            disabled={!selectedRole || saving}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                                !selectedRole || saving
                                ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                                : 'bg-primary hover:bg-blue-600 active:scale-[0.98] text-white shadow-primary/20'
                            }`}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Permissions'}
                        </button>
                    </div>

                    <div className="overflow-auto flex-1 p-0 custom-scrollbar">
                        <table className="w-full min-w-[700px] text-left border-collapse select-none">
                            <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                                <tr>
                                    <th className="py-3 px-6 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 w-2/5">Module / Menu Tree</th>
                                    <th className="py-3 px-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 text-center w-[15%]">View</th>
                                    <th className="py-3 px-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 text-center w-[15%]">Create</th>
                                    <th className="py-3 px-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 text-center w-[15%]">Edit</th>
                                    <th className="py-3 px-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 text-center w-[15%]">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dynamicModulesList.map((mod, index) => renderRow(mod, 0, index === dynamicModulesList.length - 1))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ROLES MODAL */}
            {showRoleModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">
                                {roleForm.id ? 'Edit Role Details' : 'Create New Role'}
                            </h2>
                        </div>
                        <form onSubmit={handleSaveRole} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Name (e.g., MANAGER)</label>
                                <input
                                    type="text"
                                    required
                                    value={roleForm.name}
                                    onChange={e => setRoleForm({...roleForm, name: e.target.value.toUpperCase()})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none uppercase font-semibold text-sm"
                                    placeholder="Enter unique role name..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <textarea
                                    value={roleForm.description}
                                    onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                                    rows="3"
                                    placeholder="Brief description of this role's purpose..."
                                />
                            </div>
                            <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md shadow-primary/20 text-sm">Save Details</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RoleManagement;
