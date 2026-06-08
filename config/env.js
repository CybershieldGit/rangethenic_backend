import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load .env from raka-backend root, regardless of process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../.env') });
