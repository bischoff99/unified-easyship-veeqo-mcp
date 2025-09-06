/**
 * Address verification tool
 */

import { EasyPostClient } from '../../services/clients/easypost-enhanced.js';

export async function verifyAddress(params: any) {
  const client = new EasyPostClient();
  return await client.verifyAddress(params.address);
}
