import React, { useRef, useEffect, useState } from 'react';

export default function ImageEditor({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);

  const [img, setImg] = useState(null);
  const [cropW, setCropW] = useState(300);
  const [cropH, setCropH] = useState(200);

  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [lockRatio, setLockRatio] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const PREVIEW = 340;

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      setImg(image);

      const w = Math.min(image.width, 360);
      const h = Math.min(image.height, Math.round(w * (2 / 3)));

      setCropW(w);
      setCropH(h);

      setOffset({ x: 0, y: 0 });
    };

    image.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw preview
  useEffect(() => {
    if (!img || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const scale = PREVIEW / Math.max(cropW, cropH);

    const pw = Math.round(cropW * scale);
    const ph = Math.round(cropH * scale);

    canvas.width = pw;
    canvas.height = ph;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, pw, ph);

    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      cropW,
      cropH,
      0,
      0,
      pw,
      ph
    );

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;

    [1, 2].forEach(i => {
      ctx.beginPath();
      ctx.moveTo((pw / 3) * i, 0);
      ctx.lineTo((pw / 3) * i, ph);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, (ph / 3) * i);
      ctx.lineTo(pw, (ph / 3) * i);
      ctx.stroke();
    });
  }, [img, offset, cropW, cropH]);

  const clamp = (x, y, w, h, image) => ({
    x: Math.max(0, Math.min(image.width - w, x)),
    y: Math.max(0, Math.min(image.height - h, y)),
  });

  const handleMouseDown = (e) => {
    setDragging(true);

    setDragStart({
      mx: e.clientX,
      my: e.clientY,
      ox: offset.x,
      oy: offset.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart || !img) return;

    const scale = Math.max(cropW, cropH) / PREVIEW;

    const ox =
      dragStart.ox +
      (dragStart.mx - e.clientX) * scale;

    const oy =
      dragStart.oy +
      (dragStart.my - e.clientY) * scale;

    setOffset(clamp(ox, oy, cropW, cropH, img));
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleWidthChange = (val) => {
    if (!img) return;

    const w = Math.max(50, Math.min(img.width, val));

    if (lockRatio && cropH > 0) {
      const ratio = cropH / cropW;

      const h = Math.max(
        50,
        Math.min(img.height, Math.round(w * ratio))
      );

      setCropH(h);

      setOffset(prev =>
        clamp(prev.x, prev.y, w, h, img)
      );
    } else {
      setOffset(prev =>
        clamp(prev.x, prev.y, w, cropH, img)
      );
    }

    setCropW(w);
  };

  const handleHeightChange = (val) => {
    if (!img) return;

    const h = Math.max(50, Math.min(img.height, val));

    if (lockRatio && cropW > 0) {
      const ratio = cropW / cropH;

      const w = Math.max(
        50,
        Math.min(img.width, Math.round(h * ratio))
      );

      setCropW(w);

      setOffset(prev =>
        clamp(prev.x, prev.y, w, h, img)
      );
    } else {
      setOffset(prev =>
        clamp(prev.x, prev.y, cropW, h, img)
      );
    }

    setCropH(h);
  };

  const handleConfirm = () => {
    if (!img) return;

    const out = document.createElement('canvas');

    out.width = cropW;
    out.height = cropH;

    const ctx = out.getContext('2d');

    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    out.toBlob(blob => {
      const croppedFile = new File(
        [blob],
        'category.jpg',
        { type: 'image/jpeg' }
      );

      onConfirm(
        croppedFile,
        URL.createObjectURL(blob)
      );
    }, 'image/jpeg', 0.92);
  };

  const maxW = img?.width || 800;
  const maxH = img?.height || 800;

  return (
    <div style={styles.editorOverlay}>
      <div style={styles.editorBox}>
        <h3 style={styles.editorTitle}>🖼️ Crop & Resize Image</h3>

        <p style={styles.editorHint}>Drag to reposition · Adjust width & height freely</p>

        {img ? (
          <>
            <canvas
              ref={canvasRef}
              style={{
                ...styles.previewCanvas,
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Dimension controls */}
            <div style={styles.dimGrid}>
              <div style={styles.dimBlock}>
                <div style={styles.dimLabelRow}>
                  <span style={styles.dimLabel}>Width</span>
                  <span style={styles.dimVal}>{cropW}px</span>
                </div>

                <input
                  type="range"
                  min={50}
                  max={maxW}
                  value={cropW}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>

              <button
                type="button"
                title={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                onClick={() => setLockRatio(v => !v)}
                style={{
                  ...styles.lockBtn,
                  background: lockRatio ? '#4f46e5' : '#e5e7eb',
                }}
              >
                {lockRatio ? '🔒' : '🔓'}
              </button>

              <div style={styles.dimBlock}>
                <div style={styles.dimLabelRow}>
                  <span style={styles.dimLabel}>Height</span>
                  <span style={styles.dimVal}>{cropH}px</span>
                </div>

                <input
                  type="range"
                  min={50}
                  max={maxH}
                  value={cropH}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>
            </div>

            <div style={styles.presetRow}>
              {[
                { label: '16:9', w: 16, h: 9 },
                { label: '4:3', w: 4, h: 3 },
                { label: '3:2', w: 3, h: 2 },
                { label: '1:1', w: 1, h: 1 },
                { label: '2:3', w: 2, h: 3 },
              ].map(({ label, w, h }) => (
                <button
                  key={label}
                  type="button"
                  style={styles.presetBtn}
                  onClick={() => {
                    if (!img) return;

                    const base = Math.min(img.width, img.height, 600);

                    const nw = Math.min(img.width, Math.round(base * (w / Math.max(w, h))));

                    const nh = Math.min(img.height, Math.round(base * (h / Math.max(w, h))));

                    setCropW(nw);
                    setCropH(nh);

                    setOffset(prev => clamp(prev.x, prev.y, nw, nh, img));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={styles.editorMeta}>Original: {img.width}×{img.height} · Crop: {cropW}×{cropH}</div>
          </>
        ) : (
          <div style={styles.editorLoading}>Loading image…</div>
        )}

        <div style={styles.editorActions}>
          <button style={styles.btnCancel} onClick={onCancel}>Cancel</button>
          <button style={styles.btnConfirm} onClick={handleConfirm} disabled={!img}>Use this crop</button>
        </div>
      </div>
    </div>
  );
}

// Inline styles reused from Categories for editor
const styles = {
  editorOverlay: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, background: 'rgba(0,0,0,0.45)' },
  editorBox: { width: 520, maxWidth: '95%', background: '#0f172a', padding: 16, borderRadius: 10, color: '#fff' },
  editorTitle: { margin: 0 },
  editorHint: { color: '#9ca3af', marginTop: 6 },
  previewCanvas: { width: '100%', maxWidth: 440, height: 'auto', borderRadius: 8, background: '#111827' },
  dimGrid: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 },
  dimBlock: { flex: 1 },
  dimLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dimLabel: { color: '#cbd5e1' },
  dimVal: { color: '#94a3b8' },
  slider: { width: '100%' },
  lockBtn: { width: 44, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer' },
  presetRow: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  presetBtn: { padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' },
  editorMeta: { marginTop: 10, color: '#94a3b8' },
  editorLoading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  editorActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  btnCancel: { padding: '8px 12px', borderRadius: 8, background: '#e5e7eb', border: 'none', cursor: 'pointer' },
  btnConfirm: { padding: '8px 12px', borderRadius: 8, background: '#4f46e5', border: 'none', cursor: 'pointer', color: '#fff' },
};
