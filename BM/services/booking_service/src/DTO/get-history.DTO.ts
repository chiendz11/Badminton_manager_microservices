// src/DTO/get-history.dto.ts

import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  status?: string; // 'paid', 'pending', 'cancelled', 'all'

  @IsOptional()
  @IsString()
  centerId?: string; // Filter theo ID sân

  @IsOptional()
  @IsString()
  dateFrom?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  dateTo?: string;   // YYYY-MM-DD

  @IsOptional()
  @IsString()
  search?: string;   // Tìm kiếm từ khóa (Mã đơn...)
}