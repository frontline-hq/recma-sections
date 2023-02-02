import 'mocha';
import { assert } from 'chai';
import npmPackage from '../src/index';

describe('NPM Package', () => {
    it('should be a Function', () => {
        assert.isFunction(npmPackage);
    });
});