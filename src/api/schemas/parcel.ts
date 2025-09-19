import { z } from "zod";

export const ParcelSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weight_oz: z.number().positive(),
});

export type Parcel = z.infer<typeof ParcelSchema>;
