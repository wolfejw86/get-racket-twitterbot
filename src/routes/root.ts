import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

function updateLocals(reply: FastifyReply, update: Record<string, any>) {
    if (reply.locals) {
        reply.locals = { ...reply.locals, ...update };
    } else {
        reply.locals = update;
    }
}

function getSessionCreds(request: FastifyRequest) {
    const {
        twitter: { access_secret, access_token },
    } = request.session.user;

    return { access_secret, access_token_key: access_token };
}

class ForbiddenException extends Error {
    statusCode = 403;
    constructor(message: string) {
        super(message);
    }
}

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.addHook('onRequest', async (request, reply) => {
        updateLocals(reply, {
            csrf: await reply.generateCsrf(),
        });
    });

    fastify.addHook('preHandler', async (request, reply) => {
        updateLocals(reply, { isLoggedIn: !!request.session.user });
    });

    fastify.get('/', async (request, reply) => {
        return reply.view('index');
    });

    fastify.get<{ Querystring: { query: string } }>(
        '/tweets',
        {
            onRequest: fastify.csrfProtection,
            preHandler: async (request) => {
                if (!request.session.user) {
                    throw new ForbiddenException('Must be logged in');
                }
            },
        },
        async (request) => {
            const { access_secret, access_token_key } = getSessionCreds(
                request,
            );

            const client = fastify.getTwitterClient(
                access_token_key,
                access_secret,
            );

            const tweets = await fastify.getTweets(client, request.query.query);

            return tweets.data.map((tweet) => {
                return {
                    ...tweet,
                    author: tweets.includes.users.find(
                        (u) => u.id === tweet.author_id,
                    ),
                };
            });
        },
    );

    fastify.post<{ Body: { status: string; reply_to_status_id: string } }>(
        '/tweet',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['status', 'reply_to_status_id'],
                    properties: {
                        status: { type: 'string' },
                        reply_to_status_id: {
                            type: 'string',
                            description:
                                'For this field to work, the author username must be tagged in the status field',
                        },
                    },
                },
            },
            onRequest: fastify.csrfProtection,
            preHandler: async (request) => {
                if (!request.session.user) {
                    throw new ForbiddenException('Must be logged in');
                }
            },
        },
        async (request, reply) => {
            const { access_secret, access_token_key } = getSessionCreds(
                request,
            );
            const { reply_to_status_id, status } = request.body;
            const client = fastify.getTwitterV1Client(
                access_token_key,
                access_secret,
            );

            try {
                const response = await fastify.askForFollow(client, {
                    status,
                    in_reply_to_status_id: reply_to_status_id,
                });
                reply.code(201);

                return response;
            } catch (error) {
                fastify.log.error(error);
                throw error;
            }
        },
    );

    fastify.get('/user/signup', async (request, reply) => {
        const { access_secret, access_token } = request.session.grant.response;

        request.session.user = { twitter: { access_secret, access_token } };

        return reply.redirect(`${fastify.appConfig.appOrigin}/`);
    });
};

export default root;
