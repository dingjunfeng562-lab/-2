import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'scores',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ScoringGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinMatch')
  joinMatch(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId?: string }) {
    if (!body?.matchId) return { ok: false, message: 'matchId required' };
    client.join(this.matchRoom(body.matchId));
    return { ok: true, matchId: body.matchId };
  }

  @SubscribeMessage('leaveMatch')
  leaveMatch(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId?: string }) {
    if (!body?.matchId) return { ok: false, message: 'matchId required' };
    client.leave(this.matchRoom(body.matchId));
    return { ok: true, matchId: body.matchId };
  }

  emitMatchState(matchId: string, state: unknown) {
    this.server.to(this.matchRoom(matchId)).emit('match:update', state);
    this.server.emit('scoreboard:update', state);
  }

  private matchRoom(matchId: string) {
    return `match:${matchId}`;
  }
}
