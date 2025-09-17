/**
 * Weight conversion tool
 */

import { z } from 'zod';

const inputSchema = z.object({
  pounds: z.number().min(0).optional(),
  ounces: z.number().min(0).optional(),
});

export async function weightToOz(params: unknown) {
  const input = inputSchema.parse(params);
  let totalOz = (input.pounds ?? 0) * 16 + (input.ounces ?? 0);
  if (totalOz === 0) {
    throw new Error('Weight must be greater than 0');
  }

  // Round to handle floating point inaccuracies, e.g., 15.999999999999998
  totalOz = parseFloat(totalOz.toPrecision(9));

  return {
    weight_oz: totalOz,
    weight_lb: totalOz / 16,
    formatted: `${Math.floor(totalOz / 16)}lb ${totalOz % 16}oz`,
  };
}
