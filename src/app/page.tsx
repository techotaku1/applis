'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@clerk/nextjs';

import ClientPage from '~/components/ClientPage';
import Header from '~/components/Header';
import { SWRProvider } from '~/components/SWRProvider';

import Loading from './loading';

export default function HomePage() {
  const { isLoaded } = useUser();
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      // Add a small delay to ensure Clerk data is fully synced
      const timer = setTimeout(() => {
        setIsFullyLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Show loading state while checking auth or waiting for full load
  if (!isLoaded || !isFullyLoaded) {
    return <Loading />;
  }

  return (
    <SWRProvider>
      <Header />
      <div className="pt-16">
        <ClientPage />
      </div>
    </SWRProvider>
  );
}
