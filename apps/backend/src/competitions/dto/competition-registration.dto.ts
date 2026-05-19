import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitCompetitionRegistrationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  studentId: string;

  @IsString()
  @MinLength(1)
  className: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsIn(['MALE', 'FEMALE', '男', '女'])
  gender: 'MALE' | 'FEMALE' | '男' | '女';

  @IsIn(['MENS_SINGLES', 'WOMENS_SINGLES', '男子单打', '女子单打'])
  eventName: 'MENS_SINGLES' | 'WOMENS_SINGLES' | '男子单打' | '女子单打';

  @IsOptional()
  @IsString()
  remark?: string;
}

export class RejectRegistrationDto {
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
