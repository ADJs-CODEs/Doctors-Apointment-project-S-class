import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express'

//user authentication middleware

const authUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "unauthorized user, Login again" })
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not Authorized Login Again' })
    }

    const token_decode = jwt.verify(token as string, process.env.JWT_SECRET as string) as { id: string }

    if (!req.body) { req.body = {} }
    console.log("--- MIDDLEWARE AUTH --- User ID:", token_decode.id);


    req.body.userId = token_decode.id;
    (req as any).userId = token_decode.id;
    next()

  } catch (error: any) {
    console.log("User Auth Error:", error)
    res.status(401).json({ success: false, message: error.message })
  }
}

export default authUser