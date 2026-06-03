export interface AuthenticatedUser {
  userId: string;
  brandId: string;
}

export interface JwtPayload {
  sub: string;
  brandId: string;
  jti: string;
}
