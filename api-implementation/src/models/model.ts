import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
import * as _ from "underscore";
import * as _s from 'underscore.string';
import { OPMProp, IProp } from "opm-query-generator";
import * as jsonld from 'jsonld';
var errors = require('request-promise/errors');

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

//Lists
var validProperties = require('./../../public/lists/valid-properties.json');
var context = require('./../../public/lists/jsonld-context.json');

//Queries
import { FoIQueries } from "./../queries/foi";

//Interfaces
import { C } from "./../queries/foi";
import { RUD } from "./../queries/foi";
import { GetByType } from "./../queries/foi";

export class BaseModel {

    //Error handler
    errorHandler(msg,code){
        console.log("Error code "+code+": "+msg);
        errors.error = msg;
        errors.statusCode = code;
        throw errors;
    }
       
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
                if(d != 'true'){ this.errorHandler("Error: Could not delete resources",500) }
                return `Successfully wiped the database`;
            });
    }
    
    checkIfResourceExists(db,URI){
        let fq = new FoIQueries;
        var args = {foiURI: URI};
        const q = fq.checkIfFoIExists(args);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database to check if FoI exists:\n"+q);
        return rp(dbConn.options)
            .then(exist => {
                if(exist.boolean != true){ this.errorHandler("Error: No entity with the specified URI.",400) }
                return "Entity exists.";
            })
    }

    checkIfResourceDeleted(db,URI){
        let fq = new FoIQueries;
        var args = {foiURI: URI};
        const q = fq.checkIfFoIDeleted(args);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query:q});
        console.log("Querying database to check if FoI is marked as opm:Deleted:\n"+q);
        return rp(dbConn.options)
            .then(deleted => {
                if(deleted.boolean == true){ this.errorHandler("Error: The entity is marked as deleted. Restore it by PUT "+URI+"?restore=true",400) };
                return "Entity is not deleted.";
            })
    }
    
    checkIfGraphExist(db,graph_name){
        const q: string = `ASK WHERE {GRAPH <${graph_name}> {?s ?p ?o}}`;
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
                if(data === 'true'){ this.errorHandler("Error: Property already exists on this resource.",400) }

                //Get named graph
                let gq = new GeneralQueries;
                var q = gq.getResourceNamedGraph(resourceURI);
                let dbConn = new StardogConn(db);
                dbConn.getQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(data => {
                if(_.isEmpty(data.results.bindings[0])){ this.errorHandler("Error: Could not get the named graph.",500) }
                var graphURI = data.results.bindings[0].g.value;
                //Attach property
                let gq = new GeneralQueries;
                var q = gq.addObjectProperty(resourceURI, propertyURI, objectURI, graphURI);
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                console.log("Querying database: "+q);
                return rp(dbConn.options);
            })
            .then(data => {
                if(data != 'true'){ this.errorHandler("Error: Could not create resource.",500) }
                return `Successfully created object property`;
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
    
    executeCmd(cmd): any{
        console.log("Executing command: "+cmd);
        return _exec(cmd).then(result => {
            if(result.stderr){ this.errorHandler(result.stderr,500) }
            return result.stdout;
        });
    }

    writeTriples(triples, graphURI, db, errorMsg){
        //Isert the triples in the named graph
        var q: string = `INSERT DATA {
                            GRAPH <${graphURI}> { ${triples} }}`;

        let dbConn = new StardogConn(db);
        dbConn.updateQuery({query:q});

        console.log("Writing triples: "+q);
        return rp(dbConn.options)
                .then(qres => {
                    if(qres != 'true'){ this.errorHandler(errorMsg,500) }
                    return;
                })
    }

    convertToJSONLD(ntriples){
        //Parse n-triples to JSON-LD
        var promises = jsonld.promises;
        return promises.fromRDF(ntriples, {format: 'application/nquads'})
                        .then(d => {
                            //See what @types are defined in the data
                            var types: string[] = [];
                            var used: string[] = _.chain(d)
                            .map(obj => {
                                var keys = _.keys(obj);
                                //General types
                                types = types.concat(obj['@type']);
                                types = types.concat(keys);
                                //Literal datatypes
                                _.each(keys, key => {
                                    _.each(obj[key], item => {
                                        if(item['@type']){ types.push(item['@type']); }
                                    })
                                });
                                return types;
                            }).flatten().reject(item => {
                                return _s.startsWith(item, '@');
                            })
                            .map(item => {
                                if(_s.contains(item, '#')){
                                    return _s.strLeftBack(item, '#')+'#';
                                }else if(_s.contains(item, '/')){
                                    return _s.strLeftBack(item, '/')+'/';
                                }
                                return item;
                            })
                            .uniq().value();

                            //Filter context array
                            var ctxt = _.filter(context, item => {
                                return _.contains(used, item['uri']);
                            });

                            //Write context object
                            var c = {};
                            _.each(ctxt, item => {{
                                c[item['prefix']] = item['uri'];
                            }})

                            //Do compaction according to context file
                            var promises = jsonld.promises;
                            return promises.compact(d, c);
                        });
    }

    /**
     * VALIDATION
     */

    validateValue(value,propertyTypeURI){
        var valueObj = this.separateValueUnit(value);
        var propertyTypeURI = propertyTypeURI.replace("seas:", "https://w3id.org/seas/");

        //Get restriction (what type of unit etc.)
        //var propertyRestrictions = this.getPropertyRestrictions(propertyTypeURI,validProperties);
        var propertyRestrictions = _.chain(validProperties)
                .map(item => item.properties)
                .flatten()
                .filter(obj => (obj.uri == propertyTypeURI))
                .first()
                .value();

        if(propertyRestrictions){
            //For regular quantifiable properties
            if(!propertyRestrictions.objectProperty){
                //Unit correct?
                if(valueObj.unit != propertyRestrictions.unit){
                    this.errorHandler("Error: Unit mismatch. Expected unit: "+propertyRestrictions.unit,400);
                }
            //For object properties - WIP
            }else{
                if(!_s.startsWith(value, 'http')){
                    this.errorHandler("Error: Target of an object property must be a valid URI",400);
                }
                return "Object properties will be implemented later";
            }

        }
        return "Value OK!";
    }

    separateValueUnit(string){
        var str = _s.clean(string); //Clean
        //If it contains a space it has a unit assigned to it
        if(_s.contains(str, ' ')){
            var value: string = _s.strLeft(str, ' ');
            var unit: string = _s.strRight(str, ' ');
        }else{
            var value: string = str;
        }
        return {value: value, unit: unit};
    }

    validateFoIType(foiType){
        //Check if the recieved FoI is valid
        var foiTypes = _.pluck(validProperties, 'foiType');
        var index = foiTypes.indexOf(foiType);
        if(index != -1){
            return validProperties[index].properties;
        }else{
            this.errorHandler("Error: Not a valid FoI-type",400);
        }
    }

    validatePropertyType(property,validProperties){
        //Match only on the part after last '/'
        var propertyValid = _.chain(validProperties)
                                .pluck('uri')
                                .map(item => {
                                    if(_s.contains(item, '/')){
                                        return _s.strRightBack(item, '/');
                                    }else if(_s.contains(item, '#')){
                                        return _s.strRightBack(item, '#');
                                    }
                                    return item;
                                })
                                .contains(_s.strRightBack(property, '/'))
                                .value();
        if(!_s.startsWith(property, 'http')) property = 'seas:'+property;
        if(!propertyValid){ this.errorHandler("Error: Not a valid property-type",400); }
        return property;
    }

    getPropertyRestrictions(propertyTypeURI,validProperties){
        return _.chain(validProperties)
                .filter(obj => {
                    var propEnd1 = _s.strRightBack(obj.uri, "/");
                    var propEnd2 = _s.strRightBack(obj.uri, "#");
                    return (propEnd1 == propertyTypeURI || propEnd2 == propertyTypeURI);
                })
                .first()
                .value();
    }

}