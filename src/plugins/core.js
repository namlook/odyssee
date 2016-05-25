
import _ from 'lodash';

import boomReply from './boom-reply';
import jsonAPIErrorResponse from './jsonapi-error-response';
import fillRequestWithDatabase from './fill-request-with-database';
// import initAuthentification from './authenfication';
// import initPolicies from './policies';
import initTasks from './tasks';
import initLogger from './logger';
import mimes from 'mime-types';
import io from 'socket.io';


// // TODO remove ?
// const fillRequest = function fillRequest(plugin) {
//     /**
//      * allow to filter by id
//      *
//      */
//     plugin.ext('onPostAuth', (request, reply) => {
//         const { query, Model } = request;
//
//         if (!Model) {
//             return reply.continue();
//         }
//
//         const queryFilter = query.filter || {};
//         if (queryFilter.id) {
//             query.filter._id = query.filter.id;
//             delete query.filter.id;
//         }
//         return reply.continue();
//     });
// };

const loadResources = (plugin) => {
  // const routesDirectory = path.join(process.cwd(), 'backend/routes');
  // const routes = requireDir(routesDirectory);
  const { resources, app } = plugin.settings.app;

  const modelNamesToResourceNamesMapping = {};

  Object.keys(resources).forEach(resourceName => {
    const resourceFn = resources[resourceName];
    const resourceConfig = resourceFn(plugin.settings.app);

    const { model, routes: routesConfig } = resourceConfig;

    modelNamesToResourceNamesMapping[model] = resourceName;

    let { prefix } = resourceConfig;

    prefix = _.isNil(prefix) ? `/${resourceName}` : prefix;

    const routes = routesConfig.map((route) => {
      const { method, handler, config: routeConfig } = route;

      const routePath = route.path === '/' ? '' : route.path;

      const pathUrl = `${app.apiRootPrefix}${prefix}${routePath}`;

      const addedConfig = {};

      /**
      * set modelName on the onfig so we can access it
      * on middlewares
      */
      _.set(addedConfig, 'plugins.odyssee.modelName', model);

      const config = Object.assign({}, routeConfig, addedConfig);

      plugin.log(['info', 'odyssee'], `registering route: "${pathUrl}"`);
      return {
        method,
        path: pathUrl,
        config,
        handler,
      };
    });

    plugin.log(
      ['info', 'odyssee'],
      `mounting resource "${resourceName}" (${routes.length} routes)`
    );

    plugin.expose(
      'modelNamesToResourceNamesMapping', modelNamesToResourceNamesMapping);
      plugin.expose(
        'resourceNamesToModelNamesMapping', _.invert(modelNamesToResourceNamesMapping));

        plugin.route(routes);
      });
    };

    const initWebSocket = (plugin) => {
      const ws = io(plugin.listener);

      ws.on('connection', (socket) => {
        plugin.log(['debug', 'socket'], `new connection from ${socket.handshake.address}`);
      });

      return ws;
    };


    const register = function odysseePlugin(plugin, options, next) {
      initLogger(plugin, options);

      // register websocket first as there is no dependencies
      const ws = initWebSocket(plugin);
      plugin.expose('websocket', ws);

      const { db } = plugin.plugins.archimedes;
      plugin.expose('database', db);
      // plugin.expose('userModel', 'User');
      // plugin.expose('usernameField', 'email');
      // plugin.expose('passwordField', 'password');

      boomReply(plugin);
      jsonAPIErrorResponse(plugin);
      fillRequestWithDatabase(plugin);

      loadResources(plugin, options);


      const tasks = initTasks(plugin, options);
      plugin.expose('tasks', tasks);


      plugin.route({
        path: '/{param*}',
        method: 'GET',
        handler: (request, reply) => {
          const { url, apiBaseUri } = request;

          const routePath = url.path === '/'
          ? 'index.html'
          : url.path;

          const { publicDirectory } = plugin.settings.app;

          if (mimes.lookup(routePath)) {
            return reply.file(`./${publicDirectory}/${routePath}`);
          } else if (!_.startsWith(routePath, apiBaseUri)) {
            return reply.redirect(`/#${routePath}`);
          }
          return reply.notFound();
        },
      });

      return next();
    };

    register.attributes = {
      name: 'odyssee',
      // version: '1.0.0'
    };

    export { register };
