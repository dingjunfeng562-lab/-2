import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @MinLength(1)
  affiliation: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  affiliation?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
