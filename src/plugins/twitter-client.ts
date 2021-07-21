import qs from 'querystring';

import fp from 'fastify-plugin';
import TwitterV2 from 'twitter-v2';
import Twitter from 'twitter';

interface TweetSearchResponse {
    data: Array<{ author_id: string; id: string; text: string }>;
    includes: {
        users: Array<{
            id: string;
            name: string;
            profile_image_url: string;
            username: string;
        }>;
    };
}

interface ReplyTweetParams {
    in_reply_to_status_id: string;
    status: string;
}

export default fp(async (fastify) => {
    const { twitterApiKey, twitterApiSecret } = fastify.appConfig;

    function getTwitterClient(
        consumer_key: string,
        consumer_secret: string,
        access_token_key: string,
        access_token_secret: string,
    ) {
        return new TwitterV2({
            consumer_key,
            consumer_secret,
            access_token_key,
            access_token_secret,
        });
    }

    function getTwitterV1Client(
        consumer_key: string,
        consumer_secret: string,
        access_token_key: string,
        access_token_secret: string,
    ) {
        return new Twitter({
            consumer_key,
            consumer_secret,
            access_token_key,
            access_token_secret,
        });
    }

    fastify.decorate(
        'getTwitterClient',
        (access_token_key: string, access_token_secret: string) =>
            getTwitterClient(
                twitterApiKey,
                twitterApiSecret,
                access_token_key,
                access_token_secret,
            ),
    );
    fastify.decorate(
        'getTwitterV1Client',
        (access_token_key: string, access_token_secret: string) =>
            getTwitterV1Client(
                twitterApiKey,
                twitterApiSecret,
                access_token_key,
                access_token_secret,
            ),
    );

    const tweetFields = ['id', 'text', 'author_id'];

    fastify.decorate('getTweets', (twitterClient: TwitterV2, query: string) =>
        twitterClient.get(
            `tweets/search/recent?${qs.stringify({
                query: `@racket100 ${query} -is:retweet`,
                'tweet.fields': tweetFields.join(','),
                'user.fields': 'id,name,profile_image_url,username',
                expansions: 'author_id',
                max_results: 100,
            })}`,
        ),
    );

    /**
     * in order to be a full reply tweet, the user must be tagged in the status string
     * ie - @userIAmReplyingTo
     */
    fastify.decorate(
        'askForFollow',
        (
            twitterClient: Twitter,
            { in_reply_to_status_id, status }: ReplyTweetParams,
        ) => {
            return twitterClient.post('/statuses/update', {
                in_reply_to_status_id,
                status,
            });
        },
    );
});

declare module 'fastify' {
    export interface FastifyInstance {
        getTwitterClient: (
            access_token_key: string,
            access_token_secret: string,
        ) => TwitterV2;
        getTwitterV1Client: (
            access_token_key: string,
            access_token_secret: string,
        ) => Twitter;
        getTweets: (
            twitterClient: TwitterV2,
            query: string,
        ) => Promise<TweetSearchResponse>;
        askForFollow: (
            twitterClient: Twitter,
            params: ReplyTweetParams,
        ) => Promise<any>;
    }
}
