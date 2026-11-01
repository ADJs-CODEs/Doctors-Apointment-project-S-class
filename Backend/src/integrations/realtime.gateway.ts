import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';

const room = (role: 'patient' | 'doctor', id: string) => `${role}:${id}`;

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

  // Chat uses rooms joined with a verified token instead (register trusts any id, which
  // is fine for emoji pings but not for private messages). Every tab joins its own room.
  @SubscribeMessage('auth')
  auth(@MessageBody() body: { token?: string; role?: string }, @ConnectedSocket() socket: Socket) {
    const role = body?.role === 'doctor' ? 'doctor' : 'patient';
    try {
      const decoded = jwt.verify(body?.token ?? '', process.env.JWT_SECRET as string) as { id?: string };
      if (decoded?.id) socket.join(room(role, decoded.id));
    } catch {
      // bad or expired token: no room, no messages
    }
  }

  /** Pushes an event to everyone connected (e.g. a big Wish Well gift). Nothing private. */
  emitAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  /** Pushes an event to every open tab of a patient or doctor. */
  emitTo(role: 'patient' | 'doctor', id: string, event: string, data: unknown) {
    this.server.to(room(role, id)).emit(event, data);
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
