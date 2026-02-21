import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
const BASE_URL = process.env.UPLOAD_BASE_URL || '/uploads';

@Injectable()
export class UploadsService {
  ensureDir() {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  saveFile(buffer: Buffer, originalName: string, mimeType?: string): { url: string; filename: string; size: number; mimeType?: string } {
    this.ensureDir();
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const path = join(UPLOAD_DIR, filename);
    writeFileSync(path, buffer);
    const url = `${BASE_URL}/${filename}`;
    return { url, filename: originalName, size: buffer.length, mimeType };
  }
}
