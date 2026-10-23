import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Yo Beauty API ouvindo em http://localhost:${env.PORT}`);
});
