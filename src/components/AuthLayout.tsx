export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <div
        className="relative hidden w-1/2 lg:block"
        style={{
          backgroundImage: 'url(/fondo.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />{' '}
          {/* Optional overlay for better contrast */}
        </div>
      </div>
      <div className="flex w-full items-center justify-center lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
