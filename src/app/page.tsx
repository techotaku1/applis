import TransactionTable from '~/components/TransactionTable';
import { getServices, updateServices } from '~/server/actions/tableGeneral';

import type { CleaningService } from '~/types';

// Añadir configuración de no caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const initialData = await getServices();

  return (
    <main className="container mx-auto h-screen p-4">
      {' '}
      {/* Reducido el padding */}
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-black">
        Registro de Servicios
      </h1>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateServices}
      />
    </main>
  );
}
