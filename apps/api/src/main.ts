import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(max: number, windowMs: number) {
  return (req: { ip?: string }, res: { status: (n: number) => { json: (v: unknown) => void } }, next: () => void) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const prev = ipHits.get(key);
    if (!prev || prev.resetAt <= now) {
      ipHits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (prev.count >= max) {
      res.status(429).json({ message: 'Too many requests. Please slow down.' });
      return;
    }
    prev.count += 1;
    next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadPath, { prefix: '/uploads/' });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  app.use('/auth', rateLimit(20, 60_000));
  app.use(rateLimit(300, 60_000));
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Zenith API listening on port ${port}`);
}
bootstrap();
