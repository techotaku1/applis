'use client';

import { useEffect, useState } from 'react';

import { getProperties } from '~/server/actions/tableGeneral';

import type { Property } from '~/types';

interface SelectPropertyProps {
  value: string;
  onChangeAction: (value: string) => void;
  className?: string;
}

export default function SelectProperty({
  value,
  onChangeAction,
  className,
}: SelectPropertyProps) {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const props = await getProperties();
        setProperties(props || []);
      } catch (error) {
        console.error('Error loading properties:', error);
      }
    };
    void loadProperties();
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChangeAction(e.target.value)}
      className={className}
    >
      <option value="">Seleccionar propiedad...</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id}>
          {property.name} - {property.clientName}
        </option>
      ))}
    </select>
  );
}
