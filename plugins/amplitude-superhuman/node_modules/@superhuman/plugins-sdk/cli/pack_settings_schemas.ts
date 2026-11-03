import {z} from 'zod';

/** An image that is already uploaded as a Pack asset, referenced by its asset ID. */
export const UploadedImageSchema = z.strictObject({
  assetId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1).optional(),
});
