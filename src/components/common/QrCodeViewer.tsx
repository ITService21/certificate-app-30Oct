import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Check, Copy } from 'lucide-react';

interface QrCodeViewerProps {
  value: string; // The 14-digit unique number or verification URL
  uniqueNumber: string;
  size?: number;
  showDownload?: boolean;
  dark?: boolean;
  className?: string;
}

export const QrCodeViewer: React.FC<QrCodeViewerProps> = ({
  value,
  uniqueNumber,
  size = 140,
  showDownload = true,
  dark = false,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate QR code for the verification link / number
    const verificationPayload = value.startsWith('http') 
      ? value 
      : `${window.location.origin}/?verify=${value}`;

    QRCode.toDataURL(verificationPayload, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0B1F4B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('Error rendering QR code', err);
      });
  }, [value, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `CTC_QR_${uniqueNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(uniqueNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F37] ${className}`}>
      {/* Corner Bracket Frame for Maritime Security feel */}
      <div className="relative p-2 bg-white rounded shadow-xs border border-slate-100">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for ${uniqueNumber}`}
            width={size}
            height={size}
            className="block"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-slate-50 text-xs text-slate-400"
          >
            Generating QR...
          </div>
        )}
      </div>

      {/* 14-digit number underneath */}
      <div className="mt-2 text-center w-full">
        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400">
          Unique Verification No.
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="font-mono tnum text-xs font-bold text-[#0B1F4B] dark:text-sky-300 tracking-wider">
            {uniqueNumber}
          </span>
          <button
            onClick={handleCopyNumber}
            title="Copy 14-digit number"
            className="text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white transition-colors p-0.5 rounded cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {showDownload && (
        <button
          onClick={handleDownload}
          className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
        >
          <Download className="w-3 h-3 text-[#0A7AC1]" />
          <span>Save QR Matrix</span>
        </button>
      )}
    </div>
  );
};
