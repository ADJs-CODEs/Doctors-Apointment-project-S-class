import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express'

//admin authentication middleware

const authUser = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { token } = req.headers
    if (!token) {
      return res.json({ success: false, message: 'Not Authorized Login Again' })
    }
    const token_decode = jwt.verify(token as string, process.env.JWT_SECRET as string) as { id: string }

    if (!req.body) { req.body = {} }
    console.log("--- MIDDLEWARE AUTH --- User ID:", token_decode.id);



    (req as any).userId = token_decode.id;
    next()

  } catch (error: any) {
    console.log("User Auth Error:", error)
    res.json({ success: false, message: error.message })
  }
}

export default authUser