import { z } from 'zod';

const text = (minimum, maximum) => z.string().trim().min(minimum).max(maximum);
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const orderSchema = z
  .object({
    customer: z
      .object({
        name: text(2, 100),
        email: emailSchema,
        address: text(5, 200),
        city: text(2, 100),
        postalCode: text(2, 20),
        country: z.enum(['US', 'IL', 'GB', 'FR', 'DE', 'AE', 'CA', 'AU']),
      })
      .strict(),
    items: z
      .array(
        z
          .object({
            productId: text(1, 80),
            quantity: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(3)
      .refine(
        (items) => new Set(items.map((item) => item.productId)).size === items.length,
        'Each watch may only appear once in the bag.',
      ),
  })
  .strict();
export const requestKeySchema = z.uuid();
export const lookupSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^VLA-[A-F0-9]{16}$/),
    email: emailSchema,
  })
  .strict();
export const newsletterSchema = z.object({ email: emailSchema }).strict();
