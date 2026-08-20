import { createLegacyHandler } from '@/lib/legacy-adapter';
const legacyWrite = require('@/api/write.js');

const handler = createLegacyHandler(legacyWrite);

export const POST = handler;
export const OPTIONS = handler;
