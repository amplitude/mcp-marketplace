import { z } from 'zod';
/** An image that is already uploaded as a Pack asset, referenced by its asset ID. */
export declare const UploadedImageSchema: z.ZodObject<{
    assetId: z.ZodString;
    filename: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
