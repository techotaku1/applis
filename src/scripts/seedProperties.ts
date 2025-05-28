import { randomUUID } from 'crypto';

import { presetProperties } from '../data/properties';
import { db } from '../server/db';
import { properties } from '../server/db/schema';

async function seedProperties() {
  try {
    console.log('Iniciando inserción de propiedades...');

    for (const property of presetProperties) {
      const now = new Date();
      await db.insert(properties).values({
        id: randomUUID(),
        name: property.name,
        clientName: property.clientName,
        regularRate: property.regularRate,
        rateType: property.rateType,
        refreshRate: property.refreshRate,
        standardHours: property.standardHours,
        taxStatus: property.taxStatus,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✓ Propiedad insertada: ${property.name}`);
    }

    console.log('¡Todas las propiedades han sido insertadas exitosamente!');
  } catch (error) {
    console.error('Error al insertar propiedades:', error);
    process.exit(1);
  }
}

seedProperties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
