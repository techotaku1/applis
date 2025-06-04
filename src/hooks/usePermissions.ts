import { useUser } from '@clerk/nextjs';

export function usePermissions() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return {
    canEditAnyDate: isAdmin,
    canDeleteAnyDate: isAdmin,
    canViewAllEmployees: isAdmin,
    canGenerateInvoices: isAdmin,
    isAdmin,
  };
}
