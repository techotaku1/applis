import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import postgres from 'postgres';

// Cargar variables de entorno antes de importar otros módulos
config({ path: '.env' });

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in environment variables');
}

// Crear conexión directa a la base de datos para el script
const sql = postgres(process.env.DATABASE_URL);

import { presetProperties } from '../data/properties';

async function seedProperties() {
  try {
    console.log('Iniciando inserción de propiedades...');

    for (const property of presetProperties) {
      const now = new Date();
      await sql`
        INSERT INTO properties (
          id,
          name,
          client_name,
          regular_rate,
          rate_type,
          refresh_rate,
          standard_hours,
          tax_status,
          created_at,
          updated_at
        ) VALUES (
          ${randomUUID()},
          ${property.name},
          ${property.clientName},
          ${property.regularRate},
          ${property.rateType}::rate_type,
          ${property.refreshRate},
          ${property.standardHours},
          ${property.taxStatus}::tax_status,
          ${now},
          ${now}
        )
      `;
      console.log(`✓ Propiedad insertada: ${property.name}`);
    }

    console.log('Todas las propiedades han sido insertadas exitosamente');
  } catch (error) {
    console.error('Error al insertar propiedades:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedProperties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
