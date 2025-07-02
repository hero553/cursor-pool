
import { ipcMain } from 'electron'
import { CursorResetService } from './service/cursor-reset-service';
import { ConfigService } from './service/config-service';

/** 主进程 */
export class MainProcess {
  private configService: ConfigService;
  private resetService: CursorResetService | null = null;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    /** 重置 Cursor */
    ipcMain.handle('reset-cursor', async () => {
      try {
        const config = await this.configService.getCursorConfig();
        this.resetService = new CursorResetService(config);
        
        const result = await this.resetService.totallyResetCursor();
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    /** 获取当前机器ID */
    ipcMain.handle('get-current-ids', async () => {
      try {
        const config = await this.configService.getCursorConfig();
        this.resetService = new CursorResetService(config);
        
        const ids = await this.resetService.getCurrentIds();
        return { success: true, data: ids };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }
}