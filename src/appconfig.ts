import dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
    twitterApiKey: loadEnv('TWITTER_API_KEY'),
    twitterApiSecret: loadEnv('TWITTER_API_SECRET'),
    sessionSecret: loadEnv('SESSION_SECRET'),
    appOrigin: loadEnv('APP_ORIGIN'),
};

function loadEnv(k: string) {
    const v = process.env[k];

    if (!v) throw new Error(`${k} is required .env variable`);

    return v;
}

declare module 'fastify' {
    export interface FastifyInstance {
        appConfig: typeof appConfig;
    }
}
