import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

// Live emoji pings. After connecting, the web app emits "register" with the user's id;
// we remember which socket belongs to which user and push "emoji_received" to them.
// The map lives in memory, so it resets on restart and only works with one server
// instance. Pings that can't be delivered live are stored and fetched later instead.
@WebSocketGateway({ cors: { origin: '*', methods: ['GET', 'POST'] } })
export class RealtimeGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly connectedUsers = new Map<string, string>();

  @SubscribeMessage('register')
  register(@MessageBody() userId: string, @ConnectedSocket() socket: Socket) {
    if (typeof userId === 'string' && userId) this.connectedUsers.set(userId, socket.id);
  }

  handleDisconnect(socket: Socket) {
    for (const [userId, socketId] of this.connectedUsers) {
      if (socketId === socket.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  /** Returns true when the user was online and received the emoji live. */
  sendEmojiToUser(userId: string, data: Record<string, unknown>): boolean {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) return false;
    this.server.to(socketId).emit('emoji_received', data);
    return true;
  }
}
