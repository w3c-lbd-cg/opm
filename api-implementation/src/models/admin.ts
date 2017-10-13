import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import * as N3 from "n3";

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";
import { GeneralQueries } from "./../queries/general";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';
const protocol = AppConfig.protocol;
const host = AppConfig.host;

//Lists
var defaultNamespaces: NS[] = require('./../../public/lists/default-namespaces.json');

//Interfaces
import { ICalc } from "./../interfaces/calculation";
export interface NS {
    prefix: string;
    uri: string;
}

export class AdminModel extends BaseModel {

    /**
     * DATABASE
     * @method wipeDB()     Wipe either the whole db or a named graph in the db
     * @method postQuery()  Wipe either the whole db or a named graph in the db
     */

    postQuery(req: Request){
        const db: string = req.params.db;
        const q = req.body.query;

        //Perform query
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query: q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }

    getQuery(req: Request){
        const db: string = req.params.db;
        const q = req.body.query;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        console.log(accept);

        //Perform query
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        console.log("Querying database: "+q);
        return rp(dbConn.options)
            .then(d => {
                if(accept != 'application/ld+json'){ return d; }
                return this.compactJSONLD(d);
            });
    }

    //Wipe database
    wipeDB(req: Request){
        //Define constants
        const db: string = req.params.db;
        const graphURI = req.body.graphURI;
        return this.wipeAll(db,graphURI);
    }

    /**
     * EXTERNAL ONTOLOGIES
     * @method attachOntology() Attach an external ontology
     * @method reloadOntology() Delete an external ontology and reload the most recent one
     * @method detachOntology() Delete an external ontology
     * @method listOntologies() Get a list of available external ontologies
     */

