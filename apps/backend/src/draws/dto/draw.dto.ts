import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  player1Id: string;

  @IsOptional()
  @IsString()
  player2Id?: string;

  @IsOptional()
  @IsBoolean()
  isSeed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  seedRank?: number;
}

export class UpdateRegistrationDto {
  @IsOptional()
  @IsString()
  player1Id?: string;

  @IsOptional()
  @IsString()
  player2Id?: string | null;

  @IsOptional()
  @IsBoolean()
  isSeed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  seedRank?: number | null;
}

export class GenerateDrawDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
