// utils/cursorUtils.ts
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import axios from 'axios'
import  fs from 'fs-extra';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import os from 'os'
import psList from 'ps-list'
import { CursorIds, BackupInfo } from '../../types/cursor';

export class CursorUtils {
  /**
   * 生成新的机器ID
   */
  static generateNewIds(): CursorIds {
    const devDeviceId = uuidv4();
    const machineId = crypto.randomBytes(32).toString('hex');
    const macMachineId = crypto.randomBytes(64).toString('hex');
    const sqmId = `{${uuidv4().toUpperCase()}}`;

    return {
      'telemetry.devDeviceId': devDeviceId,
      'telemetry.macMachineId': macMachineId,
      'telemetry.machineId': machineId,
      'telemetry.sqmId': sqmId,
      'storage.serviceMachineId': devDeviceId,
    };
  }

  /**
   * 创建文件备份
   */
  static async createBackup(filePath: string): Promise<BackupInfo> {
    const backupPath = `${filePath}.bak`;
    await fs.copy(filePath, backupPath);
    
    return {
      originalPath: filePath,
      backupPath,
      timestamp: new Date()
    };
  }

  /**
   * 更新 storage.json 文件
   */
  static async updateStorageJson(storagePath: string, newIds: CursorIds): Promise<void> {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(storagePath)) {
        throw new Error(`Storage file not found: ${storagePath}`);
      }

      // 创建备份
      await this.createBackup(storagePath);

      // 读取并更新配置
      const config = await fs.readJson(storagePath);
      Object.assign(config, newIds);

