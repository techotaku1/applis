export {};

export type Roles = 'admin' | 'employee';

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      employeeId?: string;
    };
  }
}
