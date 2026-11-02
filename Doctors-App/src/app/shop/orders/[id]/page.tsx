import { Suspense } from 'react';
import { ShopOrderDetails } from '@/screens/ShopOrders';

// reads ?session_id= (back from Stripe), which needs a Suspense boundary
export default function Page() {
  return (
    <Suspense>
      <ShopOrderDetails />
    </Suspense>
  );
}
