import { exec } from 'child_process';
import os from 'os';

export function getProcessList(): Promise<{ pid: number, name: string }[]> {
  return new Promise((resolve, reject) => {
    if (os.platform() === 'win32') {
      exec('tasklist /FO CSV /NH', (err, stdout) => {
        if (err) return reject(err);
        const lines = stdout.trim().split('\n');
        const list = lines.map(line => {
          const [name, pid] = line.split('","').map(s => s.replace(/^"|"$/g, ''));
          return { name, pid: Number(pid) };
        });
        resolve(list);
      });
    } else {
      exec('ps -ax -o pid=,command=', (err, stdout) => {
        if (err) return reject(err);
        const lines = stdout.trim().split('\n');
        const list = lines.map(line => {
          const [pid, ...commandArr] = line.trim().split(' ');
          const command = commandArr.join(' ');
          const name = command.split('/').pop() || command;
          return { pid: Number(pid), name };
        });
        resolve(list);
      });
    }
  });
} 