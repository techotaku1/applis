import { SignUp } from '@clerk/nextjs';

import AuthLayout from '~/components/AuthLayout';

export default function Page() {
  return (
    <div className="p-4">
      <AuthLayout>
        <SignUp
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
    </div>
  );
}
