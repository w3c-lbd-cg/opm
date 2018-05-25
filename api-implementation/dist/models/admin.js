"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
const _ = require("underscore");
const _s = require("underscore.string");
const model_1 = require("./model");
const uri_functions_1 = require("./../helpers/uri-functions");
const database_1 = require("./../config/database");
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
const host = app_1.AppConfig.host;
var defaultNamespaces = require('./../../public/lists/default-namespaces.json');
class AdminModel extends model_1.BaseModel {
    postQuery(req) {
        const db = req.params.db;
        const q = req.body.query;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.updateQuery({ query: q });
        console.log("Querying database: " + q);
        return rp(dbConn.options);
    }
    getQuery(req) {
        const db = req.params.db;
        const q = req.body.query;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        console.log(accept);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: accept });
        console.log("Querying database: " + q);
        return rp(dbConn.options)
            .then(d => {
            if (accept != 'application/ld+json') {
                return d;
            }
            return this.compactJSONLD(d);
        });
    }
    wipeDB(req) {
        const db = req.params.db;
        const graphURI = req.body.graphURI;
        return this.wipeAll(db, graphURI);
    }
    attachOntology(req) {
        const db = req.params.db;
        const named_graph_name = req.body.named_graph_name;
        const data_url = req.body.graph_url;
        const named_graph_uri = `${protocol}://${host}/${db}/admin/externalOntology/${named_graph_name}`;
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
            if (exist.boolean == false) {
                return exist;
            }
            else {
                errors.error = "A named graph with that name already exists in the database!";
                errors.statusCode = 404;
                throw errors;
            }
        })
            .then(d => {
            const q = `LOAD <${data_url}> INTO GRAPH <${named_graph_uri}>`;
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(d => {
            const q = `PREFIX prov: <http://www.w3.org/ns/prov#>
                            INSERT DATA {GRAPH <${named_graph_uri}> {<${named_graph_uri}> prov:hadPrimarySource <${data_url}>}}`;
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(function (d) {
            if (d == 'true') {
                return "Successfully attached graph data";
            }
            else {
                errors.error = "An error occured when trying to attach graph data";
                errors.statusCode = 500;
                throw errors;
            }
        });
    }
    reloadOntology(req) {
        const db = req.params.db;
        const data_url = req.body.graph_url;
        const named_graph_uri = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
            if (exist.boolean == true) {
                return exist;
            }
            else {
                errors.error = "No named graph with that name in the database!";
                errors.statusCode = 404;
                throw errors;
            }
        })
            .then(data => {
            const cmd = `stardog data remove ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db}  --named-graph ${named_graph_uri} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
            console.log(cmd);
            return this.executeCmd(cmd);
        })
            .then(d => {
            const q = `LOAD <${data_url}> INTO GRAPH <${named_graph_uri}>`;
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(d => {
            const q = `PREFIX prov: <http://www.w3.org/ns/prov#>
                            INSERT DATA {GRAPH <${named_graph_uri}> {<${named_graph_uri}> prov:hadPrimarySource <${data_url}>}}`;
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(function (d) {
            if (d == 'true') {
                return "Successfully reattached graph data";
            }
            else {
                errors.error = "An error occured when trying to attach graph data";
                errors.statusCode = 500;
                throw errors;
            }
        });
    }
    detachOntology(req) {
        const db = req.params.db;
        const named_graph_uri = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        console.log(named_graph_uri);
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
            if (exist.boolean == true) {
                return exist;
            }
            else {
                errors.error = "No named graph with that name in the database!";
                errors.statusCode = 404;
                throw errors;
            }
        })
            .then(data => {
            return this.wipeAll(db, named_graph_uri)
                .then(d => {
                return "Successfully detached the ontology.";
            });
        });
    }
    listOntologies(req) {
        const db = req.params.db;
        const q = `PREFIX prov: <http://www.w3.org/ns/prov#>
                            SELECT DISTINCT ?uri ?data_uri (COUNT(?s)-1 AS ?size)
                            WHERE {
                                GRAPH ?uri {?s ?p ?o}
                                OPTIONAL {GRAPH ?uri {?uri prov:hadPrimarySource ?data_uri}}
                                FILTER(substr(str(?uri), 30, 16) = 'externalOntology')
                            } GROUP BY ?uri ?data_uri ORDER BY ASC(?uri)`;
        console.log("Querying database: " + q.replace(/ +(?= )/g, ''));
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        return rp(dbConn.options);
    }
    addNamespace(req) {
        const db = req.params.db;
        const body = req.body;
        if (!body.length) {
            const prefix = req.body.prefix;
            const uri = req.body.uri;
            const cmd = `stardog namespace add ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db} --prefix ${prefix} --uri ${uri} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
            return this.executeCmd(cmd);
        }
        else {
            var arr = _.map(body, item => {
                return '"' + item.prefix + '=' + item.uri + '"';
            });
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.addNamespaces(arr.toString());
            console.log(dbConn.options);
            dbConn.options;
            return rp(dbConn.options);
        }
    }
    updateNamespace(req) {
        const db = req.params.db;
        const body = req.body;
        if (!body.length) {
            const prefix = req.body.prefix;
            const uri = req.body.uri;
            const cmd = `stardog namespace remove ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db} --prefix ${prefix} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
            return this.executeCmd(cmd)
                .then(d => {
                const cmd = `stardog namespace add ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db} --prefix ${prefix} --uri ${uri} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
                return this.executeCmd(cmd);
            });
        }
        else {
            var arr = _.map(body, item => {
                return '"' + item.prefix + '=' + item.uri + '"';
            });
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.addNamespaces(arr.toString());
            console.log(dbConn.options);
            dbConn.options;
            return rp(dbConn.options);
        }
    }
    removeNamespace(req) {
        const db = req.params.db;
        const prefix = req.params.prefix;
        const cmd = `stardog namespace remove ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db} --prefix ${prefix} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
        return this.executeCmd(cmd);
    }
    getNamespaces(req) {
        const db = req.params.db;
        let dbConn = new stardog_connection_1.StardogConn();
        dbConn.getNamespaces(db);
        console.log(dbConn.options);
        return rp(dbConn.options)
            .then(d => {
            console.log(d);
            var res = JSON.parse(d.replace("database.namespaces", "ns")).ns;
            if (res) {
                return _.map(res, x => {
                    var prefix = _s.strLeft(x, "=");
                    var uri = _s.strRight(x, "=");
                    return { prefix: prefix, uri: uri };
                });
            }
            else {
                errors.error = "Could not get namespaces";
                errors.statusCode = 500;
                throw errors;
            }
        })
            .then(d => {
            return _.sortBy(d, obj => {
                return obj.prefix;
            });
        });
    }
    listRules(req) {
        const db = req.params.db;
        const q = `PREFIX rule:   <tag:stardog:api:rule:> \
                            SELECT DISTINCT ?URI ?label ?comment ?rule \
                            WHERE { \
                                ?URI a rule:SPARQLRule ; rdfs:label ?label ; rule:content ?rule . \
                                OPTIONAL{ ?URI rdfs:comment ?comment } \
                            }`;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q });
        console.log("Querying database: " + q);
        return rp(dbConn.options);
    }
    deleteRule(req) {
        const db = req.params.db;
        const URI = req.body.uri;
        const q = `DELETE WHERE { <${URI}> ?p ?o }`;
        return this.checkIfResourceExists(db, URI)
            .then(data => {
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            console.log("Querying database: " + q);
            return rp(dbConn.options);
        })
            .then(data => {
            if (data.boolean == true) {
                return `Successfully deleted rule`;
            }
            else {
                errors.error = "Could not delete rule";
                errors.statusCode = 500;
                throw errors;
            }
        });
    }
    addRule(req) {
        const db = req.params.db;
        const label = req.body.label;
        const comment = req.body.comment;
        const rule = req.body.rule;
        let uf = new uri_functions_1.UriFunctions(req, "Rule");
        var URI = uf.newUri();
        const q = `PREFIX rule:<tag:stardog:api:rule:> \
                            INSERT DATA { \
                                <${URI}> a rule:SPARQLRule ; \
                                        rdfs:label "${label}"^^xsd:string ; \
                                        rdfs:comment "${comment}"^^xsd:string ; \
                                        rule:content "${rule}" . \
                            }`;
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.updateQuery({ query: q });
        console.log("Querying database: " + q);
        return rp(dbConn.options);
    }
}
exports.AdminModel = AdminModel;
