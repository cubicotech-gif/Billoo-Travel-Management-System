'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to dashboard (no authentication required)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">Billoo Travel</h1>
          <p className="text-gray-600 mt-2">Management System</p>
          <p className="text-gray-500 mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    </div>
  );
}
