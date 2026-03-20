import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express';

//admin authentication middleware

const authAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { atoken } = req.headers
    if (!atoken) {
      return res.json({ success: false, message: 'Not Authorized Login Again' })
    }
    const token_decode = jwt.verify(atoken as string, process.env.JWT_SECRET as string)

    if (token_decode !== process.env.ADMIN_EMAIL as string + process.env.ADMIN_PASSWORD as string) {
      return res.json({ success: false, message: 'Not Authorized Login Again' })
    }

    next()

  } catch (error: any) {
    console.log("Auth Error:", error)
    res.json({ success: false, message: error.message })
  }
}

export default authAdmin  