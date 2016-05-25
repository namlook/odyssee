
import _ from 'lodash';
import requireDir from 'require-dir';

export const pascalCase = (string) => _.startCase(string).split(' ').join('');

export const importDir = (string) => {
  const _resources = requireDir(string);
  return Object.keys(_resources).reduce((acc, resourceName) => {
    /** hack for es6 and require-dir **/
    const resource = _resources[resourceName].__esModule
    ? _resources[resourceName].default
    : _resources[resourceName];
    return Object.assign({}, acc, { [resourceName]: resource });
  }, {});
};
