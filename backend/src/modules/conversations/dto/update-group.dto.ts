import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  onlyAdminsCanSend?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  onlyAdminsCanEdit?: boolean;
}
