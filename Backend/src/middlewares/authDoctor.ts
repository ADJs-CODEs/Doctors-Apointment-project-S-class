import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express';

//Doctor Authentication middleware
interface CustomRequest extends Request {
  docId?: string;
}

const authDoctor = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "unauthorized user, Login again" })
    }

    const dtoken = authHeader.split(" ")[1]

    const token_decode = jwt.verify(dtoken as string, process.env.JWT_SECRET as string) as { id: string }
    req.docId = token_decode.id
    next()
  } catch (error: any) {
    console.log("Doctor Auth Error", error)
    res.status(401).json({ success: false, message: error.message })

  }
}

export default authDoctor