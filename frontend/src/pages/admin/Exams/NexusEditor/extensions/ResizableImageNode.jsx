import React, { useState, useRef, useEffect } from 'react';
import { mergeAttributes } from '@tiptap/core';
import { Image as BaseImage } from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { ImageIcon } from 'lucide-react';

const ResizableImageView = ({ node, updateAttributes, selected, editor, getPos }) => {
    const { src, alt, width, align } = node.attrs;
    const [localWidth, setLocalWidth] = useState(width || '50%');
    const isBadSrc = !src || src.trim() === '' || src === 'null' || src === 'undefined' || src === '#';
    const [imgError, setImgError] = useState(isBadSrc);

    const imgRef = useRef(null);
    const innerWrapperRef = useRef(null);
    const startX = useRef(null);
    const startW = useRef(null);
    const resizing = useRef(false);

    useEffect(() => { setLocalWidth(width || '50%'); }, [width]);
    useEffect(() => { setImgError(isBadSrc); }, [isBadSrc]);

    useEffect(() => {
        const el = innerWrapperRef.current;
        if (!el || !editor || typeof getPos !== 'function') return;

        const handleMouseDown = (e) => {
            if (resizing.current) return;
            e.preventDefault();
            e.stopPropagation();
            const pos = getPos();
            if (typeof pos === 'number') {
                editor.commands.setNodeSelection(pos);
            }
        };

        el.addEventListener('mousedown', handleMouseDown, { capture: true });
        return () => el.removeEventListener('mousedown', handleMouseDown, { capture: true });
    }, [editor, getPos, selected, imgError]);

    const onResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing.current = true;
        startX.current = e.clientX;
        startW.current = imgRef.current?.offsetWidth || 300;

        const onMove = (mv) => {
            if (!resizing.current) return;
            setLocalWidth(`${Math.max(60, startW.current + mv.clientX - startX.current)}px`);
        };
        const onUp = (mu) => {
            resizing.current = false;
            updateAttributes({ width: `${Math.max(60, startW.current + mu.clientX - startX.current)}px` });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const outerStyle = {
        left: { display: 'flex', justifyContent: 'flex-start', margin: '0.75em 0', width: '100%' },
        center: { display: 'flex', justifyContent: 'center', margin: '0.75em 0', width: '100%' },
        right: { display: 'flex', justifyContent: 'flex-end', margin: '0.75em 0', width: '100%' },
    }[align] || { display: 'flex', justifyContent: 'center', margin: '0.75em 0', width: '100%' };

    const ring = selected
        ? { outline: '2.5px solid #4f46e5', outlineOffset: '2px' }
        : { outline: '2px solid transparent', outlineOffset: '2px' };

    return (
        <NodeViewWrapper as="div" style={outerStyle} contentEditable={false}>
            <div ref={innerWrapperRef} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', cursor: 'pointer' }}>
                {!imgError ? (
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt || 'Image'}
                        draggable={false}
                        onError={() => setImgError(true)}
                        style={{
                            display: 'block', width: localWidth, minWidth: '60px', maxWidth: '100%',
                            borderRadius: '4px', userSelect: 'none', transition: 'outline 0.12s', ...ring
                        }}
                    />
                ) : (
                    <div ref={imgRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: localWidth || '120px', minHeight: '90px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', userSelect: 'none', ...ring }}>
                        <ImageIcon size={20} style={{ marginBottom: 4, opacity: 0.5 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', padding: '0 6px' }}>{alt || 'Image'}</span>
                    </div>
                )}
                {selected && !imgError && (
                    <div onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }} style={{ position: 'absolute', bottom: -5, right: -5, width: 13, height: 13, background: '#4f46e5', borderRadius: '50%', border: '2.5px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.4)', cursor: 'nwse-resize', zIndex: 10 }} />
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const ResizableImage = BaseImage.extend({
    name: 'image',
    inline: false,
    group: 'block',
    draggable: true,
    atom: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '50%',
                renderHTML: (attrs) => ({ 'data-width': attrs.width }),
                parseHTML: (el) => el.getAttribute('data-width') || el.style.width || '50%',
            },
            align: {
                default: 'center',
                renderHTML: (attrs) => ({ 'data-align': attrs.align }),
                parseHTML: (el) => el.getAttribute('data-align') || 'center',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-image-wrapper] img, span[data-image-wrapper] img',
                priority: 100,
                getAttrs: (dom) => {
                    const wrapperAlign = dom.parentElement ? dom.parentElement.getAttribute('data-align') : null;
                    return { src: dom.getAttribute('src') || '', alt: dom.getAttribute('alt') || '', width: dom.getAttribute('data-width') || dom.style.width || '50%', align: dom.getAttribute('data-align') || wrapperAlign || 'center' };
                },
            },
            {
                tag: 'img',
                priority: 50,
                getAttrs: (dom) => ({ src: dom.getAttribute('src') || '', alt: dom.getAttribute('alt') || '', width: dom.getAttribute('data-width') || dom.style.width || '50%', align: dom.getAttribute('data-align') || 'center' }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { align, width, 'data-width': dw, 'data-align': da, ...rest } = HTMLAttributes;
        const resolvedAlign = align || da || 'center';
        const resolvedWidth = width || dw || '50%';
        const flex = resolvedAlign === 'center' ? 'center' : resolvedAlign === 'right' ? 'flex-end' : 'flex-start';
        const style = `display:flex;width:100%;justify-content:${flex};margin:0.75em 0`;

        return [
            'div', { 'data-image-wrapper': '', 'data-align': resolvedAlign, style },
            ['img', mergeAttributes(rest, { 'data-width': resolvedWidth, 'data-align': resolvedAlign, style: `width:${resolvedWidth};max-width:100%;border-radius:6px;display:block` })],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
