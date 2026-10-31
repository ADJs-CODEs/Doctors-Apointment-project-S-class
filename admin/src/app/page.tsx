'use client';

import { useContext } from 'react';
import { AdminContext } from '@/context/AdminContext';
import { Navigate } from '@/lib/navigation';
import type { AdminContextType } from '@/types';

// "/" sends admins to their dashboard and doctors to theirs.
export default function Page() {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  return <Navigate to={aToken ? '/admin-dashboard' : '/doctor-dashboard'} />;
}
