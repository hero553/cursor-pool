// utils/processUtils.ts
import { getProcessList } from './process-list';

export async function killCursorProcess(): Promise<boolean> {
  // 常见的 Cursor 进程名（包括 macOS 下的各种变体）
  const processNames = [
    'Cursor', 
    'Cursor.exe', 
    'cursor',
    'Cursor Helper',
    'Cursor Helper (GPU)',
    'Cursor Helper (Plugin)',
    'Cursor Helper (Renderer)'
  ];

  const list = await getProcessList();
  console.log('All processes:', list.slice(0, 10)); // 显示前10个进程用于调试
  
  // 找到所有 Cursor 进程（不区分大小写）
  const targets = list.filter(p => 
    processNames.some(name => 
      p.name.toLowerCase().includes(name.toLowerCase())
    )
  );
  
  console.log('Found Cursor processes:', targets);
  
  if (targets.length === 0) {
    // 没有找到
    return false;
  }

  let success = true;
  for (const proc of targets) {
    try {
      console.log(`Killing process: ${proc.name} (PID: ${proc.pid})`);
      process.kill(proc.pid, 'SIGKILL');
    } catch (e) {
      console.error(`Failed to kill process ${proc.name} (PID: ${proc.pid}):`, e);
      success = false;
    }
  }
  return success;
}