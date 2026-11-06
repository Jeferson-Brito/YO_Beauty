import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../lib/async-handler';
import { isImageKey } from '../storage/database-storage';

export const imageRoutes = Router();

imageRoutes.get('/:folder/:filename', asyncHandler(async (req, res, next) => {
  const key = `${req.params.folder}/${req.params.filename}`;
  if (!isImageKey(key)) { next(); return; }
  const image = await prisma.storedImage.findUnique({ where: { key } });
  if (!image) { next(); return; }
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(image.contentType).send(Buffer.from(image.data));
}));
