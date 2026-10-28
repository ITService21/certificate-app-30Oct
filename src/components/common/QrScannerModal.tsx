import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const { openCertificateById, certificates, showToast } = useApp();
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera API is not supported on this browser or environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCamera(true);
    } catch (err: any) {
      console.warn('Camera access unavailable or declined:', err);
      setHasCamera(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. You can still test with the simulated scans or drop a photo below.'
          : 'Unable to connect to camera hardware. Please check device permissions.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleSimulateScan = (uniqueNum: string) => {
    stopCamera();
    onClose();
    showToast(`QR Code scanned: ${uniqueNum}`, 'success');
    openCertificateById(uniqueNum);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E172A]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#0A7AC1]" />
            <span className="font-bold text-sm tracking-tight text-[#0B1F4B] dark:text-white">
              Scan Maritime Certificate QR
            </span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative bg-black flex items-center justify-center min-h-[260px] overflow-hidden">
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-[260px] object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
              <Camera className="w-12 h-12 text-slate-500 mb-2 stroke-1" />
              <p className="text-xs max-w-xs text-slate-400">
                {cameraError || 'Camera initializing or simulated preview'}
              </p>
            </div>
          )}

          {/* Optical Targeting Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 border-2 border-[#0A7AC1]/70 rounded-lg">
              {/* Corner markings */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#0A7AC1]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#0A7AC1]" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#0A7AC1]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#0A7AC1]" />
              {/* Laser scanner animation */}
              <div className="absolute inset-x-2 top-0 h-0.5 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse transition-all duration-1000" />
            </div>
          </div>

          <div className="absolute bottom-3 inset-x-0 text-center">
            <span className="inline-block px-3 py-1 bg-black/60 backdrop-blur-xs text-[11px] text-white rounded-full font-medium">
              Align certificate QR code within frame
            </span>
          </div>
        </div>

        {/* Quick Simulator Bar for Instant Testing */}
        <div className="p-4 bg-slate-50 dark:bg-[#0F1A2E] border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Instant Test QR Scans:
            </span>
            <span className="text-[10px] text-slate-400">Tap to test verification state</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleSimulateScan('32625474824291')}
              className="p-2 text-left bg-white dark:bg-[#15233E] border border-emerald-300 dark:border-emerald-800/60 rounded hover:border-emerald-500 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Valid Example</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                ELBY MATHEW
              </p>
              <p className="text-[9px] font-mono text-slate-400 tnum">32625474824291</p>
            </button>

            <button
              onClick={() => handleSimulateScan('84920173645102')}
              className="p-2 text-left bg-white dark:bg-[#15233E] border border-amber-300 dark:border-amber-800/60 rounded hover:border-amber-500 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Expiring Soon</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                NIKOLAOS V.
              </p>
              <p className="text-[9px] font-mono text-slate-400 tnum">84920173645102</p>
            </button>

            <button
              onClick={() => handleSimulateScan('91827364501928')}
              className="p-2 text-left bg-white dark:bg-[#15233E] border border-red-300 dark:border-red-800/60 rounded hover:border-red-500 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Revoked Status</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                DARIUSZ KOWALSKI
              </p>
              <p className="text-[9px] font-mono text-slate-400 tnum">91827364501928</p>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-[#131F37]">
          <span>Continental Training Center S.A. Verification Engine</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
