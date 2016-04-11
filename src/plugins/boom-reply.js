
import _ from 'lodash';
import Boom from 'boom';
import stream from 'stream';

/**
 * fill `reply` with Boom helpers
 */
export default function boomReply(plugin) {
    _.forOwn(Boom, (fn, name) => {
        plugin.decorate('reply', name, function decorateReply(message, data) {
            const boomError = fn(message);
            if (data) {
                boomError.output.payload.infos = data;
            }
            return this.response(boomError);
        });
    });

    plugin.decorate('reply', 'stream', function streamReply(highlandStream) {
        return this.response(new stream.Readable().wrap(highlandStream))
            .type('application/json');
    });

    plugin.decorate('reply', 'ok', function okReply(results) {
        return this.response(results);
    });

    plugin.decorate('reply', 'created', function createdReplay(results) {
        return this.response(results).code(201);
    });

    plugin.decorate('reply', 'accepted', function acceptedReply(results) {
        return this.response(results).code(202);
    });

    plugin.decorate('reply', 'noContent', function noContentReply() {
        return this.response().code(204);
    });

    // plugin.decorate('reply', 'jsonApi', function(results) {
    //     let {data, links, included} = results;
    //     return this.response({data, links, included})
    //                .type('application/vnd.api+json');
    // });
}
