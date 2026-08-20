import { createLegacyHandler } from '@/lib/legacy-adapter';
const legacyRead = require('@/api/read.js');

const handler = createLegacyHandler(legacyRead);

export const GET = handler;
export const OPTIONS = handler;
