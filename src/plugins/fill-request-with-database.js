
/**
 * Fill the request with helpers:
 *  - request.resourceName
 *  - request.db
 *  - request.Model (if appropriated)
 */
export default function fillRequestWithDatabase(plugin) {
    plugin.ext('onPostAuth', (request, reply) => {
        const { database } = request.server.plugins.odyssee;
        const { odyssee } = request.route.settings.plugins;
        const modelName = odyssee && odyssee.modelName;

        const Model = database[modelName];

        if (Model) {
            request.Model = Model; // eslint-disable-line no-param-reassign
            request.modelName = modelName; // eslint-disable-line no-param-reassign
            request.db = database; // eslint-disable-line no-param-reassign
        }

        const { apiRootPrefix } = plugin.settings.app;
        request.apiBaseUri = apiRootPrefix; // eslint-disable-line no-param-reassign

        return reply.continue();
    });
}
