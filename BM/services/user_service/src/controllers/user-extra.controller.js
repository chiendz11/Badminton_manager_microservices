import { UserExtraService } from "../services/user-extra.service.js";

export const userExtraController = {
    async getUserExtra(req, res) {
        const userId = req.headers['x-user-id'];
        try {
            const userExtra = await UserExtraService.findByUserId(userId);
            if (!userExtra) {
                return res.status(404).json({ message: "User extra data not found" });
            }
            res.json(userExtra);
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async updateUserExtra(req, res) {
        const extraData = req.body;
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ message: "Authorization failed: User ID missing." });
        }
        try {
            const updatedExtra = await UserExtraService.publishUserExtraUpdate(userId, extraData);
            res.json(updatedExtra);
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}