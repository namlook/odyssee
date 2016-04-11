
import _ from 'lodash';

export const pascalCase = (string) => _.startCase(string).split(' ').join('');
