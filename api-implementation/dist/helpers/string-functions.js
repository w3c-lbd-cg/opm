"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
class StringFunctions {
    argsMatch(f, args) {
        var result = [];
        var find = "arg[";
        for (var i = 0; i < f.length; ++i) {
            if (f.substring(i, i + find.length) == find) {
                result.push(f.substring(i, i + 6));
            }
        }
        result = _.uniq(result);
        return result.length === args.length;
    }
}
exports.StringFunctions = StringFunctions;
