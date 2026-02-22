import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  private readonly blockedExtensions = new Set([
    '.exe', '.msi', '.bat', '.cmd', '.ps1', '.com', '.scr', '.jar', '.vbs', '.js', '.jse', '.wsf', '.sh', '.apk'
  ]);

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } })) // 8MB
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { url: null, filename: '', size: 0 };
    const lower = file.originalname.toLowerCase();
    const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
    if (this.blockedExtensions.has(ext)) {
      throw new BadRequestException('Executable/script file uploads are not allowed');
    }
    if (file.mimetype?.includes('application/x-msdownload') || file.mimetype?.includes('application/x-dosexec')) {
      throw new BadRequestException('Executable uploads are not allowed');
    }
    const result = this.uploads.saveFile(file.buffer, file.originalname, file.mimetype);
    return result;
  }
}
