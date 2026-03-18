

import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Cổng cors: true để Frontend gọi sang không bị chặn
@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server; // Đây là cái loa phát thanh của chúng ta

  handleConnection(client: Socket) {
    console.log(`[Socket] Có người kết nối: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket] Ngắt kết nối: ${client.id}`);
  }

  // Hàm này để các Service khác (như NotificationService) gọi ké để phát loa
  sendNotificationToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}