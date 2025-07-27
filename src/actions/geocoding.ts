
'use server';

import { z } from 'zod';

const GeocodeRequestSchema = z.object({
  street: z.string().min(3, 'Street must be at least 3 characters long.'),
  city: z.string(),
  state: z.string(),
  country: z.string(),
});

type GeocodeRequest = z.infer<typeof GeocodeRequestSchema>;

export type GeocodeResult = {
    street_number: string | null;
    route: string; // Street name
    locality: string; // City
    administrative_area_level_1: string; // State
    country: string;
    formatted_address: string;
};

type ActionState = {
  success: boolean;
  message: string;
  data?: GeocodeResult[];
};

export async function geocodeAddress(
  request: GeocodeRequest
): Promise<ActionState> {
  const validation = GeocodeRequestSchema.safeParse(request);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }

  const { street, city, state, country } = validation.data;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API Key is not configured.');
    return { success: false, message: 'Server configuration error.' };
  }

  const addressComponents = [
    `country:${country}`,
    `administrative_area:${state}`,
    `locality:${city}`,
  ].join('|');
  
  const addressQuery = street;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&components=${encodeURIComponent(addressComponents)}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const results: GeocodeResult[] = data.results.map((result: any) => {
        const components: any = {};
        result.address_components.forEach((component: any) => {
          const type = component.types[0];
          components[type] = component.long_name;
        });

        return {
          street_number: components.street_number || null,
          route: components.route || '',
          locality: components.locality || '',
          administrative_area_level_1: components.administrative_area_level_1 || '',
          country: components.country || '',
          formatted_address: result.formatted_address,
        };
      }).filter((r: GeocodeResult) => r.route); // Filter out results without a street name

      if (results.length === 0) {
        return { success: true, message: 'No precise results found.', data: [] };
      }

      return { success: true, message: 'Addresses found.', data: results };
    } else if (data.status === 'ZERO_RESULTS') {
        return { success: true, message: 'No results found.', data: [] };
    } else {
      console.error('Geocoding API Error:', data.status, data.error_message);
      return { success: false, message: `Geocoding API Error: ${data.status}` };
    }
  } catch (error) {
    console.error('Failed to fetch from Geocoding API:', error);
    return { success: false, message: 'Failed to connect to geocoding service.' };
  }
}
