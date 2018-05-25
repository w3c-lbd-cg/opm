"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
const _s = require("underscore.string");
const jsonld = require("jsonld");
var errors = require('request-promise/errors');
const opm_query_generator_1 = require("opm-query-generator");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const model_1 = require("./model");
const uri_functions_1 = require("./../helpers/uri-functions");
const app_1 = require("./../config/app");
const foi_1 = require("./../queries/foi");
const protocol = app_1.AppConfig.protocol;
const host = app_1.AppConfig.host;
var validProperties = require('./../../public/lists/valid-properties.json');
class FoIModel extends model_1.BaseModel {
    constructor() {
        super(...arguments);
        this.restrictions = ['deleted', 'assumptions', 'derived', 'confirmed', 'outdated'];
        this.reliabilities = ['assumption', 'confirmed'];
    }
    getFoIs(req) {
        const db = req.params.db;
        const foiType = req.params.foi;
        const typeURI = 'https://w3id.org/seas/' + foiType;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var restriction = req.query.restriction;
        var args = { typeURI: typeURI };
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        if (restriction) {
            var options = this.restrictions;
            if (options.indexOf(restriction) == -1) {
                this.errorHandler("Error: Unknown restriction. Use either " + _s.toSentence(options, ', ', ' or '), 400);
            }
            ;
            args.restriction = restriction;
        }
        ;
        return new Promise((resolve, reject) => resolve(this.validateFoIType(typeURI)))
            .then(d => {
            let fq = new foi_1.FoIQueries;
            var q = fq.getAllOfType(args);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: accept });
            console.log("Querying database for FoIs of type " + typeURI + ": " + q);
            return rp(dbConn.options);
        });
    }
    postFoI(req) {
        const db = req.params.db;
        const foiType = req.params.foi;
        const typeURI = 'https://w3id.org/seas/' + foiType;
        const dummyUser = `${protocol}://www.niras.dk/employees/mhra`;
        const domain = req.body.domain;
        const label = req.body.label;
        const comment = req.body.comment;
        if (!domain) {
            this.errorHandler("Error: No domain specified", 400);
        }
        const hostURI = `${protocol}://${host}/${db}`;
        const graphURI = `${hostURI}/${domain}`;
        var ntriples = '';
        return new Promise((resolve, reject) => resolve(this.validateFoIType(typeURI)))
            .then(d => {
            let fq = new foi_1.FoIQueries;
            var args = { typeURI: typeURI, hostURI: hostURI, label: label, comment: comment, userURI: dummyUser };
            var q = fq.create(args);
            console.log("Querying database createNewFoI(): " + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: 'application/n-triples' });
            return rp(dbConn.options);
        })
            .then(d => {
            if (d) {
                ntriples = d;
                var errorMsg = "Could not create FoI";
                this.writeTriples(d, graphURI, db, errorMsg);
            }
            else {
                this.errorHandler("Error: Could not create new FoI", 500);
            }
        })
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(ntriples, { format: 'application/nquads' });
        });
    }
    deleteFoI(req) {
        const db = req.params.db;
        const foiURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const dummyUser = `${protocol}://www.niras.dk/employees/mojo`;
        return this.checkIfResourceExists(db, foiURI)
            .then(d => {
            let fq = new foi_1.FoIQueries;
            var args = { foiURI: foiURI, userURI: dummyUser };
            var q = fq.delete(args);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database to mark FoI as deleted:\n" + q);
            return rp(dbConn.options);
        })
            .then(qres => {
            return (qres == 'true') ? ("Successfully deleted " + foiURI) : (this.errorHandler("Could not delete FoI", 500));
        });
    }
    putFoI(req) {
        const db = req.params.db;
        const guid = req.params.guid;
        const foiURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const dummyUser = `${protocol}://www.niras.dk/employees/mhra`;
        const label = req.body.label;
        const comment = req.body.comment;
        var restore = req.query.restore == 'true' ? true : false;
        return this.checkIfResourceExists(db, foiURI)
            .then(d => {
            if (restore) {
                let fq = new foi_1.FoIQueries;
                var args = { foiURI: foiURI, userURI: dummyUser };
                var q = fq.restore(args);
                let dbConn = new stardog_connection_1.StardogConn(db);
                dbConn.updateQuery({ query: q });
                console.log("Querying database to mark FoI as non-deleted: " + q);
                return rp(dbConn.options)
                    .then(qres => {
                    return (qres == 'true') ? ("Successfully restored " + foiURI) : (this.errorHandler("Could not restore FoI", 500));
                });
            }
            else {
                let fq = new foi_1.FoIQueries;
                var args = { foiURI: foiURI, label: label, comment: comment, userURI: dummyUser };
                var q = fq.update(args);
                let dbConn = new stardog_connection_1.StardogConn(db);
                dbConn.updateQuery({ query: q });
                console.log("Querying database to update FoI metadata: " + q);
                return rp(dbConn.options)
                    .then(qres => {
                    return (qres == 'true') ? ("Successfully updated " + foiURI + ". NB! If the property is deleted, no changes have been made.") : (this.errorHandler("Could not update FoI", 500));
                });
            }
        });
    }
    getFoIProps(req) {
        const db = req.params.db;
        const foiURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const foiType = req.params.foi;
        const typeURI = 'https://w3id.org/seas/' + foiType;
        const graphURI = new uri_functions_1.UriFunctions(req, "HVAC").graphUri();
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var property = req.query.property;
        var latest = req.query.latest == 'true' ? true : false;
        var language = req.query.language ? req.query.language : 'en';
        var restriction = req.query.restriction;
        var args = { foiURI: foiURI, language: language };
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        if (latest) {
            args.latest = latest;
        }
        ;
        if (property) {
            args.property = 'seas:' + property;
        }
        ;
        if (restriction) {
            var options = this.restrictions;
            if (options.indexOf(restriction) == -1) {
                this.errorHandler("Error: Unknown restriction. Use either " + _s.toSentence(options, ', ', ' or '), 400);
            }
            ;
            args.restriction = restriction;
        }
        ;
        return this.checkIfResourceExists(db, foiURI)
            .then(d => {
            return this.checkIfResourceDeleted(db, foiURI);
        })
            .then(d => {
            if (restriction == 'outdated') {
                let sp = new opm_query_generator_1.OPMProp;
                var q = sp.listOutdated(args);
            }
            else {
                let sp = new opm_query_generator_1.OPMProp();
                var q = sp.getProps(args);
            }
            console.log("Querying database for FoI properties: " + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: accept });
            return rp(dbConn.options);
        })
            .then(d => {
            if (accept != 'application/ld+json') {
                return d;
            }
            return this.compactJSONLD(d);
        });
    }
    postFoIProp(req) {
        const db = req.params.db;
        const foiURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const foiType = req.params.foi;
        const typeURI = 'https://w3id.org/seas/' + foiType;
        const graphURI = new uri_functions_1.UriFunctions(req, "HVAC").graphUri();
        var value = req.body.value;
        const reliability = req.body.reliability;
        const comment = req.body.comment;
        var property = req.query.property;
        if (!property) {
            this.errorHandler("Error: No property specified", 400);
        }
        var ntriples = '';
        var propertyTypeURI = '';
        return this.checkIfResourceExists(db, foiURI)
            .then(d => {
            var validProperties = this.validateFoIType(typeURI);
            propertyTypeURI = this.validatePropertyType(property, validProperties);
            return this.validateValue(value, propertyTypeURI);
        })
            .then(d => {
            var input = {
                foiURI: foiURI,
                inferredProperty: propertyTypeURI,
                value: {
                    value: value,
                    datatype: "cdt:ucum"
                },
                prefixes: [{ prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#' }],
            };
            if (reliability) {
                var options = this.reliabilities;
                if (options.indexOf(reliability) == -1) {
                    this.errorHandler("Error: Unknown reliability definition. Use either " + _s.toSentence(options, ', ', ' or '), 400);
                }
                ;
                input.reliability = reliability;
            }
            var sp = new opm_query_generator_1.OPMProp();
            var q = sp.postFoIProp(input);
            console.log("Querying database to get new FoI triples:\n" + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: 'application/n-triples' });
            return rp(dbConn.options)
                .then(d => {
                if (d) {
                    ntriples = d;
                    var errorMsg = "Could not create property";
                    return this.writeTriples(d, graphURI, db, errorMsg);
                }
                else {
                    this.errorHandler("Error: Does the FoI already have the specified property? - if so, do a PUT request instead", 400);
                }
            });
        })
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(ntriples, { format: 'application/nquads' });
        });
    }
}
exports.FoIModel = FoIModel;
