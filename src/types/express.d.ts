declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      brandId?: string;
      userId?: string;
    }
  }
}

export {};
