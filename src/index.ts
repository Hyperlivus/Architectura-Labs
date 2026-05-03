import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? './env/prod.env' : './env/dev.env' });

import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4000);

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on http://0.0.0.0:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
