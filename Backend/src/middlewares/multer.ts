import multer, { type StorageEngine } from 'multer'
import type { Request } from 'express'

const storage: StorageEngine = multer.diskStorage({
  filename: function (req: Request, file: Express.Multer.File, callback) {
    callback(null, file.originalname)
  }
})

const upload = multer({ storage })

export default upload