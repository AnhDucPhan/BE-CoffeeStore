
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string; // VD: Sữa, Trái cây...

  @IsString()
  @IsOptional()
  description?: string;
}