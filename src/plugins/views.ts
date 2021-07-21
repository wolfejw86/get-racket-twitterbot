import { join } from 'path';

import { glob } from 'glob';
import fp from 'fastify-plugin';
import pov from 'point-of-view';
import handlebars from 'handlebars';

export default fp(async (fastify) => {
    const viewDirPath = join(__dirname, '../../views');

    const partialFiles = await new Promise<string[]>((resolve, reject) =>
        glob(`${viewDirPath}/partials/**/*.html`, (err, files) => {
            err ? reject(err) : resolve(files);
        }),
    );

    const FILENAME_RE = /.*\/([a-zA-Z]*)\.html/;

    const partials = partialFiles
        .map((file) => {
            const partialName = FILENAME_RE.exec(file);
            const partial = partialName?.[1];

            return { [partial!]: file.replace(viewDirPath, '') };
        })
        .reduce((allPartials, next) => ({ ...allPartials, ...next }));

    return fastify.register(pov, {
        engine: { handlebars },
        options: { partials },
        root: viewDirPath,
        viewExt: 'html',
        defaultContext: {
            title: 'Get Racket!',
            isLoggedIn: false,
            environment:
                process.env.NODE_ENV !== 'development'
                    ? 'production'
                    : 'development',
        },
    });
});
