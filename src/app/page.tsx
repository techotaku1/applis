import ClientPage from '~/components/ClientPage';
import { SWRProvider } from '~/components/SWRProvider';

export default function HomePage() {
  return (
    <SWRProvider>
      <ClientPage />
    </SWRProvider>
  );
}

// Remove these as they don't work in Server Components
export const dynamic = 'force-dynamic';
export const revalidate = 0;
