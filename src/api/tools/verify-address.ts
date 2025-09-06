import { EasyPostClient } from '../client.js';
import { AddressSchema } from '../schemas/address.js';

const inputSchema = AddressSchema;

export async function verifyAddress(params: unknown) {
  const input = inputSchema.parse(params);
  const client = new EasyPostClient();

  // Ensure required fields are present
  const addressInput = {
    ...input,
    name: input.name || 'Unknown',
    state: input.state || '',
  };

  const response = await client.verifyAddress(addressInput);

  return {
    verified: true, // For now, assume verified if no errors
    address: {
      street1: response.street1,
      street2: response.street2,
      city: response.city,
      state: response.state,
      zip: response.zip,
      country: response.country,
    },
    messages: [],
  };
}
