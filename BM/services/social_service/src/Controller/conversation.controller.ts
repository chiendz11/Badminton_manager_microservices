import { Controller, UseGuards } from "@nestjs/common"
import { ConversationService } from "../Service/conversation.service"
import { Req, Get, Post, Query } from "@nestjs/common";
import { GatewayAuthGuard } from 'src/gateway-auth.guard';


@Controller("api")
export class ConversationController {
    constructor(
        private readonly conversationService: ConversationService
    ) {}

    @Get('conversations')
    @UseGuards(GatewayAuthGuard)
    async getMyConversations(
        @Req() req: any, 
        @Query('friendId') friendId: string // Define it as an optional Query param
    ) {
        const userId = req.user?.userId;

        // 1. If friendId is provided, get the specific chat with messages
        if (friendId) {
            return await this.conversationService.getConversation(userId, friendId);
        }

        // 2. Otherwise, get the list of all conversations
        return await this.conversationService.getAllConversations(userId);
    }
}