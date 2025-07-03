// utils/processUtils.ts
import { spawn, exec } from 'child_process';
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
    // macOS - 改进的启动逻辑
    console.log('Attempting to relaunch Cursor on macOS...');
    
    // 1. 首先尝试使用 mdfind 查找 Cursor.app
    try {
      const cursorPath = await findCursorWithMdfind();
      if (cursorPath) {
        console.log(`Found Cursor at: ${cursorPath}`);
        const result = await launchCursorApp(cursorPath);
        if (result) {
          launched = true;
          console.log('Successfully launched Cursor using mdfind path');
        }
      }
    } catch (error) {
      console.warn('mdfind search failed:', error);
    }

    // 2. 如果 mdfind 失败，尝试常见路径
    if (!launched) {
      const commonPaths = [
        '/Applications/Cursor.app',
        '/Applications/Cursor/Cursor.app',
        path.join(os.homedir(), 'Applications', 'Cursor.app'),
        '/opt/homebrew/Applications/Cursor.app',
        '/usr/local/Applications/Cursor.app'
      ];

      for (const appPath of commonPaths) {
        if (await fs.pathExists(appPath)) {
          console.log(`Found Cursor at common path: ${appPath}`);
          const result = await launchCursorApp(appPath);
          if (result) {
            launched = true;
            console.log(`Successfully launched Cursor from: ${appPath}`);
            break;
          }
        }
      }
    }

    // 3. 最后尝试使用 which 命令
    if (!launched) {
      try {
        const cursorPath = await findCursorWithWhich();
        if (cursorPath) {
          console.log(`Found Cursor binary at: ${cursorPath}`);
          const result = await launchCursorBinary(cursorPath);
          if (result) {
            launched = true;
            console.log('Successfully launched Cursor using which path');
          }
        }
      } catch (error) {
        console.warn('which command failed:', error);
      }
    }

    if (!launched) {
      console.error('Failed to launch Cursor on macOS');
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

/**
 * 使用 mdfind 查找 Cursor.app
 */
async function findCursorWithMdfind(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    exec('mdfind -name "Cursor.app"', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const paths = stdout.trim().split('\n').filter(p => p.length > 0);
      // 优先选择 /Applications 下的版本
      const appPath = paths.find(p => p.includes('/Applications/')) || paths[0];
      resolve(appPath || null);
    });
  });
}

/**
 * 使用 which 命令查找 Cursor 二进制文件
 */
async function findCursorWithWhich(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    exec('which cursor', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const path = stdout.trim();
      resolve(path || null);
    });
  });
}

/**
 * 启动 Cursor.app
 */
async function launchCursorApp(appPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Launching Cursor.app: ${appPath}`);
    
    // 方法1: 使用 open 命令
    const openProcess = spawn('open', [appPath], { 
      detached: true, 
      stdio: 'ignore' 
    });
    
    openProcess.on('error', (error) => {
      console.error('open command failed:', error);
      resolve(false);
    });
    
    openProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('open command succeeded');
        resolve(true);
      } else {
        console.log(`open command failed with code: ${code}`);
        resolve(false);
      }
    });
    
    // 设置超时
    setTimeout(() => {
      console.log('open command timeout');
      resolve(false);
    }, 5000);
  });
}

/**
 * 启动 Cursor 二进制文件
 */
async function launchCursorBinary(binPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Launching Cursor binary: ${binPath}`);
    
    const process = spawn(binPath, [], { 
      detached: true, 
      stdio: 'ignore' 
    });
    
    process.on('error', (error) => {
      console.error('Binary launch failed:', error);
      resolve(false);
    });
    
    process.on('exit', (code) => {
      if (code === 0) {
        console.log('Binary launch succeeded');
        resolve(true);
      } else {
        console.log(`Binary launch failed with code: ${code}`);
        resolve(false);
      }
    });
    
    // 设置超时
    setTimeout(() => {
      console.log('Binary launch timeout');
      resolve(false);
    }, 5000);
  });
}