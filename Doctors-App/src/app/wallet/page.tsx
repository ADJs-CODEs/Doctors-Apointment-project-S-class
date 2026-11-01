import { Suspense } from 'react';
import Wallet from '@/screens/Wallet';

// Wallet reads ?topup=&session_id= (back from Stripe), which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <Wallet />
    </Suspense>
  );
}
