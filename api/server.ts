import app, { initApp } from '../server';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await initApp(false);
    initialized = true;
  }
  return app(req, res);
}

