import { useEffect, useRef } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';

export const useCanvasSync = (editor, s) => {
    const { updateSetting } = useNexusEditor();
    const prevFormatHashRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    const lastSyncedSettingsRef = useRef(null);
    const isTiptapDirtyRef = useRef(true);

    // Serialize formatting-related settings to create a stable key
    const serializedSettings = JSON.stringify({
        sections: s?.sections?.map(sec => ({
            id: sec.id,
            name: sec.name,
            instructions: sec.instructions,
            conditions: sec.conditions,
            showConditions: sec.showConditions !== false,
            showInstructions: sec.showInstructions !== false,
            showName: sec.showName !== false,
            numberingStyle: sec.numberingStyle,
            marksConfig: sec.marksConfig,
            optionLayout: sec.optionLayout,
            optionStyle: sec.optionStyle,
            optionDecoration: sec.optionDecoration,
            fontSize: sec.fontSize,
            lineGap: sec.lineGap,
            optionGap: sec.optionGap,
            questionGap: sec.questionGap,
            textAlign: sec.textAlign,
            columns: sec.columns,
            smartFit: sec.smartFit,
            continuousNumbering: sec.continuousNumbering,
            numberingStart: sec.numberingStart,
            fontFamily: sec.fontFamily
        })),
        bodyFontSize: s?.bodyFontSize,
        lineHeight: s?.lineHeight,
        questionGap: s?.questionGap,
        language: s?.language,
        columns: s?.columns,
        orientation: s?.orientation,
        pageSize: s?.pageSize,
        customW: s?.customW,
        customH: s?.customH,
        marginLeft: s?.marginLeft,
        marginRight: s?.marginRight,
        colGap: s?.colGap,
        headerGap: s?.headerGap
    });

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useEffect(() => {
        if (!editor || !s.sections) return;
        
        const runSync = () => {
            const isReactStateChange = serializedSettings !== lastSyncedSettingsRef.current;
            const isTiptapDirty = isTiptapDirtyRef.current;
            
            if (!isReactStateChange && !isTiptapDirty) {
                return;
            }
            
            isTiptapDirtyRef.current = false;

            // --- 1. Pre-Sync Scan & Combined Structural Traversal ---
            const docSections = new Set();
            const docConditions = new Set();
            const docInstructions = new Set();
            const headingPositions = {};
            const condPositions = {};
            let needsLegacyUpgrade = false;
            let currentSecId = null;
            const questionOrder = [];
            let headingCount = -1;

            editor.state.doc.descendants((node, pos) => {
                const nodeClass = node.attrs ? (node.attrs.class || '') : '';
                
                if (node.type.name === 'heading') {
                    headingCount++;
                    const secId = node.attrs ? node.attrs['data-section-id'] : null;
                    if (!secId) {
                        needsLegacyUpgrade = true;
                    } else {
                        currentSecId = secId;
                        if (nodeClass.includes('section-name')) {
                            docSections.add(secId);
                            headingPositions[secId] = { pos, nodeSize: node.nodeSize };
                        }
                    }
                } else if (node.type.name === 'paragraph') {
                    const secId = node.attrs ? node.attrs['data-section-id'] : null;
                    if (nodeClass.includes('section-conditions')) {
                        if (!secId) {
                            needsLegacyUpgrade = true;
                        } else {
                            docConditions.add(secId);
                            condPositions[secId] = { pos, nodeSize: node.nodeSize };
                        }
                    } else if (nodeClass.includes('section-instructions')) {
                        if (!secId) {
                            needsLegacyUpgrade = true;
                        } else {
                            docInstructions.add(secId);
                        }
                    }
                } else if (node.type.name === 'questionBlock') {
                    questionOrder.push(`${(node.attrs && node.attrs.questionId) || ''}:${(node.attrs && node.attrs.sectionId) || ''}`);
                    if (!node.attrs || !node.attrs.sectionId || (currentSecId && node.attrs.sectionId !== currentSecId)) {
                        needsLegacyUpgrade = true;
                    }
                }
            });

            // If a section in React state is missing completely in Tiptap, insert it at the end
            const missingSections = s.sections.filter(sec => !docSections.has(sec.id));
            if (missingSections.length > 0) {
                let tr = editor.state.tr;
                missingSections.forEach(sec => {
                    const headingNode = editor.schema.nodes.heading.create(
                        { 'data-section-id': sec.id, class: 'section-name', level: 3 },
                        sec.name ? [editor.schema.text(sec.name)] : []
                    );
                    const condNode = editor.schema.nodes.paragraph.create(
                        { 'data-section-id': sec.id, class: 'section-conditions' },
                        sec.conditions ? [editor.schema.text(`[${sec.conditions}]`)] : []
                    );
                    const instNode = editor.schema.nodes.paragraph.create(
                        { 'data-section-id': sec.id, class: 'section-instructions' },
                        sec.instructions ? [editor.schema.text(sec.instructions)] : []
                    );
                    
                    const insertPos = tr.doc.content.size;
                    tr = tr.insert(insertPos, [headingNode, condNode, instNode]);
                });
                editor.view.dispatch(tr);
                return; // Let the next update tick handle synchronization
            }

            // If a section exists but is missing its conditions or instructions paragraph, heal them
            let insertUpdates = [];
            s.sections.forEach(sec => {
                if (docSections.has(sec.id)) {
                    if (!docConditions.has(sec.id)) {
                        const headingPos = headingPositions[sec.id];
                        if (headingPos) {
                            const condNode = editor.schema.nodes.paragraph.create(
                                { 'data-section-id': sec.id, class: 'section-conditions' },
                                sec.conditions ? [editor.schema.text(`[${sec.conditions}]`)] : []
                            );
                            insertUpdates.push({
                                pos: headingPos.pos + headingPos.nodeSize,
                                node: condNode
                            });
                        }
                    }
                    if (!docInstructions.has(sec.id)) {
                        const headingPos = headingPositions[sec.id];
                        const condPos = condPositions[sec.id];
                        if (headingPos) {
                            const instNode = editor.schema.nodes.paragraph.create(
                                { 'data-section-id': sec.id, class: 'section-instructions' },
                                sec.instructions ? [editor.schema.text(sec.instructions)] : []
                            );
                            const targetPos = condPos ? (condPos.pos + condPos.nodeSize) : (headingPos.pos + headingPos.nodeSize);
                            insertUpdates.push({
                                pos: targetPos,
                                node: instNode
                            });
                        }
                    }
                }
            });

            if (insertUpdates.length > 0) {
                insertUpdates.sort((a, b) => b.pos - a.pos);
                let tr = editor.state.tr;
                insertUpdates.forEach(up => {
                    tr = tr.insert(up.pos, up.node);
                });
                editor.view.dispatch(tr);
                return;
            }

            // --- 3. Update Question Node Attributes & Section Text ---
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
                questionOrder,
                orientation: s.orientation,
                pageSize: s.pageSize,
                customW: s.customW,
                customH: s.customH,
                marginLeft: s.marginLeft,
                marginRight: s.marginRight,
                colGap: s.colGap,
                headerGap: s.headerGap
            });
            
            // If formatting hasn't changed AND no legacy upgrade needed, and it's not a Tiptap update, skip the heavy traversal
            if (prevFormatHashRef.current === formatHash && !needsLegacyUpgrade && !isTiptapDirty) {
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
            
            // To collect updates to sync back to React state when user types in editor
            const updatedSectionFields = {};
            
            // Single document traversal
            headingCount = -1;
            editor.state.doc.descendants((node, pos) => {
                const nodeClass = node.attrs ? (node.attrs.class || '') : '';

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
                        const isAlternative = node.attrs.alternativeToId != null && node.attrs.alternativeToId !== '';
                        if (!isAlternative) {
                            runningCounter++;
                        }
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
                        const orientation = s.orientation || 'portrait';
                        const pageSize = s.pageSize || 'A4';
                        const customW = s.customW || 210;
                        const customH = s.customH || 297;
                        const marginLeft = s.marginLeft !== undefined ? s.marginLeft : 10;
                        const marginRight = s.marginRight !== undefined ? s.marginRight : 10;
                        const colGap = s.columns > 1 ? (s.colGap || 10) : ((s.sections || []).find(sec => sec.columns > 1 && sec.colGap)?.colGap || s.colGap || 10);
                        
                        if (node.attrs.fontSize != fSize) { changes.fontSize = fSize; needsUpdate = true; }
                        if (node.attrs.lineGap != lGap) { changes.lineGap = lGap; needsUpdate = true; }
                        if (node.attrs.optionGap != oGap) { changes.optionGap = oGap; needsUpdate = true; }
                        if (node.attrs.questionGap != qGap) { changes.questionGap = qGap; needsUpdate = true; }
                        if (node.attrs.textAlign != tAlign) { changes.textAlign = tAlign; needsUpdate = true; }
                        if (node.attrs.pageCols != pc) { changes.pageCols = pc; needsUpdate = true; }
                        if (node.attrs.orientation !== orientation) { changes.orientation = orientation; needsUpdate = true; }
                        if (node.attrs.pageSize !== pageSize) { changes.pageSize = pageSize; needsUpdate = true; }
                        if (node.attrs.customW != customW) { changes.customW = customW; needsUpdate = true; }
                        if (node.attrs.customH != customH) { changes.customH = customH; needsUpdate = true; }
                        if (node.attrs.marginLeft != marginLeft) { changes.marginLeft = marginLeft; needsUpdate = true; }
                        if (node.attrs.marginRight != marginRight) { changes.marginRight = marginRight; needsUpdate = true; }
                        if (node.attrs.colGap != colGap) { changes.colGap = colGap; needsUpdate = true; }
                        
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
                                if (isReactStateChange) {
                                    // Edit came from settings panel. Sync to Tiptap editor.
                                    updates.push({ pos, type: 'text', text: targetText, node });
                                } else {
                                    // User edited directly in the editor! Sync back to React state.
                                    if (!updatedSectionFields[secId]) updatedSectionFields[secId] = {};
                                    if (nodeTypeKey === 'names') {
                                        updatedSectionFields[secId].name = node.textContent;
                                    } else if (nodeTypeKey === 'instructions') {
                                        updatedSectionFields[secId].instructions = node.textContent;
                                    } else if (nodeTypeKey === 'conditions') {
                                        let cleanCond = node.textContent;
                                        if (cleanCond.startsWith('[') && cleanCond.endsWith(']')) {
                                            cleanCond = cleanCond.slice(1, -1);
                                        }
                                        updatedSectionFields[secId].conditions = cleanCond;
                                    }
                                }
                            }
                            return false; // skip children
                        }
                    } else {
                        // Section was deleted from s.sections. Delete node.
                        updates.push({ pos, type: 'delete', nodeSize: node.nodeSize });
                        return false;
                    }
                }
            });

            // If there are updates to sync back to React state (because user typed in Tiptap)
            if (Object.keys(updatedSectionFields).length > 0) {
                const newSections = s.sections.map(sec => {
                    if (updatedSectionFields[sec.id]) {
                        return { ...sec, ...updatedSectionFields[sec.id] };
                    }
                    return sec;
                });
                updateSetting("sections", newSections);
                return;
            }

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

            lastSyncedSettingsRef.current = serializedSettings;
        };

        const scheduleSync = () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(runSync, 500);
        };

        // Run sync initially
        scheduleSync();

        // Run sync on editor updates (e.g. content drag-and-drop, question insertions, edits)
        const handleUpdate = () => {
            isTiptapDirtyRef.current = true;
            scheduleSync();
        };
        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [serializedSettings, editor]);
};
