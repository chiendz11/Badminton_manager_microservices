import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import express from 'express'; 

// Import TypeDefs và Resolvers
import { typeDefs } from './graphql/schemas/center.schema.js'; 
import { resolvers } from './graphql/resolvers/center.resolver.js'; 

// IMPORT CÁC DATA SOURCES
import { CenterAPI } from './data_sources/center.api.js';
import { StorageAPI } from './data_sources/storage.api.js'; 

export async function startApolloServer(app) {
    const httpServer = http.createServer(app);

    // 1. KHỞI TẠO CÁC DATA SOURCES
    // Lưu ý: DataSources nên được khởi tạo mới cho mỗi request hoặc 
    // nếu dùng class stateless (như RESTDataSource cũ) thì có thể khởi tạo 1 lần.
    // Tuy nhiên với cách viết class API hiện tại của bạn (dùng axios instance), 
    // ta có thể khởi tạo ở đây để tái sử dụng instance axios.
    const centerAPI = new CenterAPI();
    const storageAPI = new StorageAPI();

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
        introspection: process.env.NODE_ENV !== 'production',
    });

    await server.start();

    app.use(
        '/graphql', 
        express.json(), 
        expressMiddleware(server, {
            // Context function chạy cho MỖI request
            context: async ({ req }) => {
                return { 
                    // Lấy thông tin User từ Header (do Auth Middleware truyền xuống)
                    userId: req.headers['x-user-id'],
                    userRole: req.headers['x-user-role'],
                    
                    // 2. INJECT DATA SOURCES VÀO CONTEXT
                    // Giúp Resolvers có thể truy cập qua context.dataSources
                    dataSources: {
                        centerAPI,
                        storageAPI
                    },
                };
            },
        }),
    );

    return httpServer;
}