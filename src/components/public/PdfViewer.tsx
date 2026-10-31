import React, { useEffect, useRef, useState } from 'react';

/** Dotted border box of the certificate page (pt, top-origin) and the gap kept around it (css px). */
const BOX = { x: 49.5, y: 39.5, w: 742, h: 540 };
const PAD = 12;
const ZOOM = 1.22; // page is drawn this much wider than the card, so it scrolls like the original viewer
const MIN_SCALE = 0.8; // below this (phones) the page is not shrunk further

/** Scrollable first-page PDF render (pdf.js) so the certificate looks identical in every browser. */
export const PdfViewer: React.FC<{ url: string }> = ({ url }) => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const pdf = await pdfjs.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        if (cancelled || !canvas.current || !box.current) return;
        const scale = Math.max(MIN_SCALE, ((width - 2 * PAD) / BOX.w) * ZOOM);
        const dpr = window.devicePixelRatio || 1;
        const cssW = BOX.w * scale + 2 * PAD, cssH = BOX.h * scale + 2 * PAD;
        const vp = page.getViewport({ scale: scale * dpr, offsetX: (PAD - BOX.x * scale) * dpr, offsetY: (PAD - BOX.y * scale) * dpr });
        const c = canvas.current;
        c.width = Math.round(cssW * dpr);
        c.height = Math.round(cssH * dpr);
        c.style.width = `${cssW}px`;
        c.style.height = `${cssH}px`;
        await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url, width]);

  return (
    <div className="qr-pdf" ref={box} role="document" aria-label="Certificate">
      {error ? <p className="qr-pdf-error">Could not display the certificate here. Use “Open in a new tab”.</p> : <canvas ref={canvas} />}
    </div>
  );
};
