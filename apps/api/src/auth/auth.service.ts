import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    if (!/^[A-Za-z0-9_]{2,32}$/.test(username)) {
      throw new BadRequestException('Username must be 2-32 chars: letters, numbers, underscore');
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(dto.password)) {
      throw new BadRequestException('Password must be 8-72 chars and include letters and numbers');
    }
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase().trim() }, { username }] },
    });
    if (existing) {
      if (existing.email === dto.email) throw new ConflictException('Email already registered');
      throw new ConflictException('Username already taken');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username,
        passwordHash,
      },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, status: true, createdAt: true },
    });
    const token = this.jwt.sign({ sub: user.id });
    return { user, token };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.jwt.sign({ sub: user.id });
    const { passwordHash: _, ...safe } = user;
    return { user: safe, token };
  }

  async validateUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, status: true, createdAt: true },
    });
  }
}
