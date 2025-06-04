'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">Algo salió mal!</h2>
      <p className="text-gray-600">{error.message}</p>
      <button
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
        onClick={() => reset()}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
