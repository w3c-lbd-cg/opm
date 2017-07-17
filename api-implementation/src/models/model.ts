import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
import * as _ from "underscore";

var exec = require('child_process').exec;
var errors = require('request-promise/errors');

var _exec = require('child-process-promise').exec;

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";
import { GeneralQueries } from "./../queries/general";

//Interfaces
import { IQueryString } from "./../interfaces/qs";

export class BaseModel {
       
    wipeAll(db,graphURI?){
        if(graphURI){
            let gq = new GeneralQueries;
            var q = gq.wipeNamedGraph(graphURI);
        }else{
            let gq = new GeneralQueries;
            var q = gq.wipeAll();
        }
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query:q});
        return rp(dbConn.options)
            .then(d => {
                console.log(d);
                if(d === 'true'){
                    return `Successfully wiped the database`;
                }else{
                    errors.error = "Could not delete resources";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    
    checkIfResourceExists(db,URI){
        let gq = new GeneralQueries;
        const q = gq.checkIfResourceExists(URI);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options)
            .then(exist => {
                if(exist.boolean == true){
                    return exist;
                }else{
                    errors.error = "No entity with the specified URI!";
                    errors.statusCode = 404;
                    throw errors;
                }
            });
    }

    checkIfPropertyDefined(db,resourceURI,propertyURI){
        var q: string = `SELECT DISTINCT ?property WHERE {
                                { <${resourceURI}> <${propertyURI}> ?property }
                            UNION
                                { GRAPH ?g {
                                    <${resourceURI}> <${propertyURI}> ?property}
                                }
                        }`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    checkIfGraphExist(db,graph_name){
        const q: string = `ASK WHERE {GRAPH <${graph_name}> {?s ?p ?o}}`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    deleteEntity(db,URI){
        const q: string = `DELETE WHERE { 
                              GRAPH ?g { <${URI}> ?p ?o . }
                           }`;
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    //Get all properties of a resource
    getProperties(db,URI){
        //const q: string = `SELECT ?property ?value WHERE { <${URI}> ?property ?value . }`;
        const q: string =  `SELECT ?property ?value {
                                { <${URI}> ?property ?value }
                            UNION
                                { graph ?g { <${URI}> ?property ?value } }
                            }`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    addObjectProperty(db, resourceURI, propertyURI, objectURI){
        //Check if object exists
        return this.checkIfResourceExists(db,objectURI)
            .then (data => {
                console.log("her");
                console.log(data);
                //Check if property already exists on resource
                let gq = new GeneralQueries;
                var q = gq.checkIfPropertyExistOnResource(resourceURI,propertyURI);
                let dbConn = new StardogConn(db);
                dbConn.getQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(data => {
                if(data === 'true'){
                    errors.error = "Property already exists on this resource.";
                    errors.statusCode = 400;
                    throw errors;
                }
                //Get named graph
                let gq = new GeneralQueries;
                var q = gq.getResourceNamedGraph(resourceURI);
                let dbConn = new StardogConn(db);
                dbConn.getQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(data => {
                if(_.isEmpty(data.results.bindings[0])){
                    errors.error = "Could not get the named graph";
                    errors.statusCode = 400;
                    throw errors;
                }else{
                    var graphURI = data.results.bindings[0].g.value;
                }
                //Attach property
                let gq = new GeneralQueries;
                var q = gq.addObjectProperty(resourceURI, propertyURI, objectURI, graphURI);
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(data => {
                if(data === 'true'){
                    return `Successfully created object property`;
                }else{
                    errors.error = "Could not create resource";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    
    //List all properties that can be assigned to a resource of a certain type
    getAvailableProperties(db, typeURI){
        const q: string = `SELECT ?uri ?label
                            WHERE {
                                GRAPH ?g {
                                    <${typeURI}> rdfs:subClassOf   [owl:onProperty ?uri] .
                                    OPTIONAL{ 
                                        ?uri rdfs:label ?label 
                                        FILTER(lang(?label)="en")
                                    } .
                                }
                            }`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    loadTTL(db, file, named_graph_URI){
        const q = `LOAD <${file}> INTO GRAPH <${named_graph_URI}>`;
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    getPropertyRange(db, URI){
        const q = `SELECT DISTINCT ?range WHERE { GRAPH ?g { <${URI}> rdfs:range ?range } }`;
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options).then(data => {
            if(data.results.bindings.length >= 0){
                return data.results.bindings[0].range;
            }else {
                errors.error = "Could not find the range of the specified property. Is the ontology loaded in the database?";
                errors.statusCode = 500;
                throw errors;
            }
        });
    }
    
    executeCmd(cmd): any{
        console.log("Executing command: "+cmd);
        return _exec(cmd).then(result => {
            if(result.stderr){
                errors.error = result.stderr;
                errors.statusCode = 500;
                throw errors;
            }else{
                return result.stdout;
            }
        });
    }
    
    getResourcesOfType(req,typeURI,graphURI?){
        //Define constants
        const db: string = req.params.db;
        var q: string;
        //Query DB
        if(!graphURI){
            q = `SELECT ?entity ?label WHERE { ?entity a <${typeURI}> . OPTIONAL { ?entity rdfs:label ?label } . }`;
        }else{
            q = `SELECT ?entity ?label WHERE { GRAPH <${graphURI}> { ?entity a <${typeURI}> . OPTIONAL { ?entity rdfs:label ?label } . }}`;
        }
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database: "+q);
        return rp(dbConn.options);
    }
    
    createNewResource(req,typeURI,graphURI?){
        //Define constants
        const type: string = typeURI.replace('#','/').split('/').pop(-1); //The type is the last part of the type URI
        const db: string = req.params.db;
        const label: string = req.body.label;
        const comment: string = req.body.comment;
        
        //Create a URI for the resource
        let uf = new UriFunctions(req, type);
        var URI = uf.newUri();
        
        //Construct query
        var q: string = `INSERT DATA {
                            GRAPH <${graphURI}> { 
                                <${URI}> a <${typeURI}> .`;
        q+= label ? `<${URI}> rdfs:label "${label}"^^xsd:string .` : '';
        q+= comment ? `<${URI}> rdfs:comment "${comment}"^^xsd:string .` : '';
        q+='}}';
        //Put it in the DB
        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query: q});
        console.log("Querying database: "+q);
        return rp(dbConn.options)
            .then(d => {
                if(d == 'true'){
                    return {message: "Successfully created resource", URIs: [URI]};
                }else{
                    errors.error = "Could not create resource";
                    errors.statusCode = 500;
                    throw errors;
                }
            })
    }
    
    deleteResource(req){
        //Define constants
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const URI: string = `https://${host}${req.originalUrl}`;
        
        //Check if resource exists and delete if true
        return this.checkIfResourceExists(db,URI)
            .then(data => {
                let bm = new BaseModel;
                return bm.deleteEntity(db,URI)
            })
            .then(result => {
                if(result == 'true'){
                    return `Resource ${URI} successfully deleted`;
                }else{
                    errors.error = "Could not delete resource";
                    errors.statusCode = 500;
                    throw errors;
                }
            });
    }
    
    getResourceProperties(req){
        //Define constants
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const URI: string = `https://${host}${req.originalUrl}`;
        
        //Check if resource exists and delete if true
        return this.checkIfResourceExists(db,URI)
            .then(exist => {
                let bm = new BaseModel;
                return bm.getProperties(db,URI);
            });
    }

}