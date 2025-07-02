import { verifyToken, updateAuthAll } from '../utils/cursor-utils'
import { CursorResetService } from './cursor-reset-service';
import { ConfigService } from './config-service';

export async function switchAccount(token: string, email?: string, password?: string) {
  const config = await ConfigService.getInstance().getCursorConfig();
  // 1. 验证 Token
  if (!await verifyToken(token)) {
    return { success: false, message: 'Token无效' };
  }
  // 2. 写入认证信息
  try {
    await updateAuthAll({
      storagePath: config.storagePath,
      sqlitePath: config.sqlitePath,
      email,
      token,
      password
    });
  } catch (e) {
    return { success: false, message: '认证信息更新失败', error: e instanceof Error ? e.message : String(e) };
  }
  /** 3. 重置 Cursor */
  const resetService = new CursorResetService(config);
  const resetResult = await resetService.totallyResetCursor();
  if (!resetResult.success) {
    return { success: false, message: '环境重置失败', error: resetResult.error };
  }
  return { success: true, message: '切换成功' };
}