import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "./const";

export function userMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization ?? "";
  try {
    const decoded = jwt.verify(authHeader, config.USER_JWT_SECRET);
    // @ts-ignore
    if (decoded.userId) {
      // @ts-ignore
      req.userId = decoded.userId;
      // @ts-ignore
      next();
    } else {
      res.status(403).json({ message: "you are not logged in" });
    }
  } catch (e) {
    res.status(403).json({ message: "you are not logged in" });
  }
}

export function workerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization ?? "";
  try {
    const decoded = jwt.verify(authHeader, config.WORKER_JWT_SECRET);
    // @ts-ignore
    if (decoded.workerId) {
      // @ts-ignore
      req.workerId = decoded.workerId;
      next();
    } else {
      res.status(403).json({ message: "you are not logged in" });
    }
  } catch (e) {
    res.status(403).json({ message: "you are not logged in" });
  }
}
