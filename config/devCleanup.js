import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * On Windows, nodemon force-kills the parent `node server.js` on restart via
 * TerminateProcess. That never runs cleanup handlers and never kills the Next.js
 * dev worker it spawned (`.next\dev\build\<hash>.js`), so the orphan keeps holding
 * `.next/dev/lock` and the next start crashes with "Another next dev server is
 * already running." This proactively kills any such orphaned worker for THIS
 * project before we prepare a fresh one.
 */
export function killOrphanedDevWorkers() {
  if (process.platform !== 'win32') return;

  try {
    const psCommand = [
      `$root = '${projectRoot.replace(/'/g, "''")}';`,
      `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`,
      `| Where-Object { $_.ProcessId -ne ${process.pid} -and $_.CommandLine -like "*$root*" -and $_.CommandLine -like '*\\.next\\dev\\build\\*' }`,
      `| ForEach-Object { taskkill /F /T /PID $_.ProcessId 2>$null | Out-Null }`,
    ].join(' ');

    execSync(`powershell -NoProfile -NonInteractive -Command "${psCommand}"`, {
      stdio: 'ignore',
      timeout: 15000,
    });
  } catch {
    // Best-effort cleanup; never block startup on failure.
  }
}