    //Attach ontology
    attachOntology(req: Request){
        //Define constants
        const db: string = req.params.db;
        const named_graph_name: string = req.body.named_graph_name;
        const data_url: string = req.body.graph_url;
        const named_graph_uri = `${protocol}://${host}/${db}/admin/externalOntology/${named_graph_name}`;
        //Check if named graph exists
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
                if(exist.boolean == false){
                    return exist;
                }else{
                    errors.error = "A named graph with that name already exists in the database!";
                    errors.statusCode = 404;
                    throw errors;
                }
            })
            .then(d => {
                //Attach external ontology
                const q = `LOAD <${data_url}> INTO GRAPH <${named_graph_uri}>`;
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(d => {
                //Store graph data
                const q =  `PREFIX prov: <http://www.w3.org/ns/prov#>
                            INSERT DATA {GRAPH <${named_graph_uri}> {<${named_graph_uri}> prov:hadPrimarySource <${data_url}>}}`;
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(function(d){
                if(d == 'true'){
                    return "Successfully attached graph data";
                } else{
                    errors.error = "An error occured when trying to attach graph data";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    //Reload ontology
    reloadOntology(req: Request){
        //Define constants
        const db: string = req.params.db;
        const data_url: string = req.body.graph_url;
        const named_graph_uri: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        //Check if named graph exists
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
                if(exist.boolean == true){
                    return exist;
                }else{
                    errors.error = "No named graph with that name in the database!";
                    errors.statusCode = 404;
                    throw errors;
                }
            })
            .then(data => {
                //Delete named graph
                const cmd: string = `stardog data remove ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db}  --named-graph ${named_graph_uri} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
                console.log(cmd);
                return this.executeCmd(cmd);
            })
            .then(d => {
                //Attach external ontology
                const q = `LOAD <${data_url}> INTO GRAPH <${named_graph_uri}>`;
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(d => {
                //Store graph data
                const q =  `PREFIX prov: <http://www.w3.org/ns/prov#>
                            INSERT DATA {GRAPH <${named_graph_uri}> {<${named_graph_uri}> prov:hadPrimarySource <${data_url}>}}`;
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(function(d){
                if(d == 'true'){
                    return "Successfully reattached graph data";
                } else{
                    errors.error = "An error occured when trying to attach graph data";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    //Delete ontology
    detachOntology(req: Request){
        //Define constants
        const db: string = req.params.db;
        const named_graph_uri: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        console.log(named_graph_uri);
        //Check if it exists
        return this.checkIfGraphExist(db, named_graph_uri)
            .then(exist => {
                if(exist.boolean == true){
                    return exist;
                }else{
                    errors.error = "No named graph with that name in the database!";
                    errors.statusCode = 404;
                    throw errors;
                }
            })
            .then(data => {
                //Delete named graph
                return this.wipeAll(db,named_graph_uri)
                    .then(d => {
                        return "Successfully detached the ontology."
                    });
            });
    }
    //List ontologies
    listOntologies(req: Request){
        //Define constants
        const db: string = req.params.db;
        const q: string =  `PREFIX prov: <http://www.w3.org/ns/prov#>
                            SELECT DISTINCT ?uri ?data_uri (COUNT(?s)-1 AS ?size)
                            WHERE {
                                GRAPH ?uri {?s ?p ?o}
                                OPTIONAL {GRAPH ?uri {?uri prov:hadPrimarySource ?data_uri}}
                                FILTER(substr(str(?uri), 30, 16) = 'externalOntology')
                            } GROUP BY ?uri ?data_uri ORDER BY ASC(?uri)`;
        console.log("Querying database: "+q.replace(/ +(?= )/g,''));
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }

    /**
     * NAMESPACES
     * @method addNamespace()       add a namespace - either takes a single namespace or an array (latter is faster)
     * @method updateNamespace()    update namespace - takes full ns list
     * @method removeNamespace()    remove a namespace
     * @method getNamespaces()      list namespaces
     */
    
    //Add namespace - either takes a single namespace or an array (latter is faster)
    addNamespace(req: Request): any{
        //Define constants
        const db: string = req.params.db;
        const body: any[] = req.body;

        if(!body.length){
            //If single
            //Use cmd (slow)
            const prefix: string = req.body.prefix;
            const uri: string = req.body.uri;
            //Execute command
            const cmd: string = `stardog namespace add ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db} --prefix ${prefix} --uri ${uri} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
            return this.executeCmd(cmd);
        }else{
            //If array
            //Use http (fast)
            var arr = _.map(body, item => {
                return '"'+item.prefix+'='+item.uri+'"';
            })

            let dbConn = new StardogConn(db);
            dbConn.addNamespaces(arr.toString());
            console.log(dbConn.options);
            dbConn.options;
            return rp(dbConn.options);
        }

        
    }

    //Update namespace
    updateNamespace(req: Request): any{
        //Define constants
        const db: string = req.params.db;
        const body: any[] = req.body;

        if(!body.length){
            //If single
            //Use cmd (slow)
            const prefix: string = req.body.prefix;
            const uri: string = req.body.uri;
            //Remove NS
            const cmd: string = `stardog namespace remove ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db} --prefix ${prefix} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
            return this.executeCmd(cmd)
                .then(d => {
                    //Add NS
                    const cmd: string = `stardog namespace add ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db} --prefix ${prefix} --uri ${uri} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
                    return this.executeCmd(cmd);
                });
        }else{
            //If array
            //Use http (fast)
            var arr = _.map(body, item => {
                return '"'+item.prefix+'='+item.uri+'"';
            })

            let dbConn = new StardogConn(db);
            dbConn.addNamespaces(arr.toString());
            console.log(dbConn.options);
            dbConn.options;
            return rp(dbConn.options);
        }

        
    }

    //Remove namespace
    removeNamespace(req: Request): any {
        //Define constants
        const db: string = req.params.db;
        const prefix: string = req.params.prefix;
        
        //Execute command
        const cmd: string = `stardog namespace remove ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db} --prefix ${prefix} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
        return this.executeCmd(cmd);
    }
    //Namespace list
    getNamespaces(req: Request){
        const db: string = req.params.db;
        let dbConn = new StardogConn();
        dbConn.getNamespaces(db);
        console.log(dbConn.options);
        return rp(dbConn.options)
            .then(d => {
                console.log(d);
                var res: any[] = JSON.parse(d.replace("database.namespaces", "ns")).ns;
                if(res){
                    return _.map(res, x => {
                        var prefix = _s.strLeft(x, "=");
                        var uri = _s.strRight(x, "=");
                        return {prefix: prefix, uri: uri};
                    })
                }else{
                    errors.error = "Could not get namespaces";
                    errors.statusCode = 500;
                    throw errors;
                }
            })
            .then(d => {
                //Sort results by prefix
                return _.sortBy(d, obj => {
                    return obj.prefix;
                })
            });
    }
    //List rules
    listRules(req: Request): any {
        //Define constants
        const db: string = req.params.db;
        const q: string =  `PREFIX rule:   <tag:stardog:api:rule:> \
                            SELECT DISTINCT ?URI ?label ?comment ?rule \
                            WHERE { \
                                ?URI a rule:SPARQLRule ; rdfs:label ?label ; rule:content ?rule . \
                                OPTIONAL{ ?URI rdfs:comment ?comment } \
                            }`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    //Delete rule
    deleteRule(req: Request): any {
        //Define constants
        const db: string = req.params.db;
        const URI: string = req.body.uri;
        
        const q: string =  `DELETE WHERE { <${URI}> ?p ?o }`;
        
        return this.checkIfResourceExists(db,URI)
            .then(data => {
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options)
            })
            .then(data => {
                if(data.boolean == true){
                    return `Successfully deleted rule`
                }else{
                    errors.error = "Could not delete rule";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    //Add rule
    addRule(req: Request): any {
        //Define constants
        const db: string = req.params.db;
        const label: string = req.body.label;
        const comment: string = req.body.comment; //Optional
        const rule: string = req.body.rule;
        
        //Create a URI for the rule
        let uf = new UriFunctions(req, "Rule");
        var URI = uf.newUri();
        
        const q: string =  `PREFIX rule:<tag:stardog:api:rule:> \
                            INSERT DATA { \
                                <${URI}> a rule:SPARQLRule ; \
                                        rdfs:label "${label}"^^xsd:string ; \
                                        rdfs:comment "${comment}"^^xsd:string ; \
                                        rule:content "${rule}" . \
                            }`;
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options)
    }
}