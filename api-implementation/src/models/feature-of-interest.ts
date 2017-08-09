import { Request } from "express";
import * as rp from "request-promise";
import * as _ from 'underscore';
import * as _s from 'underscore.string';
import * as jsonld from 'jsonld';
var errors = require('request-promise/errors');
import { OPMProp, IProp } from "opm-query-generator";
import { StardogConn } from "./../helpers/stardog-connection";

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';

//Queries
import { FoIQueries } from "./../queries/foi";

//Interfaces
import { C } from "./../queries/foi";
import { RUD } from "./../queries/foi";
import { GetByType } from "./../queries/foi";

//Lists
var validProperties = require('./../../public/lists/valid-properties.json');

export class FoIModel extends BaseModel {

    private restrictions: string[] = ['deleted', 'assumptions', 'derived', 'confirmed'];
    private reliabilities: string[] = ['assumption', 'confirmed'];

    /**
     * 
     * @method getFoIs(req, restriction)    //Get a list of all FoIs or only deleted FoIs
     * @method postFoI(req)                 //Create a new FoI
     * @method deleteFoI(req)               //Delete a FoI
     * @method putFoI(req)                  //Update or restore a FoI
     * @method getFoIProps(req, restriction)//Get a list of all properties of a FoI
     * @method postFoIProp(req)             //Create a property attached to a FoI
     */

