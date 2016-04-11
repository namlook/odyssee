
import _ from 'lodash';

/**
 * process policies
 */
export default function initPolicies(plugin) {
    plugin.ext('onPreAuth', (request, reply) => {
        const access = _.get(request, 'route.settings.auth.access', []);
        if (!access.length) {
            return reply.continue();
        }

        let _scopes = access[0].scope.selection;

        if (!_scopes) {
            return reply.continue();
        }

        if (!_.isArray(_scopes)) {
            _scopes = [_scopes];
        }


        const policies = _scopes.filter(scope => scope.indexOf(':') > -1);
        const scopes = _scopes.filter(scope => scope.indexOf(':') === -1);

        /* eslint-disable no-param-reassign */
        request.route.settings.plugins.eureka.policies = policies;
        /* eslint-enable no-param-reassign */

        if (scopes.length) {
            if (scopes.indexOf('admin') === -1) {
                scopes.push('admin'); // admin can always access to routes
            }
            /* eslint-disable no-param-reassign */
            request.route.settings.auth.access = [{ scope: { selection: scopes } }];
            /* eslint-enable no-param-reassign */
        } else {
            delete request.route.settings.auth.access; // eslint-disable-line no-param-reassign
        }

        return reply.continue();
    });


    plugin.ext('onPreHandler', (request, reply) => {
        const _policies = _.get(request, 'route.settings.plugins.eureka.policies', []);
        if (!_policies.length) {
            return reply.continue();
        }


        const { credentials } = request.auth;
        credentials.scope = credentials.scope || [];

        /**
         * if the user has 'admin' in his scope, is a superuser
         * let's get him in
         */
        if (credentials.scope.indexOf('admin') > -1) {
            return reply.continue();
        }

        /**
         * process prolicies
         */
        const policies = [];
        for (const policy of _policies) {
            const match = policy.match(/(userId|userScope):doc\.(.+)/);

            if (_.isNil(match)) {
                request.server.log(['error', 'eureka', 'policies'], `malformed policy ${policy}`);
                continue;
            }

            let [, key, propertyName] = match; // eslint-disable-line prefer-const

            if (key === 'userId') {
                key = '_id';
            } else if (key === 'userScope') {
                key = 'scope';
            }

            let credentialValues = _.get(credentials, key);

            if (!_.isArray(credentialValues)) {
                credentialValues = [credentialValues];
            }

            policies.push({ propertyName, credentialValues });
        }

        /**
         * check the policies against the document
         * or fill the request.pre.queryFilter
         */
        const doc = request.pre.document;
        const { queryFilter } = request.pre;

        if (doc) {
            let hasAuthorization = false;

            for (const policy of policies) {
                const { propertyName, credentialValues } = policy;

                let documentScopes = doc.get(propertyName);
                if (!_.isArray(documentScopes)) {
                    documentScopes = [documentScopes];
                }

                if (_.intersection(documentScopes, credentialValues).length) {
                    hasAuthorization = true;
                }
            }

            if (!hasAuthorization) {
                return reply.unauthorized(
                    "you don't have the authorization to access this document");
            }
        } else if (queryFilter) {
            const query = {};
            for (const policy of policies) {
                const { propertyName, credentialValues } = policy;
                if (!query[propertyName]) {
                    query[propertyName] = [];
                }
                query[propertyName].push(credentialValues);
            }

            Object.keys(query).forEach((propertyName) => {
                const values = _.flatten(query[propertyName]);
                if (values.length > 1) {
                    _.set(queryFilter, `${propertyName}.$in`, values);
                } else {
                    queryFilter[propertyName] = values[0];
                }
            });
        }
        return reply.continue();
    });
}
