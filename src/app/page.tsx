import ClientPage from '~/components/ClientPage';

export default function HomePage() {
  return <ClientPage />;
}

// Remove these as they don't work in Server Components
export const dynamic = 'force-dynamic';
export const revalidate = 0;
