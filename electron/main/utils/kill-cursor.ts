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

  // 需要排除的进程名（当前应用和其他不应该杀死的进程）
  const excludeNames = [
    'Cursor Professional',  // 当前应用名称
    'electron',             // Electron 进程
    'node',                 // Node.js 进程
    'Cursor Professional.app' // macOS 应用包名
  ];

  const list = await getProcessList();
  console.log('All processes:', list.slice(0, 10)); // 显示前10个进程用于调试
  
  // 找到所有 Cursor 进程（不区分大小写），但排除当前应用
  const targets = list.filter(p => {
    // 首先检查是否应该排除
    const shouldExclude = excludeNames.some(excludeName => 
      p.name.toLowerCase().includes(excludeName.toLowerCase())
    );
    
    if (shouldExclude) {
      return false;
    }
    
    // 然后检查是否匹配 Cursor 进程
    return processNames.some(name =>  
      p.name.toLowerCase().includes(name.toLowerCase())
    );
  });
  
  console.log('Found Cursor processes to kill:', targets);
  
  if (targets.length === 0) {
    console.log('No Cursor processes found to kill');
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