'use client';

import useSWR, { type SWRResponse } from 'swr';

import {
  getServices,
  getProperties,
  getEmployees,
} from '~/server/actions/tableGeneral';

import type { CleaningService, Property, Employee } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

const fetcher = async <T>(key: string): Promise<T[]> => {
  switch (key) {
    case 'services':
      return (await getServices()) as T[];
    case 'properties':
      return (await getProperties()) as T[];
    case 'employees':
      return (await getEmployees()) as T[];
    default:
      throw new Error('Invalid key');
  }
};

const config = {
  revalidateOnFocus: true,
  shouldRetryOnError: true,
} as const;

export function useServices() {
  const { data, error, mutate }: SWRResult<CleaningService> = useSWR(
    'services',
    fetcher<CleaningService>,
    { ...config, refreshInterval: 5000 }
  );

  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: error !== undefined,
    mutate: () => mutate().then((d) => d ?? []),
  };
}

export function useProperties() {
  const { data, error }: SWRResult<Property> = useSWR(
    'properties',
    fetcher<Property>,
    config
  );

  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: error !== undefined,
  };
}

export function useEmployees() {
  const { data, error }: SWRResult<Employee> = useSWR(
    'employees',
    fetcher<Employee>,
    config
  );

  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: error !== undefined,
  };
}
