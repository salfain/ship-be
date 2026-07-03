import 'dotenv/config';

import { createApp } from './app.js';
import { ensureStorage } from './db.js';

const port = Number(process.env.PORT || 3000);

ensureStorage();

createApp().listen(port, () => {
  console.log(`Ship Monitoring API running on http://localhost:${port}`);
});
