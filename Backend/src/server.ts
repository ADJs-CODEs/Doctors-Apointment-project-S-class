import "dotenv/config";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRoute from "./routes/userRoute.js";
import chatRouter from "./routes/chatRoute.js";
import connectionRouter from "./routes/connectionRoute.js";
import wishWellRouter from "./routes/wishWellRoute.js";
import notificationRouter from "./routes/notificationRoute.js";
import emojiRouter from "./routes/emojiRoute.js";

const app: Application = express();
const httpServer = createServer(app);

// Socket.io setup
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // User registers their socket
  socket.on("register", (userId: string) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log("Socket disconnected:", socket.id);
  });
});

// Export function to send emoji to a user
export const sendEmojiToUser = (userId: string, data: any) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit("emoji_received", data);
    return true;
  }
  return false;
};

const port = process.env.PORT || 4000;

connectDB();
connectCloudinary();

app.use(express.json());
app.use(cors());

app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRoute);
app.use("/api/chat", chatRouter);
app.use("/api/connections", connectionRouter);
app.use("/api/wish-well", wishWellRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/emoji", emojiRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("API is fully WORKING");
});

httpServer.listen(port, () => console.log("Server Started on port", port));
