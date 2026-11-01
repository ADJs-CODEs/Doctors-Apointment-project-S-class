import { Suspense } from 'react';
import Messages from '@/screens/Messages';

// Messages reads ?doctor=&appointment=&medicine= from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}
