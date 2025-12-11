import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../Service/message.service';

// cors: origin * allows your React app to connect from any port
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  // 1. Handle Connection
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // You can extract the User ID from the token here if needed
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // 2. User joins a specific conversation (Room)
  @SubscribeMessage('joinConversation')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(conversationId);
    console.log(`Client ${client.id} joined room ${conversationId}`);
  }

  // 3. User leaves a conversation
  @SubscribeMessage('leaveConversation')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.leave(conversationId);
  }

  // 4. Handle Sending Messages
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() payload: { senderId: string; conversationId: string; content: string },
  ) {
    // A. Save to Database using your existing Service
    const savedMessage = await this.messageService.sendMessage(
      payload.senderId,
      payload.conversationId,
      payload.content,
    );

    // B. Emit to EVERYONE in that specific room (including sender)
    this.server.to(payload.conversationId).emit('newMessage', savedMessage);
  }
}