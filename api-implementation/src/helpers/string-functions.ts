import * as _ from "underscore";

export class StringFunctions {
    //Takes a functions and the arguments it should take
    //Returns true if the length of the args-array matches
    //the amount of arguments defined in the function
    //NB! simple implementation for arguments less than 10
    argsMatch(f,args) {
        var result = [];
        var find = "arg["
        for (var i = 0; i < f.length; ++i) {
            if (f.substring(i, i + find.length) == find) {
                result.push(f.substring(i,i+6));
            }
        }
        result = _.uniq(result);
        return result.length === args.length;
    }
}