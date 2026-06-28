'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth) {
      router.push('/chat');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-blue-500 to-blue-600">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
    </div>
  );
}
