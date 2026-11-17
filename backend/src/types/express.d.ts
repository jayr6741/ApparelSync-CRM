declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; shopId: string; role: string };
    }
  }
}
export {};