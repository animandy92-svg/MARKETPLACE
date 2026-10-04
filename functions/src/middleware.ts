import { Request, Response } from "express";
import { auth } from "./firebase";

export async function verifyAuth(req: Request, res: Response, next: () => void | Promise<void>): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).user = decoded;
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
  await next();
}
