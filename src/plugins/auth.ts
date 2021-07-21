import fp from 'fastify-plugin';
import cookie from 'fastify-cookie';
import session from 'fastify-session';
import csrf from 'fastify-csrf';
import grant from 'grant';

export default fp(async (fastify) => {
    return fastify
        .register(cookie)
        .register(session, {
            saveUninitialized: false,
            secret: fastify.appConfig.sessionSecret,
            cookie: {
                secure: process.env.NODE_ENV !== 'development',
            },
        })
        .register(csrf, { sessionPlugin: 'fastify-session' })
        .register(
            grant.fastify({
                defaults: {
                    transport: 'session',
                    origin: fastify.appConfig.appOrigin,
                },
                twitter: {
                    key: fastify.appConfig.twitterApiKey,
                    secret: fastify.appConfig.twitterApiSecret,
                    callback: '/user/signup',
                },
            }),
        );
});
