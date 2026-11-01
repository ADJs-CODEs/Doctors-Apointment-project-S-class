import { Suspense } from 'react';
import Appointments from '@/screens/Appointments';

// Appointments reads ?type=video (from "Schedule video call" in Messages), which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <Appointments />
    </Suspense>
  );
}