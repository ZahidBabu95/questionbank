import { useEffect, useRef } from 'react';

export const useCanvasSync = (editor, s) => {
    const prevFormatHashRef = useRef(null);
    const syncTimeoutRef = useRef(null);

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useEffect(() => {
        if (!editor || !s.sections) return;
        
        const runSync = () => {
            // --- 1. Combined Structural Traversal ---
            let needsLegacyUpgrade = false;
            let currentSecId = null;
            const questionOrder = [];
            let headingCount = -1;

            editor.state.doc.descendants((node) => {
                if (node.type.name === 'heading') {
                    headingCount++;
                    if (!node.attrs['data-section-id']) {
                        needsLegacyUpgrade = true;
                    } else {
                        currentSecId = node.attrs['data-section-id'];
                    }
                } else if (node.type.name === 'paragraph') {
                    const nodeClass = node.attrs.class || '';
                    if ((nodeClass.includes('section-instructions') || nodeClass.includes('section-conditions')) && !node.attrs['data-section-id']) {
                        needsLegacyUpgrade = true;
                    }
                } else if (node.type.name === 'questionBlock') {
                    questionOrder.push(`${node.attrs.questionId || ''}:${node.attrs.sectionId || ''}`);
                    if (!node.attrs.sectionId || (currentSecId && node.attrs.sectionId !== currentSecId)) {
                        needsLegacyUpgrade = true;
                    }
                }
            });

            // --- 2. Update Question Node Attributes & Section Text ---
            // Create a hash of formatting and question order to detect layout or structural changes
            const formatHash = JSON.stringify({
                sections: s.sections.map(sec => ({
                    id: sec.id,
                    name: sec.name,
                    inst: sec.instructions,
                    cond: sec.conditions,
                    showCond: sec.showConditions !== false,
                    showInst: sec.showInstructions !== false,
                    showName: sec.showName !== false,
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
                    sf: sec.smartFit,
                    cn: sec.continuousNumbering,
                    nStart: sec.numberingStart,
                    ff: sec.fontFamily
                })),
                bodyFs: s.bodyFontSize,
                lineH: s.lineHeight,
                qGap: s.questionGap,
                questionOrder
            });
            
            // If formatting hasn't changed AND no legacy upgrade needed, skip the heavy traversal
            if (prevFormatHashRef.current === formatHash && !needsLegacyUpgrade) {
                return;
            }
            prevFormatHashRef.current = formatHash;

            const mcqSec = s.sections.find(sec => sec.isMCQ);
            const cqSec = s.sections.find(sec => !sec.isMCQ);

            const updates = [];
            let activeSecId = null;
            const seenSectionsWithQuestion = new Set();
            const processed = { names: new Set(), instructions: new Set(), conditions: new Set() };
            let runningCounter = 0;
            let activeSecIdForCounter = null;
            
            // Single document traversal
            headingCount = -1;
            editor.state.doc.descendants((node, pos) => {
                const nodeClass = node.attrs.class || '';

                // 1. Sync & Self-Heal Active Section ID for Headings
                if (node.type.name === 'heading') {
                    headingCount++;
                    const existingId = node.attrs['data-section-id'];
                    const hasValidSec = existingId && s.sections.some(sec => sec.id === existingId);
                    
                    if (hasValidSec) {
                        activeSecId = existingId;
                    } else {
                        // Find the matching section by index or name
                        const targetSec = s.sections[headingCount]
                                            || s.sections.find(sec => sec.name && node.textContent.trim().includes(sec.name.trim()));
                        if (targetSec) {
                            activeSecId = targetSec.id;
                            updates.push({
                                pos,
                                type: 'attrs',
                                changes: { 
                                    'data-section-id': targetSec.id,
                                    class: 'section-name'
                                }
                            });
                        }
                    }
                }

                // 2. Sync & Self-Heal Paragraphs (Instructions/Conditions)
                if (node.type.name === 'paragraph' && (nodeClass.includes('section-instructions') || nodeClass.includes('section-conditions'))) {
                    if (node.attrs['data-section-id'] !== activeSecId && activeSecId) {
                        updates.push({
                            pos,
                            type: 'attrs',
                            changes: { 'data-section-id': activeSecId }
                        });
                    }
                }

                // 3. Sync Question Node Attributes
                if (node.type.name === 'questionBlock') {
                    const targetSec = s.sections.find(sec => sec.id === activeSecId) || (node.attrs.type === 'MCQ' ? mcqSec : cqSec);
                    
                    if (targetSec) {
                        let needsUpdate = false;
                        const changes = {};
                        
                        const defaultStyle = s.language === 'ENGLISH' ? 'en' : 'bn';
                        const ns = targetSec.numberingStyle || defaultStyle;
                        const mc = targetSec.marksConfig || 'hide';
                        const ol = targetSec.optionLayout || 'col1';
                        const os = targetSec.optionStyle || defaultStyle;
                        const od = targetSec.optionDecoration || 'rightBracket';
                        const sf = targetSec.smartFit !== false;

                        if (node.attrs.numberingStyle !== ns) { changes.numberingStyle = ns; needsUpdate = true; }
                        if (node.attrs.marksConfig !== mc) { changes.marksConfig = mc; needsUpdate = true; }
                        if (node.attrs.optionLayout !== ol) { changes.optionLayout = ol; needsUpdate = true; }
                        if (node.attrs.optionStyle !== os) { changes.optionStyle = os; needsUpdate = true; }
                        if (node.attrs.optionDecoration !== od) { changes.optionDecoration = od; needsUpdate = true; }
                        if (node.attrs.smartFit !== sf) { changes.smartFit = sf; needsUpdate = true; }
                        
                        // Sync sectionId
                        const targetSecId = activeSecId || targetSec.id;
                        if (node.attrs.sectionId !== targetSecId) {
                            changes.sectionId = targetSecId;
                            needsUpdate = true;
                        }

                        // Calculate and sync correct questionNumber attribute
                        if (activeSecIdForCounter !== targetSecId) {
                            activeSecIdForCounter = targetSecId;
                            const isContinuous = targetSec.continuousNumbering !== false;
                            if (!isContinuous) {
                                runningCounter = (Number(targetSec.numberingStart) || 1) - 1;
                            }
                        }
                        runningCounter++;
                        if (node.attrs.questionNumber !== runningCounter) {
                            changes.questionNumber = runningCounter;
                            needsUpdate = true;
                        }

                        // Sync firstInSection attribute
                        const isFirst = !seenSectionsWithQuestion.has(targetSecId);
                        if (isFirst) {
                            seenSectionsWithQuestion.add(targetSecId);
                        }
                        if (node.attrs.firstInSection !== isFirst) {
                            changes.firstInSection = isFirst;
                            needsUpdate = true;
                        }

                        // Layout & Typography sync
                        const fSize = targetSec.fontSize !== undefined && targetSec.fontSize !== '' ? targetSec.fontSize : s.bodyFontSize;
                        
                        const lGap = targetSec.lineGap !== undefined && targetSec.lineGap !== '' ? targetSec.lineGap : s.lineHeight;
                        const oGap = targetSec.optionGap !== undefined && targetSec.optionGap !== '' ? targetSec.optionGap : null;
                        const qGap = targetSec.questionGap !== undefined && targetSec.questionGap !== '' ? targetSec.questionGap : s.questionGap;
                        
                        const tAlign = targetSec.textAlign || 'left';
                        const pc = targetSec.columns || s.columns || 1; // Section columns override global columns
                        
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
                    activeSecId = secId;
                    const targetSec = s.sections.find(sec => sec.id === secId);
                    
                    if (targetSec) {
                        const nodeClass = node.attrs.class || '';
                        let targetText = null;
                        let nodeTypeKey = null;
                        
                        if (node.type.name === 'heading' && nodeClass.includes('section-name')) {
                            targetText = targetSec.name || '';
                            nodeTypeKey = 'names';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-instructions')) {
                            targetText = targetSec.showInstructions !== false ? (targetSec.instructions || '') : '';
                            nodeTypeKey = 'instructions';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-conditions')) {
                            targetText = targetSec.showConditions !== false ? (targetSec.conditions ? `[${targetSec.conditions}]` : '') : '';
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
        };

        const scheduleSync = () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(runSync, 150);
        };

        // Run sync initially
        scheduleSync();

        // Run sync on editor updates (e.g. content drag-and-drop, question insertions, edits)
        const handleUpdate = () => {
            scheduleSync();
        };
        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [s, editor]);
};
