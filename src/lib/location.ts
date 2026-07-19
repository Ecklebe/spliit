import { ExpenseFormValues } from '@/lib/schemas'

export function getLocationFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): ExpenseFormValues['location'] {
  return searchParams.get('latitude') && searchParams.get('longitude')
    ? {
        latitude: Number(searchParams.get('latitude')),
        longitude: Number(searchParams.get('longitude')),
      }
    : null
}
