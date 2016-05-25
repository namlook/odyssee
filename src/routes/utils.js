
import _ from 'lodash';
import highland from 'highland';
import { queryValidator } from 'archimedes';

// const runQueryOld = (db, modelName, query, reply) => {
//     let { limit } = query;
//     limit = limit === undefined ? 20 : limit;
//     limit = limit === 0 ? undefined : limit;
//
//     const queryWithLimit = Object.assign({}, query, { limit });
//     queryValidator(db, modelName).validate(queryWithLimit).then((validatedQuery) => {
//         if (limit < 100) {
//             db.queryStream(modelName, validatedQuery)
//                 .errors((err) => reply.badRequest(err))
//                 .toArray((results) => reply.ok(results));
//         } else {
//             const results = highlandToJsonStream(db.queryStream(modelName, validatedQuery));
//             reply.stream(results);
//         }
//     }).catch((error) => (
//         error.name === 'ValidationError'
//             ? reply.badRequest(error.message, error.extra)
//             : reply.badImplementation(error)
//     ));
// };

export const runQuery = (db, modelName, query, callback) => {
  let { limit } = query;
  limit = limit === undefined ? 20 : limit;
  limit = limit === 0 ? undefined : limit;

  const queryWithLimit = Object.assign({}, query, { limit });
  queryValidator(db, modelName).validate(queryWithLimit).then((validatedQuery) => {
    callback(null, db.queryStream(modelName, validatedQuery));
  }).catch(callback);
};


export const highlandToJsonStream = (stream) => highland([
  highland(['{"data":[']),
  stream.map(JSON.stringify).intersperse(','),
  highland([']}']),
]).sequence();


export const preParsePayload = (request, reply) => {
  const { payload } = request;

  let parsedPayload = null;
  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload);
    } catch (parseError) {
      return reply.badRequest('The payload should be a valid JSON', { payload, parseError });
    }
    parsedPayload = _.isArray(parsedPayload) ? parsedPayload : [parsedPayload];
  }
  return reply(payload);
};

/**
 * Prefetch the document
 * If request.params.id and request.Model exist, fetch the document
 * and attach it to request.pre.document
 */
export const preFetchDocument = (request, reply) => {
  const { modelName, params, db } = request;
  if (modelName && params.id) {
    const query = {
      filter: { _id: params.id },
    };

    return db.queryStream(modelName, query)
      .stopOnError((err) => reply.badImplementation(err))
      .toArray(documents => { // eslint-disable-line arrow-body-style
        return documents.length === 0
          ? reply.notFound()
          : reply(documents[0]);
      });
  }
  return reply();
};
