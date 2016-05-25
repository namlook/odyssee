
import {
    preFetchDocument,
    preParsePayload,
} from './utils';

import streamRoute from './stream';
import { queryRoute as queryJsonApiRoute } from './json-api';

export default (options = {}) => ([ // eslint-disable-line no-unused-vars
    streamRoute({ path: '/i/stream' }),
    queryJsonApiRoute({ path: '/' }),
    {
        method: 'GET',
        path: '/{id}',
        config: {
            pre: [
                { method: preFetchDocument, assign: 'document' },
            ],
        },
        handler: (request, reply) => reply.ok(request.pre.document),
    },
    {
        method: ['POST', 'PUT', 'PATCH'],
        path: '/',
        config: {
            pre: [
                { method: preParsePayload, assign: 'documents' },
            ],
        },
        handler: (request, reply) => reply(request.db.saveStream(request.pre.documents)),
    },
    {
        method: 'DELETE',
        path: '/',
        config: {
            pre: [
                { method: preParsePayload, assign: 'documents' },
            ],
        },
        handler: (request, reply) => reply(request.db.deleteStream(request.pre.documents)),
    },
]);

/**
import routes from 'odyssee/routes';
export default routes;
*/


/**
import routes from 'odyssee/routes';

export default function(options) {
    const { createRoute, queryRoute, fetchRoute, deleteRoute } = routes(options);
    return {
        methods: {},
        routes: [ queryRoute, fetchRoute ]
    };
}
*/
