import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } })) // 8MB
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { url: null, filename: '', size: 0 };
    const result = this.uploads.saveFile(file.buffer, file.originalname, file.mimetype);
    return result;
  }
}
