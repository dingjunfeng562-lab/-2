import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { EventType, Format, ScoringRule, ScoringMode } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  tournamentId: string;

  @IsEnum(EventType)
  type: EventType;

  @IsEnum(Format)
  format: Format;

  @IsEnum(ScoringRule)
  scoringRule: ScoringRule;

  @IsEnum(ScoringMode)
  scoringMode: ScoringMode;

  @IsOptional()
  @IsInt()
  @Min(2)
  groupSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qualifiersPerGroup?: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsEnum(Format)
  format?: Format;

  @IsOptional()
  @IsEnum(ScoringRule)
  scoringRule?: ScoringRule;

  @IsOptional()
  @IsEnum(ScoringMode)
  scoringMode?: ScoringMode;

  @IsOptional()
  @IsInt()
  @Min(2)
  groupSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qualifiersPerGroup?: number;
}