    //Get FoIs
    getFoIs(req: Request){
        const db: string = req.params.db;
        const foiType: string = req.params.foi;
        const typeURI: string = 'https://w3id.org/seas/'+foiType;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Query parameters
        var restriction: string = req.query.restriction;

        //Define arguments for getAllOfType()
        var args: GetByType = {typeURI: typeURI}
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        //Restrictions
        if(restriction){
            var options = this.restrictions;
            if(options.indexOf(restriction) == -1){this.errorHandler("Error: Unknown restriction. Use either "+_s.toSentence(options, ', ', ' or '), 400)};
            args.restriction = restriction;
        };

        //Validate FoI Type
        return new Promise ((resolve, reject) => resolve(this.validateFoIType(typeURI)))
                .then(d => {
                    //Get all FoIs of that type
                    let fq = new FoIQueries;
                    var q = fq.getAllOfType(args);

                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query:q, accept: accept});
                    console.log("Querying database for FoIs of type "+typeURI+": "+q);
                    return rp(dbConn.options);
                });
    }

    //Post FoI
    //Also possible to generate and attach a property
    postFoI(req: Request){
        const db: string = req.params.db;
        const foiType: string = req.params.foi;
        const typeURI: string = 'https://w3id.org/seas/'+foiType;

        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!
        
        //Body
        const domain: string = req.body.domain;     //Domain for the FoI (HVAC, Architecture etc.)
        const label: string = req.body.label;       //Label for the FoI
        const comment: string = req.body.comment;   //Description of the FoI

        //Graph URI
        if(!domain){ this.errorHandler("Error: No domain specified",400) }

        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `https://${host}/${db}`;
        const graphURI: string = `${hostURI}/${domain}`;

        var ntriples: string = '';

        //Validate FoI Type
        return new Promise ((resolve, reject) => resolve(this.validateFoIType(typeURI)))
                .then(d => {
                    //Create a FoI of that type
                    let fq = new FoIQueries;
                    var args: C = {typeURI: typeURI, hostURI: hostURI, label: label, comment: comment, userURI: dummyUser};
                    var q = fq.create(args);

                    console.log("Querying database createNewFoI(): "+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});
                    return rp(dbConn.options)
                })
                .then(d => {
                    if(d){
                        //Store created triples
                        ntriples = d;

                        //Write new property to datastore
                        var errorMsg = "Could not create FoI";
                        this.writeTriples(d, graphURI, db, errorMsg);
                    }else{ this.errorHandler("Error: Could not create new FoI",500) }
                })
                .then(d => {
                    //Parse n-triples to JSON-LD
                    var promises = jsonld.promises;
                    return promises.fromRDF(ntriples, {format: 'application/nquads'});
                });
    }

    //Delete FoI
    deleteFoI(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const foiURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = 'https://www.niras.dk/employees/mojo'; //TEMP!
        
        return this.checkIfResourceExists(db,foiURI)
                .then(d => {
                    //Remove class opm:Deleted
                    let fq = new FoIQueries;
                    var args: RUD = {foiURI: foiURI, userURI: dummyUser};
                    var q = fq.delete(args);

                    //Execute query
                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
                    console.log("Querying database to mark FoI as deleted:\n"+q);
                    return rp(dbConn.options);
                })
                .then(qres => {
                    return (qres == 'true') ? ("Successfully deleted "+foiURI) : (this.errorHandler("Could not delete FoI",500));
                })
    }

    //Update FoI
    putFoI(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const guid: string = req.params.guid;
        const foiURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!

        //Body
        const label: string = req.body.label;           //Optional: If change of FoI: Label of FoI. Else not used
        const comment: string = req.body.comment;       //Optional: If change of FoI: Description of FoI. If change of property: Why is it updated?

        //Query parameters
        var restore: boolean = req.query.restore == 'true' ? true : false;  //If a deleted property should be restored
            
        return this.checkIfResourceExists(db,foiURI)
            .then(d => {
                if(restore){
                    //Restore deleted FoI by deleting class opm:Deleted
                    let fq = new FoIQueries;
                    var args: RUD = {foiURI: foiURI, userURI: dummyUser};
                    var q = fq.restore(args);

                    //Execute query
                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
                    console.log("Querying database to mark FoI as non-deleted: "+q);
                    return rp(dbConn.options)
                            .then(qres => {
                                return (qres == 'true') ? ("Successfully restored "+foiURI) : (this.errorHandler("Could not restore FoI",500));
                            })
                }else{
                    //Update FoI metadata
                    let fq = new FoIQueries;
                    var args: RUD = {foiURI: foiURI, label: label, comment: comment, userURI: dummyUser};
                    var q = fq.update(args);

                    //Execute query
                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
                    console.log("Querying database to update FoI metadata: "+q);
                    return rp(dbConn.options)
                            .then(qres => {
                                return (qres == 'true') ? ("Successfully updated "+foiURI+". NB! If the property is deleted, no changes have been made.") : (this.errorHandler("Could not update FoI",500));
                            })
                }
            })
    }

    //Get FoI properties
    getFoIProps(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const foiURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        const foiType: string = req.params.foi;
        const typeURI: string = 'https://w3id.org/seas/'+foiType;
        const graphURI = new UriFunctions(req, "HVAC").graphUri(); //TEMP

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Query parameters
        var property = req.query.property;                                      //If querying for a specific property
        var latest: boolean = req.query.latest == 'true' ? true : false;     //If querying for only the latest property evaluation
        var language: string = req.query.language ? req.query.language : 'en';  //Default language english
        var restriction: string = req.query.restriction;

        //Set arguments for get query
        var args: IProp = { foiURI: foiURI, language: language };

        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        if(latest){ args.latest = latest };                 //Return only latest?
        if(property){ args.property = 'seas:'+property };   //Query for specific property?
        //Restrictions
        if(restriction){
            var options = this.restrictions;
            if(options.indexOf(restriction) == -1){this.errorHandler("Error: Unknown restriction. Use either "+_s.toSentence(options, ', ', ' or '), 400)};
            args.restriction = restriction;
        };

        return this.checkIfResourceExists(db,foiURI)
                .then(d => {
                    return this.checkIfResourceDeleted(db,foiURI);
                })
                .then(d => {
                    let sp = new OPMProp(args);
                    const q = sp.getFoIProps();
                    console.log("Querying database for FoI properties: "+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: accept});
                    return rp(dbConn.options)
                });
    }

    //POST FEATURE OF INTEREST PROPERTY
    postFoIProp(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const foiURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        const foiType: string = req.params.foi;
        const typeURI: string = 'https://w3id.org/seas/'+foiType;
        const graphURI = new UriFunctions(req, "HVAC").graphUri(); //TEMP

        //Body
        var value = req.body.value; //Clean
        var valueObj = this.separateValueUnit(value);
        const reliability: string = req.body.reliability;   //Optional: How reliable is the property?
        const comment: string = req.body.comment;           //Optional: Property description?

        //Query parameters
        var property = req.query.property; //If querying for a specific property
        if(!property){ this.errorHandler("Error: No property specified",400) }

        var ntriples: string = '';
        var propertyTypeURI: string = '';
        
        return this.checkIfResourceExists(db,foiURI)
                .then(d => {
                    //Get an array of available properties for the specific type of FoI
                    var validProperties = this.validateFoIType(typeURI);

                    //Is the recieved property valid? Must be in list
                    //get the URI of the property
                    propertyTypeURI = this.validatePropertyType(property,validProperties);

                    //Validate value
                    return this.validateValue(value,propertyTypeURI);
                })
                .then(d => {
                    //Define input
                    var input: IProp = {
                        foiURI: foiURI,
                        prefixes: [{prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}],
                        value: {
                            value: valueObj.value,
                            datatype: "cdt:ucum",
                            property: propertyTypeURI
                        }
                    };
                    if(valueObj.unit){
                        input.value.unit = valueObj.unit;
                    };
                    if(reliability){
                        var options = this.reliabilities;
                        if(options.indexOf(reliability) == -1){
                            this.errorHandler("Error: Unknown reliability definition. Use either "+_s.toSentence(options, ', ', ' or '), 400)
                        };
                        input.reliability = reliability;
                    }
                    
                    //Generate query
                    var sp = new OPMProp(input);
                    var q = sp.postFoIProp();

                    //Run query
                    console.log("Querying database to get new FoI triples:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});

                    //Return result
                    return rp(dbConn.options)
                        .then(d => {
                            //No results means that the property is already defined
                            if(d){
                                //Store created triples
                                ntriples = d;

                                //Write new property to datastore
                                var errorMsg = "Could not create property";
                                return this.writeTriples(d, graphURI, db, errorMsg);
                            }else{ 
                                this.errorHandler("Error: Does the FoI already have the specified property? - if so, do a PUT request instead",400) 
                            }
                        })
                })
                .then(d => {
                    //Parse n-triples to JSON-LD
                    var promises = jsonld.promises;
                    return promises.fromRDF(ntriples, {format: 'application/nquads'});
                });
    }

}