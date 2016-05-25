
import routes from '../../../src/routes';

export default (config) => ({
  model: 'Book',
  routes: routes(config),
});
