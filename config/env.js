import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load .env from raka-backend root, regardless of process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Node may use 127.0.0.1 for DNS (VPN/proxy); that breaks mongodb+srv SRV lookups.
if (process.env.MONGO_DNS_SERVERS) {
  dns.setServers(process.env.MONGO_DNS_SERVERS.split(',').map((s) => s.trim()));
} else {
  const servers = dns.getServers();
  if (servers.every((s) => s === '127.0.0.1' || s === '::1')) {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
}
