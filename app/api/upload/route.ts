import { createLegacyHandler } from '@/lib/legacy-adapter';
const legacyUpload = require('@/api/upload.js');

const handler = createLegacyHandler(legacyUpload);

export const POST = handler;
export const OPTIONS = handler;
