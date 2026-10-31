import { Suspense } from 'react';
import Verify from '@/screens/Verify';

// Verify reads ?success=&appointmentId= from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
