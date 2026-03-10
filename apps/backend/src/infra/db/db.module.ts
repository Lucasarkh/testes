import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeedRunnerService } from './seed-runner.service';
import { EncryptionService } from '@common/encryption/ecryption.service';

@Global()
@Module({
  providers: [PrismaService, SeedRunnerService, EncryptionService],
  exports: [PrismaService, EncryptionService]
})
export class DbModule {}
