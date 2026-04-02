import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from '@headlessui/react';
import { QrCode, X } from 'lucide-react';

export default function BookingQRCode({ booking }) {
  const [open, setOpen] = useState(false);

  if (booking.status !== 'APPROVED') return null;

  const qrData = JSON.stringify({
    bookingId: booking.id,
    resource: booking.resourceName,
    startTime: booking.startTime,
    endTime: booking.endTime,
    user: booking.userName,
    verificationHash: btoa(`booking-${booking.id}-${booking.startTime}`),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
      >
        <QrCode className="h-4 w-4" />
        QR Code
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Booking Verification
              </Dialog.Title>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={qrData} size={200} level="H" />
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-900 dark:text-white">{booking.resourceName}</p>
              <p>{new Date(booking.startTime).toLocaleString()}</p>
              <p>to {new Date(booking.endTime).toLocaleString()}</p>
              <p className="mt-2 text-xs">Show this QR code at the venue for verification</p>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
