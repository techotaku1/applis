'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useUser } from '@clerk/nextjs';

import ClientPage from '~/components/ClientPage';
import Header from '~/components/Header';
import { SWRProvider } from '~/components/SWRProvider';

import Loading from './loading';

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
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
