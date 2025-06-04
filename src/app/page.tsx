'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useUser } from '@clerk/nextjs';

import ClientPage from '~/components/ClientPage';
import { SWRProvider } from '~/components/SWRProvider';

import Loading from './loading';

export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
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
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">
          ¡Bienvenido, {user?.firstName ?? 'Usuario'}!
        </h1>
        <ClientPage />
      </div>
    </SWRProvider>
  );
}
