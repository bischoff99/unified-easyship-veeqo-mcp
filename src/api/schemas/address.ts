import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string().default("US"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export type Address = z.infer<typeof AddressSchema>;
