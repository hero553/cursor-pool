// services/cursorResetService.ts
import { CursorUtils } from '../utils/cursor-utils';
import { CursorConfig, ResetResult, CursorIds } from '../../types/cursor';
import * as fs from 'fs-extra';
import * as path from 'path';
import { killCursorProcess, relaunchCursor, Time } from '../utils';

export class CursorResetService {
  private config: CursorConfig;

  constructor(config: CursorConfig) {
    this.config = config;
  }

  /**
   * 完全重置 Cursor
   */
  async totallyResetCursor(): Promise<ResetResult> {
    try {
      // 1. 验证配置
      await this.validateConfig();

      // 2. 生成新的机器ID
      const newIds = CursorUtils.generateNewIds();

      // 3. 更新 storage.json
      await CursorUtils.updateStorageJson(this.config.storagePath, newIds);

      // 4. 更新 SQLite 数据库
      CursorUtils.updateSqliteDb(this.config.sqlitePath, newIds);

      // 5. 更新 machineId 文件
      await CursorUtils.updateMachineIdFile(
        this.config.machineIdPath, 
        newIds['telemetry.devDeviceId']
      );

      // 6. 修改 workbench.js
      await CursorUtils.patchWorkbenchJs(this.config.workbenchJsPath);

      // 7. 检查版本并应用补丁
      await this.applyVersionSpecificPatches();

      // 8. 退出cursor
      await killCursorProcess();
      // 9. 等待进程完全退出
      await Time.sleep(2);

      // 10. 重启cursor
      await relaunchCursor();
      return {
        success: true,
        data: newIds
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证配置
   */
  private async validateConfig(): Promise<void> {
    const requiredPaths = [
      this.config.storagePath,
      this.config.sqlitePath,
      this.config.workbenchJsPath
    ];

    for (const filePath of requiredPaths) {
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Required file not found: ${filePath}`);
      }
    }
  }

  /**
   * 应用版本特定的补丁
   */
  private async applyVersionSpecificPatches(): Promise<void> {
    try {
      const version = await CursorUtils.checkCursorVersion(this.config.cursorPath);
      const mainPath = path.join(this.config.cursorPath, 'out/main.js');

      // 检查版本是否 >= 0.45.0
      const versionParts = version.split('.').map(Number);
      const isVersion45Plus = versionParts[0] > 0 || 
                             (versionParts[0] === 0 && versionParts[1] >= 45);

      if (isVersion45Plus && await fs.pathExists(mainPath)) {
        await CursorUtils.patchMainJs(mainPath);
      }
    } catch (error) {
      console.warn('Version-specific patches failed:', error);
    }
  }

  /**
   * 获取当前机器ID信息
   */
  async getCurrentIds(): Promise<Partial<CursorIds>> {
    try {
      const config = await fs.readJson(this.config.storagePath);
      return {
        'telemetry.devDeviceId': config['telemetry.devDeviceId'],
        'telemetry.macMachineId': config['telemetry.macMachineId'],
        'telemetry.machineId': config['telemetry.machineId'],
        'telemetry.sqmId': config['telemetry.sqmId'],
        'storage.serviceMachineId': config['storage.serviceMachineId'],
      };
    } catch (error) {
      throw new Error(`Failed to get current IDs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}