import React, { useState, useRef, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { X, Check, Loader2, Upload, RefreshCw, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Move, Crop } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const HR = 7; // handle radius

const handles = (s) => !s ? {} : {
    nw: [s.x, s.y],           n: [s.x + s.w / 2, s.y],         ne: [s.x + s.w, s.y],
    w:  [s.x, s.y + s.h / 2],                                   e:  [s.x + s.w, s.y + s.h / 2],
    sw: [s.x, s.y + s.h],     s: [s.x + s.w / 2, s.y + s.h],   se: [s.x + s.w, s.y + s.h],
};

const hitHandle = (mx, my, s) => {
    for (const [name, [hx, hy]] of Object.entries(handles(s))) {
        if (Math.hypot(mx - hx, my - hy) <= HR + 5) return name;
    }
    return null;
};

const inSel = (mx, my, s) => s && mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h;

const norm = (s) => ({
    x: s.w < 0 ? s.x + s.w : s.x, y: s.h < 0 ? s.y + s.h : s.y,
    w: Math.abs(s.w), h: Math.abs(s.h),
});

const CURSORS = { nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize', se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize' };

const fmtSize = (b) => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

// ── Component ─────────────────────────────────────────────────────────────────
const ImageEditorModal = ({ file, src: srcProp, isOpen, onClose, onSave, maxSizeKB = 800 }) => {
    const [fileName, setFileName] = useState('image.jpg');
    const [origSize, setOrigSize]   = useState(0);
    const [selInfo, setSelInfo]     = useState(null);
    const [processing, setProcessing] = useState(false);
    const [cursor, setCursor]       = useState('crosshair');
    const [toolMode, setToolMode]   = useState('crop'); // 'crop' | 'pan'

    // Slider display values (React state for UI only)  
    const [rotation, setRotation]   = useState(0);
    const [zoom, setZoom]           = useState(1);
    const [sharpen, setSharpen]   = useState(0); // 0=off, 1-5 intensity
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast]   = useState(100);
    const [flipH, setFlipH]         = useState(false);
    const [flipV, setFlipV]         = useState(false);

    const canvasRef    = useRef(null);
    const containerRef = useRef(null);
    const changeRef    = useRef(null);
    const rafRef       = useRef(null);

    // Single mutable ref for all drawing state (avoids stale closures in RAF)
    const g = useRef({
        imgEl: null, processedImgEl: null, sel: null, zoom: 1, pan: { x: 0, y: 0 },
        rotation: 0, flipH: false, flipV: false, brightness: 100, contrast: 100, sharpen: 0,
        dragging: false, dragType: null, dragStart: null, selAtStart: null,
        panAtStart: null, spaceDown: false, toolMode: 'crop',
        canvasW: 600, canvasH: 400, fileName: 'image.jpg',
    });

    // ── Sharpening convolution (3×3 Laplacian kernel) ────────────────────────
    const applyConvolve = useCallback((srcImg, strength) => {
        if (!srcImg || strength === 0) { g.current.processedImgEl = null; return; }
        const oc = document.createElement('canvas');
        oc.width = srcImg.naturalWidth || srcImg.width;
        oc.height = srcImg.naturalHeight || srcImg.height;
        const ctx = oc.getContext('2d');
        ctx.drawImage(srcImg, 0, 0);
        try {
            const id = ctx.getImageData(0, 0, oc.width, oc.height);
            const d = id.data, w = oc.width, h = oc.height;
            const out = new Uint8ClampedArray(d.length);
            const s = strength * 0.25; // scale: strength 5 → s=1.25
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
                        out[i] = d[i]; out[i+1] = d[i+1]; out[i+2] = d[i+2]; out[i+3] = d[i+3];
                        continue;
                    }
                    for (let c = 0; c < 3; c++) {
                        out[i+c] = Math.max(0, Math.min(255,
                            -s * d[((y-1)*w+x)*4+c] +
                            -s * d[(y*w+x-1)*4+c] +
                            (1 + 4*s) * d[i+c] +
                            -s * d[(y*w+x+1)*4+c] +
                            -s * d[((y+1)*w+x)*4+c]
                        ));
                    }
                    out[i+3] = d[i+3];
                }
            }
            ctx.putImageData(new ImageData(out, w, h), 0, 0);
            const sharpImg = new Image();
            sharpImg.onload = () => { g.current.processedImgEl = sharpImg; };
            sharpImg.src = oc.toDataURL('image/jpeg', 0.98);
        } catch (e) {
            g.current.processedImgEl = null; // tainted or error
        }
    }, []);

    // Re-apply sharpening when sharpen value or image changes
    useEffect(() => {
        g.current.sharpen = sharpen;
        applyConvolve(g.current.imgEl, sharpen);
    }, [sharpen, applyConvolve]);

    // ── Draw loop (RAF) ──────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { imgEl, processedImgEl, sel, zoom: z, pan, rotation: rot, flipH: fh, flipV: fv, brightness: br, contrast: ct } = g.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#090b10';
        ctx.fillRect(0, 0, W, H);

        if (!imgEl) return;
        const drawSrc = processedImgEl || imgEl; // use sharpened if available

        // Draw image
        ctx.save();
        ctx.translate(W / 2 + pan.x, H / 2 + pan.y);
        ctx.rotate(rot * Math.PI / 180);
        ctx.scale(z * (fh ? -1 : 1), z * (fv ? -1 : 1));
        ctx.filter = `brightness(${br}%) contrast(${ct}%)`;
        ctx.drawImage(drawSrc, -drawSrc.width / 2, -drawSrc.height / 2);
        ctx.restore();
        ctx.filter = 'none';

        if (sel && sel.w > 2 && sel.h > 2) {
            // Dim overlay
            ctx.fillStyle = 'rgba(0,0,0,0.58)';
            ctx.fillRect(0, 0, W, sel.y);
            ctx.fillRect(0, sel.y, sel.x, sel.h);
            ctx.fillRect(sel.x + sel.w, sel.y, W - sel.x - sel.w, sel.h);
            ctx.fillRect(0, sel.y + sel.h, W, H - sel.y - sel.h);

            // Dashed border
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
            ctx.setLineDash([]);

            // Rule-of-thirds
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 0.5;
            [1/3, 2/3].forEach(t => {
                ctx.beginPath(); ctx.moveTo(sel.x + sel.w * t, sel.y); ctx.lineTo(sel.x + sel.w * t, sel.y + sel.h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sel.x, sel.y + sel.h * t); ctx.lineTo(sel.x + sel.w, sel.y + sel.h * t); ctx.stroke();
            });

            // L-brackets at corners
            const bl = Math.min(sel.w, sel.h, 22);
            ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2.5;
            [[sel.x, sel.y, 1, 1], [sel.x + sel.w, sel.y, -1, 1], [sel.x, sel.y + sel.h, 1, -1], [sel.x + sel.w, sel.y + sel.h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
                ctx.beginPath(); ctx.moveTo(cx + dx * bl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * bl); ctx.stroke();
            });

            // Mid handles
            [[sel.x + sel.w / 2, sel.y], [sel.x + sel.w / 2, sel.y + sel.h], [sel.x, sel.y + sel.h / 2], [sel.x + sel.w, sel.y + sel.h / 2]].forEach(([hx, hy]) => {
                ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(hx, hy, HR, 0, Math.PI * 2); ctx.fill();
            });
        }
    }, []);

    useEffect(() => {
        const loop = () => { draw(); rafRef.current = requestAnimationFrame(loop); };
        if (isOpen) { rafRef.current = requestAnimationFrame(loop); }
        return () => cancelAnimationFrame(rafRef.current);
    }, [isOpen, draw]);

    // Resize canvas + attach non-passive wheel listener
    useEffect(() => {
        const canvas = canvasRef.current, container = containerRef.current;
        if (!canvas || !container) return;
        const ro = new ResizeObserver(() => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            g.current.canvasW = canvas.width;
            g.current.canvasH = canvas.height;
        });
        ro.observe(container);

        // Must be {passive:false} so we can preventDefault on scroll (zoom)
        container.addEventListener('wheel', onWheelNative, { passive: false });
        return () => {
            ro.disconnect();
            container.removeEventListener('wheel', onWheelNative);
        };
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load image ──────────────────────────────────────────────────────────
    const loadSrc = (src, name, size) => {
        setFileName(name); setOrigSize(size); g.current.fileName = name;
        g.current.sel = null; setSelInfo(null);

        const setupImage = (blobOrDataUrl) => {
            const img = new Image();
            img.onload = () => {
                g.current.imgEl = img;
                const canvas = canvasRef.current;
                if (canvas) {
                    const fit = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85;
                    g.current.zoom = fit; setZoom(fit);
                    g.current.pan = { x: 0, y: 0 };
                }
            };
            img.src = blobOrDataUrl;
        };

        const isRemote = typeof src === 'string' &&
            src.startsWith('https://') &&
            !src.includes('localhost') &&
            !src.includes('127.0.0.1');

        if (isRemote) {
            // Fetch via backend proxy with auth token → blob URL (no canvas taint)
            const token = localStorage.getItem('token') || '';
            fetch(`/api/v1/public/proxy-image?url=${encodeURIComponent(src)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Proxy ${res.status}`);
                    return res.blob();
                })
                .then(blob => setupImage(URL.createObjectURL(blob)))
                .catch(() => {
                    // Last resort: load directly (canvas will be tainted, toBlob will fail)
                    console.warn('Proxy failed, loading directly — canvas export may fail');
                    setupImage(src);
                });
        } else {
            // data: URL or blob: URL — load directly, no CORS issue
            setupImage(src);
        }

        // Reset transforms
        g.current.rotation = 0; g.current.flipH = false; g.current.flipV = false;
        g.current.brightness = 100; g.current.contrast = 100; g.current.sharpen = 0;
        g.current.processedImgEl = null;
        setRotation(0); setFlipH(false); setFlipV(false); setBrightness(100); setContrast(100); setSharpen(0);
    };

    useEffect(() => { if (!file || !isOpen) return; const r = new FileReader(); r.onload = () => loadSrc(r.result, file.name, file.size); r.readAsDataURL(file); }, [file, isOpen]);
    useEffect(() => { if (!srcProp || !isOpen || file) return; loadSrc(srcProp, srcProp.split('/').pop().split('?')[0] || 'image.jpg', 0); }, [srcProp, isOpen]);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            const target = e.target;
            if (target.matches('input,textarea,select')) return;

            if (e.code === 'Space') {
                e.preventDefault();
                g.current.spaceDown = true;
                if (!g.current.dragging) setCursor('grab');
                return;
            }
            if (e.key === 'c' || e.key === 'C') { setToolMode('crop'); return; }
            if (e.key === 'h' || e.key === 'H') { setToolMode('pan');  return; }
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'Enter')  {
                e.preventDefault();
                // Trigger save if selection exists
                if (g.current.sel && g.current.sel.w > 5 && g.current.sel.h > 5) {
                    document.getElementById('img-editor-save-btn')?.click();
                }
                return;
            }
        };
        const onKeyUp = (e) => {
            if (e.code === 'Space') {
                g.current.spaceDown = false;
                if (!g.current.dragging) {
                    setCursor(g.current.toolMode === 'pan' ? 'grab' : 'crosshair');
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, [isOpen, onClose]);

    // Sync toolMode → g.current
    useEffect(() => {
        g.current.toolMode = toolMode;
        setCursor(toolMode === 'pan' ? 'grab' : 'crosshair');
    }, [toolMode]);

    // ── Mouse events ────────────────────────────────────────────────────────
    const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    const isPanGesture = (e) => e.button === 1 || g.current.spaceDown || g.current.toolMode === 'pan';

    const onMouseDown = (e) => {
        if (e.button === 1) e.preventDefault(); // prevent middle-click scroll
        const { x, y } = pos(e);
        const G = g.current;

        if (isPanGesture(e)) {
            // PAN mode: drag image around
            G.dragging = true; G.dragType = 'pan';
            G.dragStart = { x, y }; G.panAtStart = { ...G.pan };
            setCursor('grabbing');
            return;
        }

        // CROP mode (left click)
        if (e.button !== 0) return;
        const handle = hitHandle(x, y, G.sel);
        if (handle) {
            G.dragging = true; G.dragType = handle;
            G.dragStart = { x, y }; G.selAtStart = { ...G.sel };
        } else if (inSel(x, y, G.sel)) {
            G.dragging = true; G.dragType = 'move';
            G.dragStart = { x, y }; G.selAtStart = { ...G.sel };
        } else {
            G.dragging = true; G.dragType = 'draw';
            G.dragStart = { x, y }; G.sel = { x, y, w: 0, h: 0 };
        }
    };

    const onMouseMove = (e) => {
        const { x, y } = pos(e);
        const G = g.current;

        if (G.dragging && G.dragType === 'pan') {
            const dx = x - G.dragStart.x, dy = y - G.dragStart.y;
            G.pan = { x: G.panAtStart.x + dx, y: G.panAtStart.y + dy };
            setPan({ x: G.pan.x, y: G.pan.y });
            return;
        }

        // Update cursor when idle
        if (!G.dragging) {
            if (G.spaceDown || G.toolMode === 'pan') { setCursor('grab'); return; }
            const h = hitHandle(x, y, G.sel);
            setCursor(h ? CURSORS[h] : (inSel(x, y, G.sel) ? 'move' : 'crosshair'));
        }

        if (!G.dragging) return;
        const dx = x - G.dragStart.x, dy = y - G.dragStart.y;
        if (G.dragType === 'draw') {
            G.sel = norm({ x: G.dragStart.x, y: G.dragStart.y, w: x - G.dragStart.x, h: y - G.dragStart.y });
        } else if (G.dragType === 'move') {
            G.sel = { x: G.selAtStart.x + dx, y: G.selAtStart.y + dy, w: G.selAtStart.w, h: G.selAtStart.h };
        } else {
            const s = { ...G.selAtStart }, t = G.dragType;
            if (t.includes('e')) s.w += dx; if (t.includes('s')) s.h += dy;
            if (t.includes('w')) { s.w -= dx; s.x += dx; } if (t.includes('n')) { s.h -= dy; s.y += dy; }
            G.sel = norm(s);
        }
        if (G.sel && G.sel.w > 2 && G.sel.h > 2) setSelInfo({ w: Math.round(G.sel.w / G.zoom), h: Math.round(G.sel.h / G.zoom) });
    };

    const onMouseUp = (e) => {
        const G = g.current;
        const wasGrabbing = G.dragType === 'pan';
        G.dragging = false; G.dragType = null;
        if (wasGrabbing) {
            setCursor(G.spaceDown ? 'grab' : (G.toolMode === 'pan' ? 'grab' : 'crosshair'));
            return;
        }
        if (G.sel && (G.sel.w < 5 || G.sel.h < 5)) { G.sel = null; setSelInfo(null); }
    };

    const onWheelNative = (e) => {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const G = g.current;
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const nz = Math.max(0.1, Math.min(20, G.zoom * factor));
        const W = canvasRef.current?.width || 0, H = canvasRef.current?.height || 0;
        const cx = W / 2, cy = H / 2;
        G.pan = { x: (G.pan.x - (x - cx)) * (nz / G.zoom) + (x - cx), y: (G.pan.y - (y - cy)) * (nz / G.zoom) + (y - cy) };
        G.zoom = nz; setZoom(nz);
    };

    // ── Save ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const G = g.current;
        if (!G.imgEl || !G.sel || G.sel.w < 5 || G.sel.h < 5) return;
        setProcessing(true);
        try {
            const W = canvasRef.current?.width || 800, H = canvasRef.current?.height || 600;
            const rad = G.rotation * Math.PI / 180;
            const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
            const hrW = G.imgEl.width * cos + G.imgEl.height * sin;
            const hrH = G.imgEl.width * sin + G.imgEl.height * cos;

            // Render full transformed image at native res
            const fc = document.createElement('canvas');
            fc.width = Math.max(1, Math.round(hrW));
            fc.height = Math.max(1, Math.round(hrH));
            const fctx = fc.getContext('2d');
            fctx.filter = `brightness(${G.brightness}%) contrast(${G.contrast}%)`;
            fctx.translate(fc.width / 2, fc.height / 2);
            fctx.rotate(rad);
            fctx.scale(G.flipH ? -1 : 1, G.flipV ? -1 : 1);
            fctx.drawImage(G.imgEl, -G.imgEl.width / 2, -G.imgEl.height / 2);

            // Map viewport selection → full canvas coords
            const toF = (vx, vy) => ({
                x: (vx - (W / 2 + G.pan.x)) / G.zoom + fc.width / 2,
                y: (vy - (H / 2 + G.pan.y)) / G.zoom + fc.height / 2,
            });
            const { x: fx, y: fy } = toF(G.sel.x, G.sel.y);
            const fw = G.sel.w / G.zoom, fh = G.sel.h / G.zoom;
            const cx0 = Math.max(0, Math.round(fx)), cy0 = Math.max(0, Math.round(fy));
            const cw = Math.min(Math.round(fw), fc.width - cx0);
            const ch = Math.min(Math.round(fh), fc.height - cy0);

            if (cw < 1 || ch < 1) {
                alert('ক্রপ এলাকা খুব ছোট বা ছবির বাইরে। আবার চেষ্টা করুন।');
                setProcessing(false);
                return;
            }

            const cc = document.createElement('canvas');
            cc.width = cw; cc.height = ch;
            cc.getContext('2d').drawImage(fc, cx0, cy0, cw, ch, 0, 0, cw, ch);

            // Apply sharpen to cropped region if needed
            if (G.sharpen > 0) {
                try {
                    const sctx = cc.getContext('2d');
                    const sid = sctx.getImageData(0, 0, cc.width, cc.height);
                    const sd = sid.data, sw = cc.width, sh = cc.height;
                    const sout = new Uint8ClampedArray(sd.length);
                    const ss = G.sharpen * 0.25;
                    for (let y = 0; y < sh; y++) {
                        for (let x = 0; x < sw; x++) {
                            const i = (y * sw + x) * 4;
                            if (x === 0 || y === 0 || x === sw-1 || y === sh-1) {
                                sout[i]=sd[i]; sout[i+1]=sd[i+1]; sout[i+2]=sd[i+2]; sout[i+3]=sd[i+3]; continue;
                            }
                            for (let c = 0; c < 3; c++) {
                                sout[i+c] = Math.max(0, Math.min(255,
                                    -ss*sd[((y-1)*sw+x)*4+c] + -ss*sd[(y*sw+x-1)*4+c] +
                                    (1+4*ss)*sd[i+c] +
                                    -ss*sd[(y*sw+x+1)*4+c] + -ss*sd[((y+1)*sw+x)*4+c]
                                ));
                            }
                            sout[i+3] = sd[i+3];
                        }
                    }
                    sctx.putImageData(new ImageData(sout, sw, sh), 0, 0);
                } catch(e) { /* skip if tainted */ }
            }

            let blob = await new Promise((res, rej) => {
                cc.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.95);
            });
            let final = new File([blob], G.fileName || 'crop.jpg', { type: 'image/jpeg' });
            if (final.size > maxSizeKB * 1024) {
                final = await imageCompression(final, { maxSizeMB: maxSizeKB / 1024, maxWidthOrHeight: 2400, useWebWorker: true });
            }
            onSave(final, URL.createObjectURL(final));
            onClose();
        } catch (err) {
            console.error('Crop failed:', err);
            alert(`সেভ ব্যর্থ হয়েছে: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    // ── Reset (also resets sharpen) ──────────────────────────────────────────
    const handleReset = () => {
        setRotation(0); setFlipH(false); setFlipV(false);
        setBrightness(100); setContrast(100); setSharpen(0);
        g.current.rotation = 0; g.current.flipH = false; g.current.flipV = false;
        g.current.brightness = 100; g.current.contrast = 100; g.current.sharpen = 0;
        g.current.processedImgEl = null;
    };

    // Slider helper
    if (!isOpen) return null;
    const Slider = ({ label, value, min, max, step, color, unit = '', onChange }) => (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
                <span className={`text-[10px] font-mono ${color}`}>{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: color.replace('text-', '') }}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2" onClick={onClose}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <div className="relative w-full max-w-5xl max-h-[97vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                style={{ background: '#0f1117' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0" style={{ background: '#161820' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.6)]" />
                        <div>
                            <h2 className="text-white font-bold text-sm">প্রফেশনাল ইমেজ এডিটর</h2>
                            <p className="text-white/35 text-[10px] mt-0.5">{fileName} • {fmtSize(origSize)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selInfo && <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-lg">✂️ {selInfo.w} × {selInfo.h} px</span>}

                        {/* Tool mode toggle */}
                        <div className="flex rounded-lg overflow-hidden border border-white/10">
                            <button onClick={() => setToolMode('crop')}
                                title="ক্রপ মোড (C)"
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-colors ${toolMode === 'crop' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}>
                                <Crop size={12} /> ক্রপ
                            </button>
                            <button onClick={() => setToolMode('pan')}
                                title="হ্যান্ড মোড (H) — ছবি সরান"
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-colors ${toolMode === 'pan' ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}>
                                <Move size={12} /> হ্যান্ড
                            </button>
                        </div>

                        <button onClick={() => changeRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-amber-300 bg-amber-400/10 border border-amber-400/20 text-[11px] font-bold hover:bg-amber-400/20 transition-colors">
                            <Upload size={11} /> ছবি বদলান
                        </button>
                        <input ref={changeRef} type="file" accept="image/*" className="hidden" onChange={e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const r = new FileReader(); r.onload = () => loadSrc(r.result, f.name, f.size); r.readAsDataURL(f); e.target.value = '';
                        }} />
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"><X size={16} /></button>
                    </div>
                </div>

                {/* Canvas */}
                <div ref={containerRef} className="relative flex-1 min-h-[380px] overflow-hidden select-none"
                    style={{ cursor }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    {!g.current.imgEl && <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">লোড হচ্ছে...</div>}
                    {g.current.imgEl && !g.current.sel && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 border border-white/10 text-white/50 text-[11px] px-4 py-2 rounded-xl backdrop-blur-sm pointer-events-none flex items-center gap-2">
                            <span className="text-indigo-400">✂️</span> ক্লিক করে ড্র্যাগ করুন — ক্রপ এলাকা আঁকুন • স্ক্রল করে জুম করুন
                        </div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 border border-white/10 text-white/40 text-[10px] font-mono px-2 py-1 rounded-lg pointer-events-none">
                        {zoom.toFixed(2)}× • scroll=zoom
                    </div>
                </div>

                {/* Controls */}
                <div className="shrink-0 border-t border-white/10 px-5 py-3 grid grid-cols-2 md:grid-cols-6 gap-3 items-end" style={{ background: '#13151c' }}>
                    <Slider label="ঘূর্ণন" value={rotation} min={-180} max={180} step={1} color="text-amber-400" unit="°"
                        onChange={v => { setRotation(v); g.current.rotation = v; }} />
                    <Slider label="জুম" value={parseFloat(zoom.toFixed(2))} min={0.1} max={20} step={0.05} color="text-indigo-400" unit="×"
                        onChange={v => { setZoom(v); g.current.zoom = v; }} />
                    <Slider label="উজ্জ্বলতা" value={brightness} min={50} max={200} step={1} color="text-yellow-400" unit="%"
                        onChange={v => { setBrightness(v); g.current.brightness = v; }} />
                    <Slider label="কনট্রাস্ট" value={contrast} min={50} max={200} step={1} color="text-rose-400" unit="%"
                        onChange={v => { setContrast(v); g.current.contrast = v; }} />
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">শার্পনেস</span>
                            <span className={`text-[10px] font-mono ${sharpen > 0 ? 'text-cyan-400' : 'text-white/20'}`}>{sharpen === 0 ? 'বন্ধ' : `+${sharpen}`}</span>
                        </div>
                        <input type="range" min={0} max={5} step={1} value={sharpen}
                            onChange={e => setSharpen(Number(e.target.value))}
                            className="w-full h-1 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: '#22d3ee' }}
                        />
                        {sharpen > 0 && <p className="text-[9px] text-cyan-400/60">প্রক্রিয়াকরণ হচ্ছে...</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-1.5">
                            <button onClick={() => { const v = rotation - 90; setRotation(v); g.current.rotation = v; }} className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"><RotateCcw size={13} /></button>
                            <button onClick={() => { const v = rotation + 90; setRotation(v); g.current.rotation = v; }} className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"><RotateCw size={13} /></button>
                            <button onClick={() => { setFlipH(f => !f); g.current.flipH = !g.current.flipH; }} className={`flex-1 p-2 rounded-lg border flex items-center justify-center transition-colors ${flipH ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}><FlipHorizontal size={13} /></button>
                            <button onClick={() => { setFlipV(f => !f); g.current.flipV = !g.current.flipV; }} className={`flex-1 p-2 rounded-lg border flex items-center justify-center transition-colors ${flipV ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}><FlipVertical size={13} /></button>
                        </div>
                        <button onClick={handleReset}
                            className="w-full flex items-center justify-center gap-1 p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 text-[10px] font-medium transition-colors">
                            <RefreshCw size={10} /> রিসেট
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 shrink-0 border-t border-white/10" style={{ background: '#0f1117' }}>
                    <p className="text-[10px] text-white/20">
                        {toolMode === 'pan'
                            ? '✋ হ্যান্ড মোড: ড্র্যাগ করে ছবি সরান • স্ক্রল = জুম • ক্রপ করতে উপরে "ক্রপ" বাটন ক্লিক করুন'
                            : '✂️ ড্র্যাগ = ক্রপ আঁকুন • স্ক্রল = জুম • Space চেপে ড্র্যাগ = ছবি সরান • মিডল ক্লিক = ছবি সরান'
                        }
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors">বাতিল</button>
                        <button id="img-editor-save-btn" onClick={handleSave} disabled={processing || !selInfo}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 shadow-lg shadow-indigo-900/50">
                            {processing ? <><Loader2 size={15} className="animate-spin" /> সংরক্ষণ...</> : <><Check size={15} /> ক্রপ ও সংরক্ষণ</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;
