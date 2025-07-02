// utils/processUtils.ts
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export async function relaunchCursor(): Promise<boolean> {
  const platform = process.platform;

  let launched = false;

  if (platform === 'win32') {
    // 常见安装路径
    const possiblePaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Cursor', 'Cursor.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Cursor', 'Cursor.exe')
    ];
    for (const exePath of possiblePaths) {
      if (await fs.pathExists(exePath)) {
        spawn(exePath, [], { detached: true, stdio: 'ignore' });
        launched = true;
        break;
      }
    }
  } else if (platform === 'darwin') {
    // macOS
    const appPath = '/Applications/Cursor.app';
    const binPath = '/Applications/Cursor.app/Contents/MacOS/Cursor';
    if (await fs.pathExists(appPath)) {
      spawn('open', [appPath], { detached: true, stdio: 'ignore' });
      launched = true;
    } else if (await fs.pathExists(binPath)) {
      spawn(binPath, [], { detached: true, stdio: 'ignore' });
      launched = true;
    }
  } else if (platform === 'linux') {
    // Linux
    const possiblePaths = [
      '/opt/Cursor/cursor',
      '/usr/bin/cursor',
      '/usr/local/bin/cursor'
    ];
    for (const exePath of possiblePaths) {
      if (await fs.pathExists(exePath)) {
        spawn(exePath, [], { detached: true, stdio: 'ignore' });
        launched = true;
        break;
      }
    }
    // which cursor
    if (!launched) {
      try {
        const which = await import('which');
        const cursorPath = which.sync('cursor');
        if (cursorPath) {
          spawn(cursorPath, [], { detached: true, stdio: 'ignore' });
          launched = true;
        }
      } catch {}
    }
  }

  return launched;
}