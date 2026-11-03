"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadedImageSchema = void 0;
const zod_1 = require("zod");
/** An image that is already uploaded as a Pack asset, referenced by its asset ID. */
exports.UploadedImageSchema = zod_1.z.strictObject({
    assetId: zod_1.z.string().min(1),
    filename: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1).optional(),
});
