import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { FriendshipService } from '../Service/friendship.service';
import { Req, Query } from '@nestjs/common';
import { GatewayAuthGuard } from 'src/gateway-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ConversationService } from 'src/Service/conversation.service';
import { MessageService } from 'src/Service/message.service';

@Controller('api')
export class MessageController {
    constructor(
        private readonly messageService: MessageService,
    ) {}

    @Post('messages')
    @UseGuards(GatewayAuthGuard)
    async sendMessage(
        @Req() req: any,
        @Body() body: { conversationId: string; content: string }
    ) {
        const userId = req.user?.userId;
        const { conversationId, content } = body;

        return await this.messageService.sendMessage(userId, conversationId, content);
    }
}