import { ApiProperty } from '@nestjs/swagger';
import { DEMO_BRAND_ID, DEMO_USER_EMAIL } from '../../common/demo.constants';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: DEMO_BRAND_ID })
  brandId!: string;

  @ApiProperty({ example: DEMO_USER_EMAIL })
  email!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
