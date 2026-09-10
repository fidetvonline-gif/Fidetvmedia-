import { analyzePermittedSource } from './server/media/adapters/permitted-sources.js';
analyzePermittedSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  .then(console.log)
  .catch(console.error);
