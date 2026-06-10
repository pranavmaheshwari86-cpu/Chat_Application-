import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];
}
