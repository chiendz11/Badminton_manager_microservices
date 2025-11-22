import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import express from 'express'; 
// ❌ XÓA DÒNG NÀY: import cors from 'cors'; 
import { CENTER_SERVICE_URL, INTERNAL_AUTH_SECRET } from './configs/env.config.js';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.userId) {
      request.http.headers.set('x-user-id', context.userId);
    }
    if (context.userRole) {
      request.http.headers.set('x-user-role', context.userRole);
    }
    request.http.headers.set('x-service-secret', INTERNAL_AUTH_SECRET);
    request.http.headers.set('x-service-name', 'graphql-gateway');
  }
}

export async function startApolloServer(app) {
    const httpServer = http.createServer(app);

    const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
            subgraphs: [
                { name: 'centers', url: CENTER_SERVICE_URL || 'http://localhost:5003' }, 
            ],
            pollIntervalInMs: 10000, 
        }),
        buildService({ name, url }) {
            return new AuthenticatedDataSource({ url });
        },
        debug: true,
    });

    const server = new ApolloServer({
        gateway,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
        introspection: true, 
    });

    await server.start();

    app.use(
        '/graphql', 
        // ❌ XÓA DÒNG NÀY: cors(), <-- Đây là thủ phạm gây lỗi *
        // Lý do: CORS đã được xử lý global ở server.js rồi, không cần set lại ở đây nữa.
        express.json(), 
        expressMiddleware(server, {
            context: async ({ req }) => {
                return { 
                    userId: req.headers['x-user-id'],
                    userRole: req.headers['x-user-role'],
                };
            },
        }),
    );

    return httpServer;
}