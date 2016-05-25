
import joi from 'joi';
import _ from 'lodash';

import { runQuery, highlandToJsonStream } from './utils';

const streamQueryToArchimedesQuery = (resourceSchema, resourceQuery) => {
    const fields = resourceQuery.fields || {};
    const filter = resourceQuery.filter || {};
    const aggregate = _(resourceQuery.aggregate || {})
        .toPairs()
        .map(([fieldName, aggregation]) => {
            const aggregator = aggregation.$property
                ? aggregation
                : {
                    $aggregator: Object.keys(aggregation)[0],
                    $property: _.values(aggregation)[0],
                };

            return [fieldName, aggregator];
        })
        .fromPairs()
        .value();

    const sort = resourceQuery.sort || [];

    const fieldsProperties = _.values(fields);
    const filterProperties = Object.keys(filter);
    const aggregateProperties = _.values(aggregate).map((aggregation) => aggregation.$property);

    const resourceFields = resourceSchema.fields || [];

    const validFields = _.intersection(fieldsProperties, resourceFields);
    const validFilter = _.intersection(filterProperties, resourceSchema.filter || []);
    const validAggregate = _.intersection(aggregateProperties, resourceSchema.aggregate || []);
    const _resourceSort = resourceSchema.sort || [];
    const validSort = [].concat(_resourceSort, _resourceSort.map((o) => `-${o}`));

    const archimedesFields = _.isEmpty(fields)
        ? resourceFields.reduce((acc, o) => Object.assign({}, acc, { [o]: o }), {})
        : _.pickBy(fields, (o) => validFields.indexOf(o) > -1);

    return {
        field: archimedesFields,
        filter: _.pick(filter, validFilter),
        aggregate: _.pickBy(aggregate, (o) => validAggregate.indexOf(o.$property) > -1),
        sort: _.intersection(sort, validSort),
        limit: resourceQuery.limit,
        offset: resourceQuery.offset,
        distinct: resourceQuery.distinct,
    };
};

const streamQueryValidation = (resourceSchema) => (query, options, next) => {
    const validFieldsProperties = resourceSchema.fields || [];
    const validFilterProperties = resourceSchema.filter || [];
    const validAggregateProperties = resourceSchema.aggregate || [];
    const _sortProperties = resourceSchema.sort || [];
    const validSortProperties = [].concat(_sortProperties, _sortProperties.map((o) => `-${o}`));

    const queryFieldsProperties = _.values(query.fields || {});
    const queryFilterProperties = Object.keys(query.filter || {});
    const queryAggregateProperties = [].concat(
        _(query.aggregate)
        .values(query.aggregate)
        .flatMap((aggregation) => (
          aggregation.$property
            ? [aggregation.$property]
            : _.values(aggregation)
        ))
        .value()
    );

    let querySortProperties;
    try {
      querySortProperties = JSON.parse(query.sort);
    } catch (e) {
      querySortProperties = [];
    }

    const validateProperties = (validProperties, queryProperties, scope) => {
        const validFields = _.intersection(validProperties, queryProperties);
        if (validFields.length !== queryProperties.length) {
            const unexposedFields = _.difference(queryProperties, validFields);
            next(new Error(`unknown properties ${JSON.stringify(unexposedFields)} in ${scope}`));
        }
    };

    validateProperties(validFieldsProperties, queryFieldsProperties, 'fields');
    validateProperties(validFilterProperties, queryFilterProperties, 'filter');
    validateProperties(validAggregateProperties, queryAggregateProperties, 'aggregate');
    validateProperties(validSortProperties, querySortProperties, 'sort');


    const _queryValidator = {
        limit: joi.number().min(0),
        offset: joi.number().min(0),
        sort: joi.array().items(joi.string()),
        fields: joi.object(),
        filter: joi.alternatives().try(
            joi.object().pattern(/.+/, joi.object().pattern(/.+/,
                joi.alternatives().try(
                    joi.array().items(joi.any()),
                    joi.any()
                )
            )),
            joi.any()
        ),
        aggregate: joi.object(),
        distinct: joi.boolean(),
    };

    joi.validate(query, _queryValidator, next);
};


const queryRoute = (routeExpositionConfig) => {
    const { path: routePath, expose: resourceQuerySchema } = routeExpositionConfig;
    return {
        method: 'GET',
        path: routePath,
        config: {
            validate: {
                query: streamQueryValidation(resourceQuerySchema),
            },
        },
        handler: (request, reply) => {
            const { db, modelName, query } = request;

            const archimedesQuery = streamQueryToArchimedesQuery(resourceQuerySchema, query);
            runQuery(db, modelName, archimedesQuery, (error, stream) => {
                if (error) {
                    return error.name === 'ValidationError'
                        ? reply.badRequest(error.message, error.extra)
                        : reply.badImplementation(error);
                }
                const results = highlandToJsonStream(stream);
                return reply.stream(results);
            });
        },
    };
};

const exposeAllProperties = (modelSchema) => {
  const { properties } = modelSchema;
  const exposedFields = Object.keys(properties)
    .reduce((acc, propertyName) => {
      const fields = [...(acc.fields || []), propertyName];
      const aggregate = [...(acc.aggregate || []), propertyName];
      const filter = [...(acc.filter || []), propertyName];
      const sort = [...(acc.sort || []), propertyName];
      return { fields, aggregate, filter, sort };
    }, {});
  exposedFields.fields = ['_id', '_type', ...exposedFields.fields];
  exposedFields.aggregate = ['_id', '_type', ...exposedFields.aggregate];
  exposedFields.filter = ['_id', '_type', ...exposedFields.filter];
  exposedFields.sort = ['_id', '_type', ...exposedFields.sort];
  return exposedFields;
};

export { queryRoute, exposeAllProperties };
