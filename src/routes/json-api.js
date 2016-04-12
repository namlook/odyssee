
import _ from 'lodash';
import joi from 'joi';
import highland from 'highland';
import { runQuery } from './utils';


const jsonApiQueryToArchimedesQuery = (resourceSchema, resourceQuery) => {
    const resourceFilter = resourceSchema.filter || {};
    const queryFilter = resourceQuery.filter || {};

    const archimedesFilter = Object.keys(queryFilter || {}).reduce((acc, fieldName) => {
        const propertyName = resourceFilter[fieldName];
        const value = queryFilter[fieldName];
        return Object.assign({}, acc, { [propertyName]: value });
    }, {});

    return {
        field: resourceSchema.fields || {},
        aggregate: resourceSchema.aggregate || {},
        filter: archimedesFilter,
        sort: resourceQuery.sort || [],
    };
};


const _jsonApiQueryValidator = (resourceSchema) => {
    const resourceFields = resourceSchema.fields || {};
    const resourceFilter = resourceSchema.filter || {};
    const resourceSort = resourceSchema.sort || [];

    const filterValidation = Object.keys(resourceFilter).reduce((acc, fieldName) => (
        Object.assign({}, acc, { [fieldName]: joi.any() })
    ), {});

    const validSortFields = [].concat(resourceSort, resourceSort.map((o) => `-${o}`));

    return {
        page: joi.object().keys({
            limit: joi.number().min(0),
            offset: joi.number().min(0),
        }),
        sort: joi.array().items(joi.string().valid(validSortFields)),
        fields: joi.array().items(joi.string().valid(Object.keys(resourceFields))),
        filter: joi.object().keys(filterValidation),
    };
};

const jsonApiQueryValidation = (resourceSchema) => (_query, options, next) => {
    const toArray = (arrayOrString) => {
        if (_.isArray(arrayOrString)) {
            return arrayOrString;
        }
        return arrayOrString && !_.startsWith(arrayOrString, '["') // it's not an array string
            ? arrayOrString.split(',')
            : arrayOrString || [];
    };

    const sort = toArray(_query.sort);
    const fields = toArray(_query.fields);
    const query = Object.assign({}, _query, { sort, fields });
    joi.validate(query, _jsonApiQueryValidator(resourceSchema), next);
};

const pojo2jsonApi = (modelSchema, resourceSchema) => (pojo) => (
    Object.keys(pojo).map((fieldName) => {
        const _propertyName = _.get(resourceSchema, `fields.${fieldName}`);
        const aggregationField = `aggregate.${fieldName}.$property`;
        const propertyName = _propertyName || _.get(resourceSchema, aggregationField);
        const property = modelSchema.getProperty(propertyName);
        return { fieldName, property };
    }).reduce((acc, o) => {
        const value = pojo[o.fieldName];
        if (o.fieldName === '_id') {
            _.set(acc, 'id', value);
        } else if (o.fieldName === '_type') {
            _.set(acc, 'type', value);
        } else if (o.property.isRelation()) {
            const newValue = !_.isArray(value)
                ? { id: value, type: o.property.type }
                : value.map((val) => ({ id: val, type: o.property.type }));
            _.set(acc, `relationships.${o.fieldName}.data`, newValue);
        } else {
            _.set(acc, `attributes.${o.fieldName}`, value);
        }
        return acc;
    }, {})
);

const queryRoute = (routeExpositionConfig) => {
    const { path: routePath, expose: resourceQuerySchema } = routeExpositionConfig;
    return {
        method: 'GET',
        path: routePath,
        config: {
            validate: {
                query: jsonApiQueryValidation(resourceQuerySchema),
            },
        },
        handler(request, reply) {
            const { db, modelName, query } = request;

            /** handle "fields" restriction and add _id and _type fields **/
            const { fields: resourceFieldSchema } = resourceQuerySchema;
            const _fields = query.fields.length
                ? _.pick(resourceFieldSchema, query.fields)
                : resourceFieldSchema;
            const fields = Object.assign({}, _fields, { _id: '_id', _type: '_type' });

            const jsonApiResourceSchema = Object.assign({}, resourceQuerySchema, { fields });


            const archimedesQuery = jsonApiQueryToArchimedesQuery(jsonApiResourceSchema, query);
            const convertPojo2jsonApi = pojo2jsonApi(db[modelName].schema, jsonApiResourceSchema);

            const addRelationships = (pojo) => _(Object.keys(pojo.relationships))
                .flatMap((fieldName) => {
                    const { data } = pojo.relationships[fieldName];
                    return _.isArray(data) ? data : [data];
                })
                .map(({ type, id }) => ({ type, id }))
                .value();


            runQuery(db, modelName, archimedesQuery, (error, stream) => {
                if (error) {
                    return error.name === 'ValidationError'
                        ? reply.badRequest(error.message, error.extra)
                        : reply.badImplementation(error);
                }

                return stream
                    .stopOnError(err => reply.badRequest(err))
                    .toArray(results => {
                        const data = results.map(convertPojo2jsonApi);

                        const relationRefs = _(data)
                            .flatMap(addRelationships)
                            .reduce((acc, { type, id }) => {
                                const ids = _.uniq([...(acc[type] || []), id]);
                                return Object.assign({}, acc, { [type]: ids });
                            }, {});

                        highland(Object.keys(relationRefs).map((relationType) => {
                            const relquery = {
                                filter: {
                                    _id: { $in: relationRefs[relationType] },
                                },
                            };
                            return db.queryStream(relationType, relquery);
                        }))
                        .sequence()
                        .toArray(included => {
                            reply.ok({ data, included });
                        });
                    });
            });
        },
    };
};

export { queryRoute };
