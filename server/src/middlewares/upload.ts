import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors';

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  parser.single('file')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'LIMIT_FILE_SIZE') {
      next(new AppError(413, 'A imagem deve ter no máximo 4 MB.', 'FILE_TOO_LARGE'));
      return;
    }
    next(new AppError(422, 'Não foi possível ler a imagem enviada.', 'INVALID_IMAGE'));
  });
}
