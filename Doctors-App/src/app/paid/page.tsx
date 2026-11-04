'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Where a card payment started in the mobile app lands. Public on purpose: the phone's browser
 * isn't logged in to the website. The app checks the payment itself when the person goes back.
 */
function Paid() {
  const params = useSearchParams();
  const ok = params.get('success') === 'true';
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl ${ok ? 'bg-teal-50' : 'bg-slate-100'}`}>{ok ? '✓' : '×'}</div>
        <h1 className="text-2xl font-black text-slate-900 mt-5">{ok ? 'Payment received' : 'Payment not completed'}</h1>
        <p className="text-slate-500 mt-2">
          {ok ? 'You can close this page and go back to the app. Your booking will show as confirmed.' : 'Nothing was charged. Go back to the app to try again; your time is held for a little while.'}
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Paid />
    </Suspense>
  );
}
