
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
    limit: _.get(resourceQuery, 'page.limit'),
    offset: _.get(resourceQuery, 'page.offset'),
  };
};


const _jsonApiQueryValidator = (resourceSchema = {}) => {
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
    included: joi.array().items(joi.string()), // TODO Add validIncluded
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
  const included = toArray(_query.included);
  const query = Object.assign({}, _query, { sort, fields, included });
  joi.validate(query, _jsonApiQueryValidator(resourceSchema), next);
};


const assignPojo2jsonApiConverter = (request, reply) => {
  const { modelToResourceName } = request.pre;
  const pojo2jsonApiConverter = (modelSchema, resourceSchema) => (pojo) => (
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
        _.set(acc, 'type', modelToResourceName(value));
      } else if (o.property.isRelation()) {
        const resourceType = modelToResourceName(o.property.type);
        if (!resourceType) {
          throw new Error(
            `cannot find a resource that match model \`${o.property.type}\`.`
          );
        }
        const newValue = !_.isArray(value)
        ? { id: value, type: resourceType }
        : value.map((val) => ({ id: val, type: resourceType }));
        _.set(acc, `relationships.${o.fieldName}.data`, newValue);
      } else {
        _.set(acc, `attributes.${o.fieldName}`, value);
      }
      return acc;
    }, {})
  );
  reply(pojo2jsonApiConverter);
};

const assignModelToResourceName = (request, reply) => {
  const { modelNamesToResourceNamesMapping } = request.server.plugins.odyssee;
  const modelToResourceName = (modelName) => modelNamesToResourceNamesMapping[modelName];
  reply(modelToResourceName);
};

const assignResourceToModelName = (request, reply) => {
  const { resourceNamesToModelNamesMapping } = request.server.plugins.odyssee;
  const resourceToModelName = (resourceName) => resourceNamesToModelNamesMapping[resourceName];
  reply(resourceToModelName);
};

const assignJsonApiResourceSchema = (resourceQuerySchema = {}) => (request, reply) => {
  /** handle "fields" restriction and add _id and _type fields **/
  const { query } = request;
  const { fields: resourceFieldSchema } = resourceQuerySchema;
  const _fields = query.fields.length
  ? _.pick(resourceFieldSchema, query.fields)
  : resourceFieldSchema;
  const fields = Object.assign({}, _fields, { _id: '_id', _type: '_type' });
  const jsonApiResourceSchema = Object.assign({}, resourceQuerySchema, { fields });
  reply(jsonApiResourceSchema);
};

const assignArchimedesQuery = (request, reply) => {
  const { query } = request;
  const { jsonApiResourceSchema } = request.pre;
  const archimedesQuery = jsonApiQueryToArchimedesQuery(jsonApiResourceSchema, query);
  reply(archimedesQuery);
};

const assignFetchIncludedRelationships = (request, reply) => {
  const { db } = request;
  const { resourceToModelName, pojo2jsonApiConverter, jsonApiResourceSchema } = request.pre;

  const fetchIncludedRelationships = (included, data) => {
    const collectReferences = (pojo) =>
    _(Object.keys(pojo.relationships || {}))
    .flatMap((fieldName) => {
      if (included.indexOf(fieldName) > -1) {
        const { data: relationshipValue } = pojo.relationships[fieldName];
        return _.isArray(relationshipValue)
        ? relationshipValue
        : [relationshipValue];
      }
      return [];
    })
    .map(({ type, id }) => ({ type, id }))
    .value();


    let relationReferences = {};
    if (included.length) {
      relationReferences = _(data)
      .flatMap(collectReferences)
      .reduce((acc, { type, id }) => {
        const ids = _.uniq([...(acc[type] || []), id]);
        return Object.assign({}, acc, { [type]: ids });
      }, {});
    }

    return highland(Object.keys(relationReferences).map((resourceName) => {
      const relationQuerySchema = jsonApiResourceSchema.included[resourceName];
      const relqueryFields = Object.assign(
        {}, relationQuerySchema.fields, { _id: '_id', _type: '_type' }
      );
      const relquery = {
        field: relqueryFields,
        aggregate: relationQuerySchema.aggregate || {},
        filter: {
          _id: { $in: relationReferences[resourceName] },
        },
      };
      const relationModelName = resourceToModelName(resourceName);
      const convertRelation2jsonApi = pojo2jsonApiConverter(
        db[relationModelName].schema,
        relationQuerySchema
      );
      return db.queryStream(relationModelName, relquery).map(convertRelation2jsonApi);
    }))
    .sequence();
  };

  reply(fetchIncludedRelationships);
};

const queryRoute = (routeExpositionConfig) => {
  const { path: routePath, expose: resourceQuerySchema } = routeExpositionConfig;
  return {
    method: 'GET',
    path: routePath,
    config: {
      validate: {
        query: jsonApiQueryValidation(resourceQuerySchema),
      },
      pre: [
        [
          { method: assignModelToResourceName, assign: 'modelToResourceName' },
          { method: assignResourceToModelName, assign: 'resourceToModelName' },
        ],
        { method: assignPojo2jsonApiConverter, assign: 'pojo2jsonApiConverter' },
        {
          method: assignJsonApiResourceSchema(resourceQuerySchema),
          assign: 'jsonApiResourceSchema',
        },
        { method: assignArchimedesQuery, assign: 'archimedesQuery' },
        { method: assignFetchIncludedRelationships, assign: 'fetchIncludedRelationships' },
      ],
    },
    handler(request, reply) {
      const { db, modelName, query } = request;

      const {
        jsonApiResourceSchema,
        archimedesQuery,
        pojo2jsonApiConverter,
        fetchIncludedRelationships,
      } = request.pre;

      const convertPojo2jsonApi = pojo2jsonApiConverter(
        db[modelName].schema,
        jsonApiResourceSchema
      );

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

          fetchIncludedRelationships(query.included, data).toArray(included => {
            const response = Object.assign(
              {},
              { data },
              included.length ? { included } : {}
            );
            reply.ok(response);
          });
        });
      });
    },
  };
};

const exposeAllProperties = (modelSchema) => {
  const { properties } = modelSchema;
  return Object.keys(properties)
  .map((propertyName) => {
    const property = properties[propertyName];
    const type = property.type === 'array' ? 'aggregate' : 'fields';
    return { type, name: propertyName };
  })
  .reduce((acc, item) => {
    let section;
    if (item.type === 'aggregate') {
      section = {
        ...(acc.aggregate || {}),
        [item.name]: {
          $aggregator: 'array',
          $property: item.name,
        },
      };
    } else {
      section = { ...(acc.fields || {}), [item.name]: item.name };
    }

    const filter = { ...(acc.filter || {}), [item.name]: item.name };
    return { ...acc, [item.type]: section, filter };
  }, {});
};


export { queryRoute, exposeAllProperties };