      // 写入更新后的配置
      await fs.writeJson(storagePath, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to update storage.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新 SQLite 数据库
   */
  static async updateSqliteDb(sqlitePath: string, newIds: CursorIds): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          return reject(new Error(`Failed to open SQLite database: ${err.message}`));
        }
      });

      db.serialize(() => {
        db.run(
          `CREATE TABLE IF NOT EXISTS ItemTable (
          key TEXT PRIMARY KEY,
          value TEXT
          )`,
          (err) => {
            if (err) {
              db.close();
              return reject(new Error(`Failed to create table: ${err.message}`));
            }

            const stmt = db.prepare(
              `INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)`
            );

            const entries = Object.entries(newIds);
            let completed = 0;
            let hasError = false;

            for (const [key, value] of entries) {
              stmt.run(key, value, (err) => {
                if (hasError) return;
                if (err) {
                  hasError = true;
                  stmt.finalize(() => db.close());
                  return reject(new Error(`Failed to update SQLite database: ${err.message}`));
                }
                completed++;
                if (completed === entries.length) {
                  stmt.finalize((err) => {
      db.close();
                    if (err) {
                      return reject(new Error(`Failed to finalize statement: ${err.message}`));
                    }
                    resolve();
                  });
                }
              });
    }
          }
        );
      });
    });
  }

  /**
   * 更新 machineId 文件
   */
  static async updateMachineIdFile(machineIdPath: string, machineId: string): Promise<void> {
    try {
      const backupPath = `${machineIdPath}.backup`;
      
      // 如果文件存在，创建备份
      if (await fs.pathExists(machineIdPath)) {
        await fs.copy(machineIdPath, backupPath);
      }

      // 确保目录存在
      await fs.ensureDir(path.dirname(machineIdPath));
      
      // 写入新的 machineId
      await fs.writeFile(machineIdPath, machineId, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to update machineId file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 修改 workbench.desktop.main.js 文件
   */
  static async patchWorkbenchJs(jsPath: string): Promise<void> {
    try {
      let content = await fs.readFile(jsPath, 'utf-8');

      // 根据操作系统使用不同的替换模式
      const platform = process.platform;
      
      if (platform === 'win32' || platform === 'linux') {
        // Windows 和 Linux 的替换模式
        content = content.replace(
          /\$\(k,E\(Ks,\{title:"Upgrade to Pro",size:"small",get codicon\(\)\{return F\.rocket\},get onClick\(\)\{return t\.pay\}\}\),null\)/g,
          '$(k,E(Ks,{title:"yeongpin GitHub",size:"small",get codicon(){return F.rocket},get onClick(){return function(){window.open("https://github.com/yeongpin/cursor-free-vip","_blank")}}}),null)'
        );
      } else if (platform === 'darwin') {
        // macOS 的替换模式
        content = content.replace(
          /M\(x,I\(as,\{title:"Upgrade to Pro",size:"small",get codicon\(\)\{return \$\.rocket\},get onClick\(\)\{return t\.pay\}\}\),null\)/g,
          'M(x,I(as,{title:"yeongpin GitHub",size:"small",get codicon(){return $.rocket},get onClick(){return function(){window.open("https://github.com/yeongpin/cursor-free-vip","_blank")}}}),null)'
        );
      }

      // 替换 Pro Trial 为 Pro
      content = content.replace(/<div>Pro Trial/g, '<div>Pro');
      
      // 隐藏通知
      content = content.replace(/notifications-toasts/g, 'notifications-toasts hidden');

      await fs.writeFile(jsPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to patch workbench.js: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查 Cursor 版本
   */
  static async checkCursorVersion(cursorPath: string): Promise<string> {
    try {
      const packageJsonPath = path.join(cursorPath, 'package.json');
      const packageData = await fs.readJson(packageJsonPath);
      return packageData.version;
    } catch (error) {
      throw new Error(`Failed to check Cursor version: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 修改 main.js 文件（针对 0.45.0+ 版本）
   */
  static async patchMainJs(mainPath: string): Promise<void> {
    try {
      let content = await fs.readFile(mainPath, 'utf-8');

      // 替换 getMachineId 函数
      const patterns = [
        {
          regex: /async getMachineId\(\)\{return [^??]+\?\?([^}]+)\}/g,
          replacement: 'async getMachineId(){return $1}'
        },
        {
          regex: /async getMacMachineId\(\)\{return [^??]+\?\?([^}]+)\}/g,
          replacement: 'async getMacMachineId(){return $1}'
        }
      ];

      for (const pattern of patterns) {
        content = content.replace(pattern.regex, pattern.replacement);
      }

      await fs.writeFile(mainPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to patch main.js: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}





// 字节混淆算法
function obfuscateBytes(buf: Buffer): Buffer {
  let t = 165
  const arr = Buffer.from(buf)
  for (let r = 0; r < arr.length; r++) {
    arr[r] = ((arr[r] ^ t) + (r % 256)) & 0xFF
    t = arr[r]
  }
  return arr
}

// 生成 hashed64 hex
function generateHashed64Hex(input: string, salt = ''): string {
  return crypto.createHash('sha256').update(input + salt).digest('hex')
}

// 生成 cursor checksum
function generateCursorChecksum(token: string): string {
  const cleanToken = token.trim()
  const machineId = generateHashed64Hex(cleanToken, 'machineId')
  const macMachineId = generateHashed64Hex(cleanToken, 'macMachineId')
  const timestamp = Math.floor(Date.now() / 1000 / 1000) // Python: int(time.time() * 1000) // 1000000
  // 取高位6字节
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(timestamp))
  const last6 = buf.slice(-6)
  const obfuscated = obfuscateBytes(last6)
  const encoded = obfuscated.toString('base64')
  return `${encoded}${machineId}/${macMachineId}`
}

// Token 验证主函数
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // 清洗 token
    if (token.includes('%3A%3A')) token = token.split('%3A%3A')[1]
    else if (token.includes('::')) token = token.split('::')[1]
    token = token.trim()
    if (!token || token.length < 10) return false

    // 生成 checksum
    const checksum = generateCursorChecksum(token)

    // 构造请求头
    const headers = {
      'accept-encoding': 'gzip',
      'authorization': `Bearer ${token}`,
      'connect-protocol-version': '1',
      'content-type': 'application/proto',
      'user-agent': 'connect-es/1.6.1',
      'x-cursor-checksum': checksum,
      'x-cursor-client-version': '0.48.7',
      'x-cursor-timezone': 'Asia/Shanghai',
      'x-ghost-mode': 'false',
      'Host': 'api2.cursor.sh'
    }

    // 发送 POST 请求
    const resp = await axios.post(
      'https://api2.cursor.sh/aiserver.v1.DashboardService/GetUsageBasedPremiumRequests',
      Buffer.alloc(0),
      {
        headers,
        timeout: 10000,
        responseType: 'arraybuffer', // 保持与 fetch 行为一致
        validateStatus: () => true // 允许所有状态码
      }
    )

    if (resp.status === 200) return true
    if (resp.status === 401 || resp.status === 403) return false

    // 兜底：如果像 JWT 且长度大于100，认为可能有效
    if (token.startsWith('eyJ') && token.includes('.') && token.length > 100) return true

    return false
  } catch (e: any) {
    // 网络异常时兜底
    if (token.startsWith('eyJ') && token.includes('.') && token.length > 100) return true
    return false
  }
}


// 3. 更新认证信息（以写 storage.json 为例，按需扩展）
export async function updateAuthInfo({ email, token, password }: { email: string, token: string, password: string }) {
   // 1. 定位 storage.json 路径
   const userDataPath =
   process.platform === 'darwin'
     ? path.join(os.homedir(), 'Library', 'Application Support', 'Cursor')
     : process.platform === 'win32'
     ? path.join(process.env.APPDATA!, 'Cursor')
     : path.join(os.homedir(), '.config', 'Cursor')
 const storagePath = path.join(userDataPath, 'storage.json')

 // 2. 读取原有内容（如果有）
 let storage: Record<string, any> = {}
 if (await fs.pathExists(storagePath)) {
   storage = await fs.readJson(storagePath)
 }

 // 3. 更新认证相关字段
 storage['cursorAuth/cachedEmail'] = email
 storage['cursorAuth/accessToken'] = token
 storage['cursorAuth/refreshToken'] = token
 storage['cursorAuth/cachedSignUpType'] = 'Auth_0'

 // 4. 写回文件
 await fs.writeJson(storagePath, storage, { spaces: 2 })
 return true
}




export async function updateSqliteAuth(sqlitePath: string, email: string, token: string) {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(sqlitePath, (err) => {
      if (err) return reject(err);
    });
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS ItemTable (
          key TEXT PRIMARY KEY,
          value TEXT
        )`
      );
      const updates = [
        ['cursorAuth/cachedEmail', email],
        ['cursorAuth/accessToken', token],
        ['cursorAuth/refreshToken', token],
        ['cursorAuth/cachedSignUpType', 'Auth_0']
      ];
      const stmt = db.prepare(`INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)`);
      for (const [key, value] of updates) {
        stmt.run(key, value);
      }
      stmt.finalize((err) => {
        db.close();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

// 4. 完全重置 Cursor（可扩展为清理 machineId、sqlite3等）
export async function totallyResetCursor() {
  try {
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor')
    await fs.remove(userDataPath)
    await fs.ensureDir(userDataPath)
    return true
  } catch (e) {
    return false
  }
}

// 5. 退出 Cursor 进程
export async function exitCursor() {
  const list = await psList()
  for (const p of list) {
    if (p.name.toLowerCase().includes('cursor')) {
      try { process.kill(p.pid) } catch {}
    }
  }
}

const AUTH_FIELDS = [
  ['cursorAuth/cachedEmail', 'email'],
  ['cursorAuth/accessToken', 'token'],
  ['cursorAuth/refreshToken', 'token'],
  ['cursorAuth/cachedSignUpType', 'signUpType']
];

export async function updateAuthAll({ storagePath, sqlitePath, email, token, password }) {
  const signUpType = 'Auth_0';
  // 1. 更新 storage.json
  let storage = {};
  if (await fs.pathExists(storagePath)) {
    storage = await fs.readJson(storagePath);
  }
  for (const [key, field] of AUTH_FIELDS) {
    storage[key] = field === 'email' ? email : field === 'token' ? token : signUpType;
  }
  await fs.writeJson(storagePath, storage, { spaces: 2 });

  // 2. 更新 state.vscdb
  await updateSqliteAuth(sqlitePath, email, token);

  return true;
}
