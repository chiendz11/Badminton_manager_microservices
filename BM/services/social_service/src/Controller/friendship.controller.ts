import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { FriendshipService } from '../Service/friendship.service';
import { Req, Query } from '@nestjs/common';
import { GatewayAuthGuard } from 'src/gateway-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ConversationService } from 'src/Service/conversation.service';


@Controller("api")
export class FriendshipController {
    constructor(
        private readonly friendshipService: FriendshipService,
        private readonly conversationService: ConversationService
    ) {}

    @Get('search-friends')
    @UseGuards(GatewayAuthGuard)
    async SearchFriends(@Req() req: any, @Query('keyword') keyword: string) {
        const userId = req.user?.userId;
        return this.friendshipService.getMeiliSearchResultFilteredByFriendshipStatus(userId, keyword);
    }

    @Post('decline-request')
    @UseGuards(GatewayAuthGuard)
    async declineFriendRequest(
        @Req() req: any, 
        @Body('friendId') friendId: string
    ) {
        const userId = req.user?.userId;
        const result = await this.friendshipService.deleteFriend(userId, friendId);
        
        return {
            message: "Friend request declined",
            result
        };
    }

    @Post('accept-request') 
    @UseGuards(GatewayAuthGuard)
    async acceptFriendRequest(
        @Req() req: any, 
        @Body('friendId') friendId: string
    ) {
        const userId = req.user?.userId;

        const friendship = await this.friendshipService.acceptFriendRequest(userId, friendId);

        await this.conversationService.initConversation(friendship);

        return {
            message: "Friend request accepted and conversation started",
            friendship
        };
    }

    @Post('send-request')
    @UseGuards(GatewayAuthGuard)
    async sendFriendRequest(
        @Req() req: any, 
        @Body('friendId') friendId: string
    ) {
        const userId = req.user?.userId;

        // Ensure this method exists in your FriendshipService
        const result = await this.friendshipService.createFriendship(userId, friendId);

        return {
            message: "Friend request sent successfully",
            result
        };
    }

    @Delete('remove-friend')
    @UseGuards(GatewayAuthGuard)
    async removeFriend(
        @Req() req: any, 
        @Body('friendId') friendId: string
    ) {
        const userId = req.user?.userId;
        
        const result = await this.friendshipService.deleteFriend(userId, friendId);

        return {
            message: "Friend removed successfully",
            result
        };
    }

    @Get('my-friends')
    @UseGuards(GatewayAuthGuard)
    async getMyFriends(@Req() req: any) {
        const userId = req.user?.userId;
        return await this.friendshipService.getUserFriends(userId);
    }

    @Get('pending-requests')
    @UseGuards(GatewayAuthGuard)
    async getPendingRequests(@Req() req: any) {
        const userId = req.user?.userId;
        return await this.friendshipService.getPendingRequests(userId);
    }
}