'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = makeOutput;
/**
 * @public
 * Create an Output from a Condition.
 * Note: Assumes the given Condition was generated from a single public key (e.g. a Ed25519 Condition)
 * @param {object} condition Condition (e.g. a Ed25519 Condition from `makeEd25519Condition()`)
 * @param {string} amount Amount of the output
 * @returns {object} An Output usable in a Transaction
 */
function makeOutput(condition) {
    var amount = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '1';

    if (typeof amount !== 'string') {
        throw new TypeError('`amount` must be of type string');
    }
    var publicKeys = [];
    var getPublicKeys = function getPublicKeys(details) {
        if (details.type === 'ed25519-sha-256') {
            if (!publicKeys.includes(details.public_key)) {
                publicKeys.push(details.public_key);
            }
        } else if (details.type === 'threshold-sha-256') {
            details.subconditions.map(getPublicKeys);
        }
    };
    getPublicKeys(condition.details);
    return {
        condition: condition,
        'amount': amount,
        'public_keys': publicKeys
    };
}
module.exports = exports['default'];