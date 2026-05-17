import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, Gender } from '@prisma/client';

export class TeamCompetitionItemDto {
  @IsEnum(EventType)
  eventType: EventType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder: number;
}

export class CreateTeamCompetitionDto {
  @IsString()
  @MinLength(1)
  tournamentId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  winThreshold: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeamCompetitionItemDto)
  items: TeamCompetitionItemDto[];
}

export class UpdateTeamCompetitionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  winThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeamCompetitionItemDto)
  items?: TeamCompetitionItemDto[];
}

export class TeamPlayerInputDto {
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

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  affiliation: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(10)
  @IsString({ each: true })
  playerIds: string[];
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  affiliation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReplaceTeamMembersDto {
  @IsArray()
  @ArrayMinSize(10)
  @IsString({ each: true })
  playerIds: string[];
}

export class ImportTeamPlayersDto {
  @IsString()
  @MinLength(1)
  teamName: string;

  @IsString()
  @MinLength(1)
  affiliation: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(10)
  @ValidateNested({ each: true })
  @Type(() => TeamPlayerInputDto)
  players: TeamPlayerInputDto[];
}

export class ParseQuickTeamDto {
  @IsString()
  @MinLength(1)
  teamName: string;

  @IsString()
  @MinLength(1)
  affiliation: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @MinLength(1)
  prompt: string;
}

export class GenerateTeamDrawDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class TeamLineupSelectionDto {
  @IsString()
  teamId: string;

  @IsString()
  teamCompetitionItemId: string;

  @IsString()
  player1Id: string;

  @IsOptional()
  @IsString()
  player2Id?: string;
}

export class SetTeamLineupsDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => TeamLineupSelectionDto)
  selections: TeamLineupSelectionDto[];

  @IsOptional()
  @IsBoolean()
  lock?: boolean;
}

export class AssignTeamMatchRefereeDto {
  @IsString()
  refereeId: string;
}

export class TeamCompetitionQueryDto {
  @IsOptional()
  @IsString()
  tournamentId?: string;
}

export class TeamMatchLineupQueryDto {
  @IsOptional()
  @IsBoolean()
  lockedOnly?: boolean;
}

export class QuickParsedAssignmentDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  names: string[];
}

export class QuickTeamPreviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickParsedAssignmentDto)
  assignments: QuickParsedAssignmentDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benchNames?: string[];
}
