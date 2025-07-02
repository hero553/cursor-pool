// utils/processUtils.ts
import psList from 'ps-list';

export async function killCursorProcess(): Promise<boolean> {
  // 常见的 Cursor 进程名
  const processNames = ['Cursor', 'Cursor.exe', 'cursor'];
  const list = await psList();

  // 找到所有 Cursor 进程
  const targets = list.filter(
    p => processNames.includes(p.name)
  );

  if (targets.length === 0) {
    // 没有找到
    return false;
  }

  let success = true;
  for (const proc of targets) {
    try {
      process.kill(proc.pid, 'SIGKILL');
    } catch (e) {
      success = false;
    }
  }
  return success;
}