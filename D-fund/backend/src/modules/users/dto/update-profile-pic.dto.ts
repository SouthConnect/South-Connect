import { IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateProfilePicDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsNotEmpty()
  profilePic: string;
}
