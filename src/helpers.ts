import { promises as fs } from 'fs';
import { join } from 'path';

export async function walk(directory: string) {
    let fileList: string[] = [];
  
    const files = await fs.readdir(directory);
  
    for (const file of files) {
      const p = join(directory, file);
      if ((await fs.stat(p)).isDirectory()) {
        fileList = [...fileList, ...(await walk(p))];
      } else {
        fileList.push(p);
      }
    }
  
    return fileList;
  }
