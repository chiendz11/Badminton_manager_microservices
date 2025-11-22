import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { GraphQLError } from 'graphql';

import { connectDB } from './src/configs/db.config.js';
import { envConfig } from './src/configs/env.config.js';

// Import GraphQL Schema & Resolvers
import { typeDefs } from './src/graphql/schema.js';
import { resolvers } from './src/graphql/resolvers.js';

// 💡 IMPORT ROUTE REST (Cho Upload ảnh)
import centerRoutes from './src/routes/center.route.js';

const PORT = envConfig.PORT || 5003;

const startServer = async () => {
    try {
        await connectDB();

        // 1. Khởi tạo Express App
        const app = express();
        const httpServer = http.createServer(app);

        // 2. Cấu hình Apollo Server (Subgraph)
        const server = new ApolloServer({
            schema: buildSubgraphSchema({ typeDefs, resolvers }),
            plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
            csrfPrevention: false, // Tắt CSRF check
        });

        await server.start();

        // ⚠️ QUAN TRỌNG: Chỉ dùng express.json() cho các route KHÔNG PHẢI upload file
        // Hoặc cứ để nó ở đây, nhưng Multer trong centerRoutes sẽ tự xử lý multipart


        // -------------------------------------------------------
        // 💡 4. ĐĂNG KÝ REST ROUTES (QUAN TRỌNG CHO UPLOAD)
        // Endpoint: http://localhost:5003/api/v1/centers/files
        // -------------------------------------------------------
        app.use('/api/v1/centers', centerRoutes);
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        // -------------------------------------------------------
        // 💡 5. ĐĂNG KÝ GRAPHQL ENDPOINT
        // Endpoint: http://localhost:5003/ (Root)
        // -------------------------------------------------------
        app.use(
            '/',
            expressMiddleware(server, {
                context: async ({ req }) => {
                    // --- Logic Auth giữ nguyên ---
                    const serviceSecret = req.headers['x-service-secret'];
                    const serviceName = req.headers['x-service-name'];
                    const allowedServices = envConfig.ALLOWED_INTERNAL_SERVICES ? envConfig.ALLOWED_INTERNAL_SERVICES.split(',') : [];

                    // Chỉ check secret cho GraphQL, REST route có thể check trong controller/middleware riêng
                    if (serviceSecret && serviceSecret !== envConfig.INTERNAL_AUTH_SECRET) {
                        throw new GraphQLError('Forbidden: Invalid internal service secret.', {
                            extensions: { code: 'FORBIDDEN', http: { status: 403 } },
                        });
                    }

                    // Gateway gửi xuống header user, lấy ra để dùng trong resolver
                    const userId = req.headers['x-user-id'];
                    const userRole = req.headers['x-user-role'];

                    return { userId, userRole };
                },
            })
        );

        // 6. Lắng nghe cổng
        await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

        console.log(`-------------------------------------------------`);
        console.log(`🚀 Center Service running at http://localhost:${PORT}`);
        console.log(`   - GraphQL: http://localhost:${PORT}/`);
        console.log(`   - REST:    http://localhost:${PORT}/api/v1/centers`);
        console.log(`ENV: ${envConfig.NODE_ENV}`);
        console.log(`-------------------------------------------------`);

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};

startServer();