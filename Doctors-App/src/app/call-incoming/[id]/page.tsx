'use client';

import { useCalls } from '@/components/calls/CallLayer';
import { Link } from '@/lib/navigation';

/**
 * Where an "incoming call" device notification opens. The call layer picks up the ringing call
 * by itself, so this page only covers the moment before it does, or a call that already ended.
 */
export default function Page() {
  const { call } = useCalls();
  return (
    <div className="max-w-md mx-auto py-20 px-4 text-center">
      <p className="text-xl font-black text-slate-900">{call ? 'Connecting your call…' : 'This call has ended'}</p>
      {!call && (
        <Link to="/messages" className="inline-block mt-4 text-sm font-bold text-teal-600 hover:text-teal-700">
          Go to your messages
        </Link>
      )}
    </div>
  );
}
