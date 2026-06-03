import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { DEMO_BRAND_ID, DEMO_USER_EMAIL } from '../../common/demo.constants';

export class RegisterDto {
  @ApiProperty({ example: DEMO_BRAND_ID })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  brandId!: string;

  @ApiProperty({ example: DEMO_USER_EMAIL })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
