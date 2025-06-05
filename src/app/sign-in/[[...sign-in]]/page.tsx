'use client';

import { useState, useEffect } from 'react';

import { SignIn } from '@clerk/nextjs';

import AuthLayout from '~/components/AuthLayout';

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthLayout>
      <SignIn
        appearance={{
          layout: {
            logoPlacement: 'inside',
            logoImageUrl: '/logo.jpg',
          },
          variables: {
            colorPrimary: '#6366f1',
            fontFamily: 'var(--font-delius)',
            fontFamilyButtons: 'var(--font-delius)',
            fontSize: '1rem',
          },
          elements: {
            logoImage: {
              width: '150px',
              height: 'auto',
            },
          },
        }}
      />
    </AuthLayout>
  );
}
