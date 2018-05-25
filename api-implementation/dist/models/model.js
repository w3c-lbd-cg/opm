"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const _ = require("underscore");
const _s = require("underscore.string");
const jsonld = require("jsonld");
var errors = require('request-promise/errors');
var exec = require('child_process').exec;
var errors = require('request-promise/errors');
var _exec = require('child-process-promise').exec;
const general_1 = require("./../queries/general");
var validProperties = require('./../../public/lists/valid-properties.json');
var context = require('./../../public/lists/jsonld-context.json');
const foi_1 = require("./../queries/foi");
class BaseModel {
    wipeAll(db, graphURI) {
        if (graphURI) {
            let gq = new general_1.GeneralQueries;
            var q = gq.wipeNamedGraph(graphURI);
        }
        else {
            let gq = new general_1.GeneralQueries;
            var q = gq.wipeAll();
        }
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.updateQuery({ query: q });
        return rp(dbConn.options)
            .then(d => {
            console.log(d);
            if (d != 'true') {
                this.errorHandler("Error: Could not delete resources", 500);
            }
            return `Successfully wiped the database`;
        });
    }
    checkIfResourceExists(db, URI) {
        let fq = new foi_1.FoIQueries;
        var args = { foiURI: URI };
        const q = fq.checkIfFoIExists(args);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        console.log("Querying database to check if FoI exists:\n" + q);
        return rp(dbConn.options)
            .then(exist => {
            if (exist.boolean != true) {
                this.errorHandler("Error: No entity with the specified URI.", 400);
            }
            return "Entity exists.";
        });
    }
    checkIfResourceDeleted(db, URI) {
        let fq = new foi_1.FoIQueries;
        var args = { foiURI: URI };
        const q = fq.checkIfFoIDeleted(args);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        console.log("Querying database to check if FoI is marked as opm:Deleted:\n" + q);
        return rp(dbConn.options)
            .then(deleted => {
            if (deleted.boolean == true) {
                this.errorHandler("Error: The entity is marked as deleted. Restore it by PUT " + URI + "?restore=true", 400);
            }
            ;
            return "Entity is not deleted.";
        });
    }
    checkIfGraphExist(db, graph_name) {
        const q = `ASK WHERE {GRAPH <${graph_name}> {?s ?p ?o}}`;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        console.log("Querying database: " + q);
        return rp(dbConn.options);
    }
    addObjectProperty(db, resourceURI, propertyURI, objectURI) {
        return this.checkIfResourceExists(db, objectURI)
            .then(data => {
            console.log("her");
            console.log(data);
            let gq = new general_1.GeneralQueries;
            var q = gq.checkIfPropertyExistOnResource(resourceURI, propertyURI);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(data => {
            if (data === 'true') {
                this.errorHandler("Error: Property already exists on this resource.", 400);
            }
            let gq = new general_1.GeneralQueries;
            var q = gq.getResourceNamedGraph(resourceURI);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(data => {
            if (_.isEmpty(data.results.bindings[0])) {
                this.errorHandler("Error: Could not get the named graph.", 500);
            }
            var graphURI = data.results.bindings[0].g.value;
            let gq = new general_1.GeneralQueries;
            var q = gq.addObjectProperty(resourceURI, propertyURI, objectURI, graphURI);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(data => {
            if (data != 'true') {
                this.errorHandler("Error: Could not create resource.", 500);
            }
            return `Successfully created object property`;
        });
    }
    getAvailableProperties(db, typeURI) {
        const q = `SELECT ?uri ?label
                            WHERE {
                                GRAPH ?g {
                                    <${typeURI}> rdfs:subClassOf   [owl:onProperty ?uri] .
                                    OPTIONAL{ 
                                        ?uri rdfs:label ?label 
                                        FILTER(lang(?label)="en")
                                    } .
                                }
                            }`;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        console.log("Querying database: " + q);
        return rp(dbConn.options);
    }
    executeCmd(cmd) {
        console.log("Executing command: " + cmd);
        return _exec(cmd).then(res => {
            if (res.stderr)
                return this.errorHandler(res.stderr, 500);
            return res.stdout;
        }, err => {
            if (err.stdout.match("Database already exists"))
                return this.errorHandler(err.stdout, 409);
            if (err.stdout.match("Invalid name"))
                return this.errorHandler(err.stdout, 400);
            return this.errorHandler(err.stdout, 500);
        });
    }
    writeTriples(triples, graphURI, db, errorMsg) {
        var q = `INSERT DATA {
                            GRAPH <${graphURI}> { ${triples} }}`;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.updateQuery({ query: q });
        console.log("Writing triples: " + q);
        return rp(dbConn.options)
            .then(qres => {
            if (qres != 'true') {
                this.errorHandler(errorMsg, 500);
            }
            return;
        });
    }
    compactJSONLD(data) {
        var types = [];
        var used = _.chain(data)
            .map(obj => {
            var keys = _.keys(obj);
            types = types.concat(obj['@type']);
            types = types.concat(keys);
            _.each(keys, key => {
                _.each(obj[key], item => {
                    if (item['@type']) {
                        types.push(item['@type']);
                    }
                });
            });
            return types;
        }).flatten().reject(item => {
            return _s.startsWith(item, '@');
        })
            .map(item => {
            if (_s.contains(item, '#')) {
                return _s.strLeftBack(item, '#') + '#';
            }
            else if (_s.contains(item, '/')) {
                return _s.strLeftBack(item, '/') + '/';
            }
            return item;
        })
            .uniq().value();
        var ctxt = _.filter(context, item => {
            return _.contains(used, item['uri']);
        });
        var c = {};
        _.each(ctxt, item => {
            {
                c[item['prefix']] = item['uri'];
            }
        });
        var promises = jsonld.promises;
        return promises.compact(data, c);
    }
    validateValue(value, propertyTypeURI) {
        var valueObj = this.separateValueUnit(value);
        var propertyTypeURI = propertyTypeURI.replace("seas:", "https://w3id.org/seas/");
        var propertyRestrictions = _.chain(validProperties)
            .map(item => item.properties)
            .flatten()
            .filter(obj => (obj.uri == propertyTypeURI))
            .first()
            .value();
        if (propertyRestrictions) {
            if (!propertyRestrictions.objectProperty) {
                if (valueObj.unit != propertyRestrictions.unit) {
                    this.errorHandler("Error: Unit mismatch. Expected unit: " + propertyRestrictions.unit, 400);
                }
            }
            else {
                if (!_s.startsWith(value, 'http')) {
                    this.errorHandler("Error: Target of an object property must be a valid URI", 400);
                }
                return "Object properties will be implemented later";
            }
        }
        return "Value OK!";
    }
    separateValueUnit(string) {
        var str = _s.clean(string);
        if (_s.contains(str, ' ')) {
            var value = _s.strLeft(str, ' ');
            var unit = _s.strRight(str, ' ');
        }
        else {
            var value = str;
        }
        return { value: value, unit: unit };
    }
    validateFoIType(foiType) {
        var foiTypes = _.pluck(validProperties, 'foiType');
        var index = foiTypes.indexOf(foiType);
        if (index != -1) {
            return validProperties[index].properties;
        }
        else {
            this.errorHandler("Error: Not a valid FoI-type", 400);
        }
    }
    validatePropertyType(property, validProperties) {
        var propertyValid = _.chain(validProperties)
            .pluck('uri')
            .map(item => {
            if (_s.contains(item, '/')) {
                return _s.strRightBack(item, '/');
            }
            else if (_s.contains(item, '#')) {
                return _s.strRightBack(item, '#');
            }
            return item;
        })
            .contains(_s.strRightBack(property, '/'))
            .value();
        if (!_s.startsWith(property, 'http'))
            property = 'seas:' + property;
        if (!propertyValid) {
            this.errorHandler("Error: Not a valid property-type", 400);
        }
        return property;
    }
    getPropertyRestrictions(propertyTypeURI, validProperties) {
        return _.chain(validProperties)
            .filter(obj => {
            var propEnd1 = _s.strRightBack(obj.uri, "/");
            var propEnd2 = _s.strRightBack(obj.uri, "#");
            return (propEnd1 == propertyTypeURI || propEnd2 == propertyTypeURI);
        })
            .first()
            .value();
    }
    errorHandler(msg, code) {
        console.log("Error code " + code + ": " + msg);
        errors.error = msg;
        errors.status = code;
        throw errors;
    }
}
exports.BaseModel = BaseModel;
