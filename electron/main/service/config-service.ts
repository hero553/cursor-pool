// services/configService.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { CursorConfig } from '../../types/cursor';

export class ConfigService {
  private static instance: ConfigService;
  private configDir: string;
  private configFile: string;

  private constructor() {
    this.configDir = path.join(os.homedir(), '.cursor-free-vip');
    this.configFile = path.join(this.configDir, 'config.ini');
  }

  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 获取 Cursor 配置
   */
  async getCursorConfig(): Promise<CursorConfig> {
    const platform = process.platform;
    
    if (platform === 'win32') {
      return this.getWindowsConfig();
    } else if (platform === 'darwin') {
      return this.getMacConfig();
    } else if (platform === 'linux') {
      return this.getLinuxConfig();
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private getWindowsConfig(): CursorConfig {
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error('APPDATA environment variable not found');
    }

    return {
      cursorPath: path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'resources', 'app'),
      storagePath: path.join(appData, 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlitePath: path.join(appData, 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineIdPath: path.join(appData, 'Cursor', 'machineId'),
      workbenchJsPath: path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js')
    };
  }

  private getMacConfig(): CursorConfig {
    const homeDir = os.homedir();
    
    return {
      cursorPath: '/Applications/Cursor.app/Contents/Resources/app',
      storagePath: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlitePath: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineIdPath: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'machineId'),
      workbenchJsPath: '/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js'
    };
  }

  private getLinuxConfig(): CursorConfig {
    const homeDir = os.homedir();
    
    return {
      cursorPath: '/opt/Cursor/resources/app',
      storagePath: path.join(homeDir, '.config', 'cursor', 'User', 'globalStorage', 'storage.json'),
      sqlitePath: path.join(homeDir, '.config', 'cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineIdPath: path.join(homeDir, '.config', 'cursor', 'machineid'),
      workbenchJsPath: '/opt/Cursor/resources/app/out/vs/workbench/workbench.desktop.main.js'
    };
  }
}