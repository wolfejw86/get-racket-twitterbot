import Fastify from 'fastify';

import app from './app';

const server = Fastify({ logger: true });

server.register(app);

if (require.main === module) {
    // called directly i.e. "node app"
    server.listen(3000, '0.0.0.0', (err) => {
        if (err) console.error(err);
        console.log('server listening on 3000');
    });
} else {
    // required as a module => executed on aws lambda
    module.exports = server;
}
