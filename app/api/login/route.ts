import { createLegacyHandler } from '@/lib/legacy-adapter';
const legacyLogin = require('@/api/login.js');

const handler = createLegacyHandler(legacyLogin);

export const POST = handler;
export const OPTIONS = handler;
