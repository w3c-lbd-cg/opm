import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import * as N3 from "n3";
import { OPMCalc, ICalc } from "opm-query-generator";
//Interfaces
import { GetCalc } from "opm-query-generator";
import * as jsonld from 'jsonld';

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';
const protocol = AppConfig.protocol;

export class CalculationModel extends BaseModel {

    listCalculations(req: Request){
        const db:string = req.params.db;
        
        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD
        var args: ICalc = (accept == 'application/json') ? {queryType: 'select'} : {queryType: 'construct'};
        let sc = new OPMCalc;
        const q = sc.listCalculations(args);
        console.log("Querying database to list calculations:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        return rp(dbConn.options)
            .then(d => {
                if(accept != 'application/ld+json'){ return d; }
                return this.compactJSONLD(d);
            });
    }

    //Update all calculations
    putCalculations(req: Request){
        const db:string = req.params.db;
        const graphURI = `${protocol}://localhost/opm/HVAC-I`;

        //Step 1 - infer outdated classes
        var args = {graphURI: graphURI};
        let sc = new OPMCalc;
        const q = sc.putOutdated(args);
        console.log("Querying database to get outdated properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                .then(d => {
                    if(!d){ return "No triples to infer"; }
                    var errorMsg = "Problem writing data about outdated states to store";
                    this.writeTriples(d, graphURI, db, errorMsg);
                    return "Successfully wrote triples to store";
                })
    }

    getCalculation(req: Request){
        const db:string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `${protocol}://${host}/${db}`;
        const calculationURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD
        var args: GetCalc = {calculationURI: calculationURI};
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';

        //Construct query
        let sc = new OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        return rp(dbConn.options)
            .then(d => {
                if(accept != 'application/ld+json'){ return d; }
                return this.compactJSONLD(d);
            });
    }

    createCalculation(req: Request): any{
        const db:string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `${protocol}://${host}/${db}`;

        var dummyDomain: string = 'HVAC';
        const dummyUser: string = `${protocol}://www.niras.dk/employees/mhra`; //TEMP!
        var graphURI: string = hostURI+'/'+dummyDomain;

        //Empty variables
        var ntriples: string = '';

        //Body
        var input = req.body;
        input.hostURI = hostURI;
        input.userURI = dummyUser;

        //Validation
        //Later

        let sc = new OPMCalc;
        const q = sc.postCalcData(input);
        
        console.log("Querying database to add a calculation:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                    .then(d => {
                        if(!d){ this.errorHandler("Error: Could not create new calculation",500) }
                        //Store created triples
                        ntriples = d;

                        //Write new property to datastore
                        var errorMsg = "Could not create calculation";
                        this.writeTriples(d, graphURI, db, errorMsg);
                    })
                    .then(d => {
                        var promises = jsonld.promises;
                        return promises.fromRDF(ntriples, {format: 'application/nquads'})
                                .then(d => {
                                    return this.compactJSONLD(d);
                                });
                    });
    }

    //Attach calculation in all situations where the specified criteria are met.
    //Only for new instances
    attachCalculation(req: Request): any{
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `${protocol}://${host}/${db}`;
        const calculationURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        var ntriples: string;
        var graphURI: string;

        //Get calculation data
        var args: ICalc = {calculationURI: calculationURI, queryType: 'construct'};
        let sc = new OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                .then(d => {
                    var promises = jsonld.promises;
                    return promises.fromRDF(d, {format: 'application/nquads'})
                            .then(d => {
                                return this.compactJSONLD(d);
                            });
                })
                .then(d => {
                    //Map prefixes
                    var prefixes = [];
                    _.each(d["@context"], (value, key) => {
                        prefixes.push({prefix: key, uri: value});
                        return;
                    });
                    //Define input for calculation
                    var input = {
                        calculationURI: calculationURI,
                        expression: d["opm:expression"],
                        inferredProperty: d["opm:inferredProperty"]["@id"],
                        argumentPaths: d["opm:argumentPaths"]["@list"],
                        unit: {value: d["opm:unit"]["@value"], datatype: d["opm:unit"]["@type"]},
                        prefixes: prefixes
                    }
                    //Store graph URI
                    graphURI = d["sd:namedGraph"]["@id"];

                    //Generate query
                    let sc = new OPMCalc;
                    const q = sc.postCalc(input);
                    console.log("Querying database to infer new calculated properties:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});
                    return rp(dbConn.options);
                })
                .then(d => {
                    if(!d){ return "The calculation was not attached to any new resources - calculation already up to date."; }
                    //Store created triples
                    ntriples = d;

                    //Write new property to datastore
                    var errorMsg = "Could not attach calculation to FoIs";
                    return this.writeTriples(d, graphURI+'-I', db, errorMsg)
                        .then(d => {
                            var promises = jsonld.promises;
                            return promises.fromRDF(ntriples, {format: 'application/nquads'})
                                    .then(d => {
                                        return this.compactJSONLD(d);
                                    });
                        });
                });
    }

    //Re-run calculation in all situations where the specified criteria are met.
    //Only updating instances that already have the calculation assigned, but
    //where one or more argument(s) have changed.
    reRunCalculation(req: Request): any{
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `${protocol}://${host}/${db}`;
        const calculationURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        var ntriples: string;
        var graphURI: string;

        //Get calculation data
        var args: ICalc = {calculationURI: calculationURI, queryType: 'construct'};
        let sc = new OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                .then(d => {
                    var promises = jsonld.promises;
                    return promises.fromRDF(d, {format: 'application/nquads'})
                            .then(d => {
                                return this.compactJSONLD(d);
                            });
                })
                .then(d => {
                    //Map prefixes
                    var prefixes = [];
                    _.each(d["@context"], (value, key) => {
                        prefixes.push({prefix: key, uri: value});
                        return;
                    });
                    //Define input for calculation
                    var input = {
                        calculationURI: calculationURI,
                        expression: d["opm:expression"],
                        inferredProperty: d["opm:inferredProperty"]["@id"],
                        argumentPaths: d["opm:argumentPaths"]["@list"],
                        unit: {value: d["opm:unit"]["@value"], datatype: d["opm:unit"]["@type"]},
                        prefixes: prefixes
                    }
                    //Store graph URI
                    graphURI = d["sd:namedGraph"]["@id"];

                    //Generate query
                    let sc = new OPMCalc;
                    const q = sc.putCalc(input);
                    console.log("Querying database to update calculated properties:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});
                    return rp(dbConn.options);
                })
                .then(d => {
                    if(!d){ return "No new calculation results were inferred - calculation already up to date."; }
                    //Store created triples
                    ntriples = d;

                    //Write new property to datastore
                    var errorMsg = "Could not update calculation.";
                    return this.writeTriples(d, graphURI+'-I', db, errorMsg)
                        .then(d => {
                            var promises = jsonld.promises;
                            return promises.fromRDF(ntriples, {format: 'application/nquads'})
                                    .then(d => {
                                        return this.compactJSONLD(d);
                                    });
                        });
                });
    }
    
}