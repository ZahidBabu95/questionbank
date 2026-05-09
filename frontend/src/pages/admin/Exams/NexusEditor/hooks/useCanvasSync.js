import { useEffect, useRef } from 'react';

export const useCanvasSync = (editor, s) => {
    const prevFormatHashRef = useRef(null);
    const syncTimeoutRef = useRef(null);

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useEffect(() => {
        if (!editor || !s.sections) return;
        
        // --- 1. Detect if Legacy Upgrade is needed ---
        let needsLegacyUpgrade = false;
        editor.state.doc.descendants((node) => {
            if (node.type.name === 'heading' && !node.attrs['data-section-id']) {
                needsLegacyUpgrade = true;
            }
        });
        
        // --- 2. Update Question Node Attributes & Section Text ---
        // Create a hash of ONLY the properties that require a full document traversal
        const formatHash = JSON.stringify({
            sections: s.sections.map(sec => ({
                id: sec.id,
                name: sec.name,
                inst: sec.instructions,
                cond: sec.conditions,
                ns: sec.numberingStyle,
                mc: sec.marksConfig,
                ol: sec.optionLayout,
                od: sec.optionDecoration,
                fs: sec.fontSize,
                lg: sec.lineGap,
                og: sec.optionGap,
                qg: sec.questionGap,
                ta: sec.textAlign,
                cols: sec.columns,
                sf: sec.smartFit
            })),
            bodyFs: s.bodyFontSize,
            lineH: s.lineHeight,
            qGap: s.questionGap
        });
        
        // If formatting hasn't changed AND no legacy upgrade needed, skip the heavy traversal
        if (prevFormatHashRef.current === formatHash && !needsLegacyUpgrade) {
            return;
        }
        prevFormatHashRef.current = formatHash;

        const mcqSec = s.sections.find(sec => sec.isMCQ);
        const cqSec = s.sections.find(sec => !sec.isMCQ);

        // Use setTimeout to unblock the UI thread immediately (fixes dropdown lag)
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            const updates = [];
            let currentSecId = null;
            const processed = { names: new Set(), instructions: new Set(), conditions: new Set() };
            
            // Single document traversal
            editor.state.doc.descendants((node, pos) => {
                // 1. Legacy Upgrade Logic (Headers without section ID)
                if (node.type.name === 'heading' && !node.attrs['data-section-id']) {
                    // Fast skip: assume legacy upgrades are already handled by other mechanisms
                    // or handled individually. For safety, we just skip here if not set.
                } 
                // 2. Track Active Section ID
                else if (node.type.name === 'heading' && node.attrs['data-section-id']) {
                    currentSecId = node.attrs['data-section-id'];
                }

                // 3. Sync Question Node Attributes
                if (node.type.name === 'questionBlock') {
                    const targetSec = s.sections.find(sec => sec.id === currentSecId) || (node.attrs.type === 'MCQ' ? mcqSec : cqSec);
                    
                    if (targetSec) {
                        let needsUpdate = false;
                        const changes = {};
                        
                        const ns = targetSec.numberingStyle || 'bn';
                        const mc = targetSec.marksConfig || 'hide';
                        const ol = targetSec.optionLayout || 'col1';
                        const os = targetSec.optionStyle || 'bn';
                        const od = targetSec.optionDecoration || 'rightBracket';
                        const sf = targetSec.smartFit !== false;

                        if (node.attrs.numberingStyle !== ns) { changes.numberingStyle = ns; needsUpdate = true; }
                        if (node.attrs.marksConfig !== mc) { changes.marksConfig = mc; needsUpdate = true; }
                        if (node.attrs.optionLayout !== ol) { changes.optionLayout = ol; needsUpdate = true; }
                        if (node.attrs.optionStyle !== os) { changes.optionStyle = os; needsUpdate = true; }
                        if (node.attrs.optionDecoration !== od) { changes.optionDecoration = od; needsUpdate = true; }
                        if (node.attrs.smartFit !== sf) { changes.smartFit = sf; needsUpdate = true; }
                        
                        // Layout & Typography sync
                        const fSize = targetSec.fontSize !== undefined && targetSec.fontSize !== '' ? targetSec.fontSize : s.bodyFontSize;
                        
                        const lGap = targetSec.lineGap !== undefined && targetSec.lineGap !== '' ? targetSec.lineGap : s.lineHeight;
                        const oGap = targetSec.optionGap !== undefined && targetSec.optionGap !== '' ? targetSec.optionGap : null;
                        const qGap = targetSec.questionGap !== undefined && targetSec.questionGap !== '' ? targetSec.questionGap : s.questionGap;
                        
                        const tAlign = targetSec.textAlign || 'left';
                        const pc = Math.max(s.columns || 1, targetSec.columns || 1);
                        
                        if (node.attrs.fontSize != fSize) { changes.fontSize = fSize; needsUpdate = true; }
                        if (node.attrs.lineGap != lGap) { changes.lineGap = lGap; needsUpdate = true; }
                        if (node.attrs.optionGap != oGap) { changes.optionGap = oGap; needsUpdate = true; }
                        if (node.attrs.questionGap != qGap) { changes.questionGap = qGap; needsUpdate = true; }
                        if (node.attrs.textAlign != tAlign) { changes.textAlign = tAlign; needsUpdate = true; }
                        if (node.attrs.pageCols != pc) { changes.pageCols = pc; needsUpdate = true; }
                        
                        if (needsUpdate) {
                            updates.push({ pos, type: 'attrs', changes });
                        }
                    }
                    return false; // skip children of question block
                } 
                // 4. Sync Section Text (Instructions, Conditions, Names)
                else if (node.attrs && node.attrs['data-section-id']) {
                    const secId = node.attrs['data-section-id'];
                    currentSecId = secId;
                    const targetSec = s.sections.find(sec => sec.id === secId);
                    
                    if (targetSec) {
                        const nodeClass = node.attrs.class || '';
                        let targetText = null;
                        let nodeTypeKey = null;
                        
                        if (node.type.name === 'heading' && nodeClass.includes('section-name')) {
                            targetText = targetSec.name || '';
                            nodeTypeKey = 'names';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-instructions')) {
                            targetText = targetSec.instructions || '';
                            nodeTypeKey = 'instructions';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-conditions')) {
                            targetText = targetSec.conditions ? `[${targetSec.conditions}]` : '';
                            nodeTypeKey = 'conditions';
                        }
                        
                        if (nodeTypeKey) {
                            if (processed[nodeTypeKey].has(secId)) {
                                // This is a duplicate node. Mark for deletion.
                                updates.push({ pos, type: 'delete', nodeSize: node.nodeSize });
                                return false;
                            }
                            processed[nodeTypeKey].add(secId);
                            
                            if (targetText !== null && node.textContent !== targetText) {
                                updates.push({ pos, type: 'text', text: targetText, node });
                            }
                            return false; // skip children
                        }
                    }
                }
            });

            if (updates.length > 0) {
                // Apply updates in reverse order of position to avoid mapping issues
                updates.sort((a, b) => b.pos - a.pos);
                
                let tr = editor.state.tr;
                updates.forEach(update => {
                    if (update.type === 'delete') {
                        tr = tr.delete(update.pos, update.pos + update.nodeSize);
                    } else if (update.type === 'attrs') {
                        const currentNode = tr.doc.nodeAt(update.pos);
                        if (currentNode) {
                            tr = tr.setNodeMarkup(update.pos, undefined, { ...currentNode.attrs, ...update.changes });
                        }
                    } else if (update.type === 'text') {
                        const newContent = update.text ? [editor.schema.text(update.text)] : [];
                        const newNode = editor.schema.nodes[update.node.type.name].create(update.node.attrs, newContent);
                        tr = tr.replaceWith(update.pos, update.pos + update.node.nodeSize, newNode);
                    }
                });
                editor.view.dispatch(tr);
            }
        }, 300);
    }, [s.sections, editor]);
};
