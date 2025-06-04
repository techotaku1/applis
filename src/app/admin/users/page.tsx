import { clerkClient } from '@clerk/nextjs/server';

import { db } from '~/server/db';
import { employees } from '~/server/db/schema';

export default async function AdminUsersPage() {
  const clerk = await clerkClient();
  const [users, dbEmployees] = await Promise.all([
    clerk.users.getUserList(),
    db.select().from(employees),
  ]);

  const employeeMap = new Map(dbEmployees.map((emp) => [emp.clerkId, emp]));

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Usuarios y Empleados</h1>
      <table className="w-full">
        <thead>
          <tr>
            <th>Usuario Clerk</th>
            <th>Email</th>
            <th>Empleado Vinculado</th>
          </tr>
        </thead>
        <tbody>
          {users.data.map((user) => {
            const linkedEmployee = employeeMap.get(user.id);
            return (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.emailAddresses[0]?.emailAddress}</td>
                <td>
                  {linkedEmployee
                    ? `${linkedEmployee.firstName} ${linkedEmployee.lastName}`
                    : 'No vinculado'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
