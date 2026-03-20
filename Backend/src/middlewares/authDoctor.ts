import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express';

const authDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dtoken } = req.headers
    if (!dtoken) {
      return res.json({ success: false, message: "unauthorized user, Login again" })
    }
    const token_decode = jwt.verify(dtoken as string, process.env.JWT_SECRET as string) as { id: string }
    req.docId = token_decode.id
    next()
  } catch (error: any) {
    console.log("Doctor Auth Error", error)
    res.json({ success: false, message: error.message })

  }
}

export default authDoctor