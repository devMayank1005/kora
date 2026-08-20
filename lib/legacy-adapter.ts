import { NextRequest, NextResponse } from 'next/server';

export function createLegacyHandler(legacyFn: Function) {
  return async function handler(req: NextRequest) {
    const url = new URL(req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    const headersObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      try {
        body = await req.json();
      } catch (e) {}
    }

    const legacyReq = {
      method: req.method,
      headers: headersObj,
      query,
      body,
      url: req.url,
      socket: { remoteAddress: req.headers.get('x-forwarded-for') || '127.0.0.1' },
    };

    return new Promise<NextResponse>(async resolve => {
      let statusCode = 200;
      let headersOut: Record<string, string> = {};

      const legacyRes = {
        setHeader: (k: string, v: string) => {
          headersOut[k] = v;
          return legacyRes;
        },
        status: (code: number) => {
          statusCode = code;
          return legacyRes;
        },
        json: (data: any) => {
          resolve(NextResponse.json(data, { status: statusCode, headers: headersOut }));
        },
        end: () => {
          resolve(new NextResponse(null, { status: statusCode, headers: headersOut }));
        },
      };

      try {
        await legacyFn(legacyReq, legacyRes);
      } catch (err: any) {
        resolve(NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 }));
      }
    });
  };
}
