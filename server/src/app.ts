import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { apiRouter } from './routes';

export const app = express();

app.disable('x-powered-by');

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'", 'https://accounts.google.com'],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }),
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiRouter);
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    index: false,
    dotfiles: 'deny',
  }),
);

if (env.NODE_ENV === 'production') {
  const clientDir = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDir, { index: false, dotfiles: 'deny' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.includes('.')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'), (error) => {
      if (error) next();
    });
  });
}

app.use(notFound);
app.use(errorHandler);
