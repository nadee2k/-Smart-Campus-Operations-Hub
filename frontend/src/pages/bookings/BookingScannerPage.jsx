import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { bookingService } from '../../services/bookingService';
import { CheckCircle2, XCircle, QrCode, RefreshCcw, Loader2 } from 'lucide-react';

export default function BookingScannerPage() {
  const [status, setStatus] = useState('SCANNING'); // SCANNING, LOADING, RESULT
  const [bookingData, setBookingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status !== 'SCANNING') return;

    // Use html5-qrcode's built-in UI widget
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [0, 1] // 0: Camera, 1: File
    }, false);

    scanner.render((decodedText) => {
      try {
        const data = JSON.parse(decodedText);
        if (data.bookingId) {
          scanner.clear();
          verifyBooking(data.bookingId);
        } else {
          setError("Invalid QR code format. Not a recognized campus pass.");
          setStatus('RESULT');
          scanner.clear();
        }
      } catch (e) {
        // generic read, ignore until valid JSON
      }
    }, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [status]);

  const verifyBooking = async (id) => {
    setStatus('LOADING');
    try {
      const res = await bookingService.getById(id);
      setBookingData(res.data);
      setStatus('RESULT');
    } catch (e) {
      setError("Failed to verify booking in the system. It may not exist.");
      setStatus('RESULT');
    }
  };

  const reset = () => {
    setBookingData(null);
    setError(null);
    setStatus('SCANNING');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm">
          <QrCode className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Reader</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scan or upload booking QR codes for verification</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm min-h-[400px]">
        {status === 'SCANNING' && (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            <div id="qr-reader" className="w-full"></div>
            <style>{`
              #qr-reader { border: none !important; }
              #qr-reader__dashboard_section_csr span { color: inherit !important; }
              #qr-reader__dashboard_section_swaplink { color: #6366f1 !important; text-decoration: none !important; margin-top: 10px; display: inline-block; }
              #qr-reader__camera_selection { padding: 8px; border-radius: 8px; border: 1px solid #d1d5db; margin-bottom: 15px; }
              #qr-reader button { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: 500; margin: 4px; }
              #qr-reader button:hover { background: #4f46e5; }
              html.dark #qr-reader__camera_selection { background: #1f2937; border-color: #374151; color: white; }
              html.dark #qr-reader { color: #d1d5db; }
            `}</style>
          </div>
        )}

        {status === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-600 mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Contacting server...</p>
            <p className="text-sm text-gray-500">Verifying the generated physical pass.</p>
          </div>
        )}

        {status === 'RESULT' && (
          <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in duration-300">
            {error ? (
              <>
                <XCircle className="h-20 w-20 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Code</h2>
                <p className="text-red-500 mb-6">{error}</p>
              </>
            ) : bookingData?.status === 'APPROVED' ? (
              <>
                {/* The "brightly green" requirement */}
                <CheckCircle2 className="h-28 w-28 text-emerald-500 mb-4 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]" />
                <h2 className="text-3xl font-extrabold text-emerald-500 mb-2 drop-shadow-sm">
                  YES, APPROVED BOOKING
                </h2>
                
                <div className="mt-8 text-left bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-6 rounded-2xl w-full max-w-sm shadow-sm ring-1 ring-emerald-500/10">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">Pass Holder</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{bookingData.userName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">Resource</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{bookingData.resourceName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">Schedule</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(bookingData.startTime).toLocaleString()} <span className="text-gray-400 font-normal mx-1">to</span> {new Date(bookingData.endTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-24 w-24 text-amber-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded-xl">
                  <p className="font-semibold mb-1">Booking is NOT approved.</p>
                  <p className="text-sm">Current Status: {bookingData?.status}</p>
                </div>
              </>
            )}

            <button
              onClick={reset}
              className="mt-10 flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-xl transition-all font-semibold shadow-lg shadow-gray-900/20 dark:shadow-white/10 hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-5 w-5" />
              Scan Another Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
