declare module 'multer' {
  import type { RequestHandler } from 'express';

  interface Options {
    storage?: unknown;
    limits?: { fileSize?: number; files?: number };
  }

  interface Instance {
    single(fieldName: string): RequestHandler;
  }

  interface Factory {
    (options?: Options): Instance;
    memoryStorage(): unknown;
  }

  const multer: Factory;
  export default multer;
}
