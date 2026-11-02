import { Suspense } from 'react';
import Payouts from '@/screens/Admin/Payouts';

// reads ?tab=, which needs a Suspense boundary
export default function Page() {
  return (
    <Suspense>
      <Payouts />
    </Suspense>
  );
}
