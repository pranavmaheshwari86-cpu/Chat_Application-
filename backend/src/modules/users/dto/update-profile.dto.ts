import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  IsIn,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PortfolioItemDto {
  @ApiPropertyOptional()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsUrl()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnail?: string;
}

class SocialLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  github?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'LinkedIn-style headline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ enum: ['personal', 'creator', 'business', 'org'] })
  @IsOptional()
  @IsIn(['personal', 'creator', 'business', 'org'])
  accountType?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  skills?: string[];

  @ApiPropertyOptional({ type: [PortfolioItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
