"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
const _ = require("underscore");
const opm_query_generator_1 = require("opm-query-generator");
const jsonld = require("jsonld");
const model_1 = require("./model");
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
const host = app_1.AppConfig.host;
class CalculationModel extends model_1.BaseModel {
    listCalculations(req) {
        const db = req.params.db;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var args = (accept == 'application/json') ? { queryType: 'select' } : { queryType: 'construct' };
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.listCalculations(args);
        console.log("Querying database to list calculations:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: accept });
        return rp(dbConn.options)
            .then(d => {
            if (accept != 'application/ld+json') {
                return d;
            }
            return this.compactJSONLD(d);
        });
    }
    putCalculations(req) {
        const db = req.params.db;
        const graphURI = `${protocol}://localhost/opm/HVAC-I`;
        var args = { graphURI: graphURI };
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.putOutdated(args);
        console.log("Querying database to get outdated properties:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/n-triples' });
        return rp(dbConn.options)
            .then(d => {
            if (!d) {
                return "No triples to infer";
            }
            var errorMsg = "Problem writing data about outdated states to store";
            this.writeTriples(d, graphURI, db, errorMsg);
            return "Successfully wrote triples to store";
        });
    }
    getCalculation(req) {
        const db = req.params.db;
        const hostURI = `${protocol}://${host}/${db}`;
        const calculationURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var args = { calculationURI: calculationURI };
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: accept });
        return rp(dbConn.options)
            .then(d => {
            if (accept != 'application/ld+json') {
                return d;
            }
            return this.compactJSONLD(d);
        });
    }
    createCalculation(req) {
        const db = req.params.db;
        const hostURI = `${protocol}://${host}/${db}`;
        var dummyDomain = 'HVAC';
        const dummyUser = `${protocol}://www.niras.dk/employees/mhra`;
        var graphURI = hostURI + '/' + dummyDomain;
        var ntriples = '';
        var input = req.body;
        input.hostURI = hostURI;
        input.userURI = dummyUser;
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.postCalcData(input);
        console.log("Querying database to add a calculation:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/n-triples' });
        return rp(dbConn.options)
            .then(d => {
            if (!d) {
                this.errorHandler("Error: Could not create new calculation", 500);
            }
            ntriples = d;
            var errorMsg = "Could not create calculation";
            this.writeTriples(d, graphURI, db, errorMsg);
        })
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(ntriples, { format: 'application/nquads' })
                .then(d => {
                return this.compactJSONLD(d);
            });
        });
    }
    attachCalculation(req) {
        const db = req.params.db;
        const hostURI = `${protocol}://${host}/${db}`;
        const calculationURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        var ntriples;
        var graphURI;
        var args = { calculationURI: calculationURI, queryType: 'construct' };
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/n-triples' });
        return rp(dbConn.options)
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(d, { format: 'application/nquads' })
                .then(d => {
                return this.compactJSONLD(d);
            });
        })
            .then(d => {
            var prefixes = [];
            _.each(d["@context"], (value, key) => {
                prefixes.push({ prefix: key, uri: value });
                return;
            });
            var input = {
                calculationURI: calculationURI,
                expression: d["opm:expression"],
                inferredProperty: d["opm:inferredProperty"]["@id"],
                argumentPaths: d["opm:argumentPaths"]["@list"],
                unit: { value: d["opm:unit"]["@value"], datatype: d["opm:unit"]["@type"] },
                prefixes: prefixes
            };
            graphURI = d["sd:namedGraph"]["@id"];
            let sc = new opm_query_generator_1.OPMCalc;
            const q = sc.postCalc(input);
            console.log("Querying database to infer new calculated properties:\n" + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: 'application/n-triples' });
            return rp(dbConn.options);
        })
            .then(d => {
            if (!d) {
                return "The calculation was not attached to any new resources - calculation already up to date.";
            }
            ntriples = d;
            var errorMsg = "Could not attach calculation to FoIs";
            return this.writeTriples(d, graphURI + '-I', db, errorMsg)
                .then(d => {
                var promises = jsonld.promises;
                return promises.fromRDF(ntriples, { format: 'application/nquads' })
                    .then(d => {
                    return this.compactJSONLD(d);
                });
            });
        });
    }
    reRunCalculation(req) {
        const db = req.params.db;
        const hostURI = `${protocol}://${host}/${db}`;
        const calculationURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        var ntriples;
        var graphURI;
        var args = { calculationURI: calculationURI, queryType: 'construct' };
        let sc = new opm_query_generator_1.OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/n-triples' });
        return rp(dbConn.options)
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(d, { format: 'application/nquads' })
                .then(d => {
                return this.compactJSONLD(d);
            });
        })
            .then(d => {
            var prefixes = [];
            _.each(d["@context"], (value, key) => {
                prefixes.push({ prefix: key, uri: value });
                return;
            });
            var input = {
                calculationURI: calculationURI,
                expression: d["opm:expression"],
                inferredProperty: d["opm:inferredProperty"]["@id"],
                argumentPaths: d["opm:argumentPaths"]["@list"],
                unit: { value: d["opm:unit"]["@value"], datatype: d["opm:unit"]["@type"] },
                prefixes: prefixes
            };
            graphURI = d["sd:namedGraph"]["@id"];
            let sc = new opm_query_generator_1.OPMCalc;
            const q = sc.putCalc(input);
            console.log("Querying database to update calculated properties:\n" + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: 'application/n-triples' });
            return rp(dbConn.options);
        })
            .then(d => {
            if (!d) {
                return "No new calculation results were inferred - calculation already up to date.";
            }
            ntriples = d;
            var errorMsg = "Could not update calculation.";
            return this.writeTriples(d, graphURI + '-I', db, errorMsg)
                .then(d => {
                var promises = jsonld.promises;
                return promises.fromRDF(ntriples, { format: 'application/nquads' })
                    .then(d => {
                    return this.compactJSONLD(d);
                });
            });
        });
    }
}
exports.CalculationModel = CalculationModel;
