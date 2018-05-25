"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
var errors = require('request-promise/errors');
const _s = require("underscore.string");
const opm_query_generator_1 = require("opm-query-generator");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const jsonld = require("jsonld");
const model_1 = require("./model");
const general_1 = require("./../queries/general");
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
const host = app_1.AppConfig.host;
class PropertyModel extends model_1.BaseModel {
    constructor() {
        super(...arguments);
        this.restrictions = ['deleted', 'assumption', 'derived', 'confirmed', 'outdated'];
        this.reliabilities = ['assumption', 'confirmed'];
    }
    deleteProperty(req) {
        const db = req.params.db;
        const propertyURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const dummyUser = `${protocol}://www.niras.dk/employees/mhra`;
        const comment = req.body.string;
        var input = { propertyURI: propertyURI, comment: comment, userURI: dummyUser };
        var graphURI = '';
        var ntriples = '';
        return this.checkIfResourceExists(db, propertyURI)
            .then(d => {
            let gq = new general_1.GeneralQueries;
            var q = gq.getResourceNamedGraph(propertyURI);
            console.log("Querying database for named graph: " + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q });
            return rp(dbConn.options)
                .then(d => {
                if (!d || !d.results.bindings) {
                    this.errorHandler("Error: Could not retrieve the graph of the property", 500);
                }
                graphURI = d.results.bindings[0].g.value;
                return "Found graph";
            });
        })
            .then(d => {
            let sp = new opm_query_generator_1.OPMProp();
            const q = sp.deleteProp(input);
            console.log("Querying database for delete prop construct:\n" + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q, accept: 'application/n-triples' });
            return rp(dbConn.options)
                .then(d => {
                if (!d) {
                    this.errorHandler("Error: Could not generate deletion triples", 500);
                }
                ntriples = d;
                return "Generated deletion triples";
            });
        })
            .then(d => {
            var q = `INSERT DATA {
                                        GRAPH <${graphURI}> { ${ntriples} }}`;
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database to write deleted property state to graph:\n" + q);
            return rp(dbConn.options);
        })
            .then(d => {
            if (!d) {
                this.errorHandler("Error: Could not delete the property", 500);
            }
            ntriples = d;
            return "Successfully deleted property " + propertyURI;
        });
    }
    updateProperty(req) {
        const db = req.params.db;
        const propertyURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        const dummyUser = `${protocol}://www.niras.dk/employees/mhra`;
        var value = req.body.value;
        const comment = req.body.comment;
        var reliability = req.body.reliability;
        var setReliability = req.query.setReliability;
        if (setReliability)
            reliability = setReliability;
        var restore = req.query.restore == 'true' ? true : false;
        if (restore == true && setReliability) {
            this.errorHandler("Error: Cannot both set reliability of a property and restore it", 400);
        }
        var graphURI = '';
        var ntriples = '';
        var input = { propertyURI: propertyURI, userURI: dummyUser, comment: comment };
        if (reliability) {
            var options = this.reliabilities;
            if (options.indexOf(reliability) == -1) {
                this.errorHandler("Error: Unknown reliability definition. Use either " + _s.toSentence(options, ', ', ' or '), 400);
            }
            ;
            input.reliability = reliability;
        }
        return this.checkIfResourceExists(db, propertyURI)
            .then(d => {
            let gq = new general_1.GeneralQueries;
            var q = gq.getResourceNamedGraph(propertyURI);
            console.log("Querying database for named graph:\n" + q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.getQuery({ query: q });
            return rp(dbConn.options)
                .then(d => {
                if (!d || !d.results.bindings) {
                    this.errorHandler("Error: Could not retrieve the graph of the property", 500);
                }
                graphURI = d.results.bindings[0].g.value;
                return graphURI;
            });
        })
            .then(d => {
            if (restore) {
                let sp = new opm_query_generator_1.OPMProp();
                const q = sp.restoreProp(input);
                console.log("Querying database to restore property:\n" + q);
                let dbConn = new stardog_connection_1.StardogConn(db);
                dbConn.getQuery({ query: q, accept: 'application/n-triples' });
                return rp(dbConn.options);
            }
            else if (setReliability) {
                let sp = new opm_query_generator_1.OPMProp();
                const q = sp.setReliability(input);
                console.log("Querying database to set reliability of property:\n" + q);
                let dbConn = new stardog_connection_1.StardogConn(db);
                dbConn.getQuery({ query: q, accept: 'application/n-triples' });
                return rp(dbConn.options);
            }
            else {
                if (!value) {
                    this.errorHandler("Error: No value specified", 400);
                }
                var q = `SELECT ?propTypeURI WHERE { GRAPH <${graphURI}> {?s ?propTypeURI <${propertyURI}>} }`;
                console.log("Querying database to get property type:\n" + q);
                let dbConn = new stardog_connection_1.StardogConn(db);
                dbConn.getQuery({ query: q, accept: 'application/n-triples' });
                return rp(dbConn.options)
                    .then(res => {
                    if (res && res.results.bindings) {
                        var propertyTypeURI = res.results.bindings[0].propTypeURI.value;
                        console.log("propertyTypeURI: " + propertyTypeURI);
                        return this.validateValue(value, propertyTypeURI);
                    }
                    else {
                        this.errorHandler("Error: Could not find the specified property on the resource.", 500);
                    }
                })
                    .then(d => {
                    var input = {
                        propertyURI: propertyURI,
                        prefixes: [{ prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#' }],
                        value: {
                            value: value,
                            datatype: "cdt:ucum"
                        }
                    };
                    var sp = new opm_query_generator_1.OPMProp();
                    var q = sp.putProp(input);
                    console.log("Querying database to get new property state triples:\n" + q);
                    let dbConn = new stardog_connection_1.StardogConn(db);
                    dbConn.getQuery({ query: q, accept: 'application/n-triples' });
                    return rp(dbConn.options);
                });
            }
        })
            .then(d => {
            if (!d) {
                if (restore) {
                    this.errorHandler("Error: Could not restore the property", 500);
                }
                else if (setReliability && setReliability == 'confirmed') {
                    this.errorHandler("Error: Could not confirm the property. Is the property deleted? Is it already confirmed? Is it a derived property? These are automatically confirmed when all arguments are confirmed.", 400);
                }
                else if (setReliability && setReliability == 'assumption') {
                    this.errorHandler("Error: Could not set the property as assumption. Is the property deleted? Is it confirmed? Is it already an assumption? Is it a derived property? These are automatically set as assumptions when all arguments are assumptions.", 400);
                }
                else {
                    this.errorHandler("Error: Is the specified value the same as the previous value?", 400);
                }
            }
            ntriples = d;
            var errorMsg = "Could not write property update to triplestore";
            return this.writeTriples(d, graphURI, db, errorMsg);
        })
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(ntriples, { format: 'application/nquads' });
        });
    }
    getProperty(req) {
        const db = req.params.db;
        const propertyURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        var getLatest = req.query.latest == 'true' ? true : false;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var input = { propertyURI: propertyURI, latest: getLatest };
        if (accept == 'application/json') {
            input.queryType = 'select';
        }
        return this.checkIfResourceExists(db, propertyURI)
            .then(d => {
            let sp = new opm_query_generator_1.OPMProp();
            const q = sp.getProps(input);
            console.log("Querying database to get property data:\n" + q);
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
    listSubscribers(req) {
        const db = req.params.db;
        var propertyURI = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        propertyURI = _s.strLeftBack(propertyURI, '/subscribers');
        var getFoIs = req.query.getFoIs == 'true' ? true : false;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var input = { propertyURI: propertyURI };
        if (accept == 'application/json') {
            input.queryType = 'select';
        }
        let sp = new opm_query_generator_1.OPMProp(input);
        var q = sp.listSubscribers();
        console.log("Querying database to get a list of subscribers to the property:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: accept, reasoning: getFoIs });
        return rp(dbConn.options);
    }
    listProperties(req) {
        const db = req.params.db;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        var restriction = req.query.restriction;
        var latest = req.query.latest == 'true' ? true : false;
        var args = (accept == 'application/json') ? { queryType: 'select' } : { queryType: 'construct' };
        if (latest) {
            args.latest = latest;
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
        if (restriction == 'outdated') {
            let sp = new opm_query_generator_1.OPMProp;
            var q = sp.listOutdated(args);
        }
        else {
            let sp = new opm_query_generator_1.OPMProp();
            var q = sp.getProps(args);
        }
        console.log("Querying database to list properties:\n" + q);
        if (restriction) {
            console.log("Querying database to list " + restriction + " properties:\n" + q);
        }
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
    setPropertyReliability(db, input, type, graphURI, errorMsg) {
        var ntriples = '';
        let sp = new opm_query_generator_1.OPMProp(input);
        switch (type) {
            case "confirmed":
                var q = sp.confirmProp();
                break;
            case "assumption":
                var q = sp.makeAssumption();
        }
        console.log("Querying database to set property reliability:\n" + q);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/n-triples' });
        return rp(dbConn.options)
            .then(res => {
            if (!res) {
                this.errorHandler(errorMsg, 400);
            }
            ntriples = res;
            this.writeTriples(ntriples, graphURI, db, "Could not set property reliability");
        })
            .then(d => {
            var promises = jsonld.promises;
            return promises.fromRDF(ntriples, { format: 'application/nquads' });
        });
    }
}
exports.PropertyModel = PropertyModel;
