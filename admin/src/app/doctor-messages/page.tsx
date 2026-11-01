import { Suspense } from 'react';
import DoctorMessages from '@/screens/Doctor/DoctorMessages';

// DoctorMessages reads ?patient=&appointment= from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <DoctorMessages />
    </Suspense>
  );
}
