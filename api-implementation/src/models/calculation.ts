import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import * as N3 from "n3";
import { OPMCalc, ICalc } from "opm-query-generator";
import * as jsonld from 'jsonld';

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';

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
        return rp(dbConn.options);
    }

    createCalculation(req: Request): any{
        const db:string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `https://${host}/${db}`;

        var dummyDomain: string = 'HVAC';
        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!
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
                        if(d){
                            //Store created triples
                            ntriples = d;

                            //Write new property to datastore
                            var errorMsg = "Could not create calculation";
                            this.writeTriples(d, graphURI, db, errorMsg);
                        }else{ this.errorHandler("Error: Could not create new calculation",500) }
                    })
                    .then(d => {
                        return this.convertToJSONLD(ntriples);
                    });
    }

    //Assign calculation in all situations where the specified criteria are met.
    //Only for new instances
    reAssignCalculation(req: Request): any{
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const hostURI: string = `https://${host}/${db}`;
        const calculationURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        var ntriples: string;

        //Get calculation data
        var args: ICalc = {calculationURI: calculationURI, queryType: 'construct'};
        let sc = new OPMCalc;
        const q = sc.getCalcData(args);
        console.log("Querying database to get calculation data:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                .then(d => {
                    return this.convertToJSONLD(d);
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
                    //Generate query
                    let sc = new OPMCalc;
                    const q = sc.postCalc(input);
                    console.log("Querying database to infer new calculated properties:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});
                    return rp(dbConn.options);
                })
                .then(d => {
                    ntriples = d;
                    //NEXT: WRITE TO DB
                    return d;
                })
                .then(d => {
                    return this.convertToJSONLD(ntriples);
                });
    }

    //Re-run calculation in all situations where the specified criteria are met.
    //Only updating instances that already have the calculation assigned, but
    //where one or more argument(s) have changed.
    reRunCalculation(req: Request): any{
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const calculationURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        return new Promise ((resolve, reject) => resolve("PUT calculation for "+calculationURI));
    }

    // //Get properties and their latest evaluations
    // createCalculation(req: Request): any{
    //     //Create resource
    //     const db:string = req.params.db;
    //     const host: string = req.headers.host.split(':')[0];

    //     //Get property
    //     const property = req.query.property;
    //     if(property){
    //         switch(property) {
    //             case "fluidTemperatureDifference":
    //                 var graphURI = `https://${host}/${db}/HVAC-I`;
    //                 var input: ICalc = {
    //                         args: [
    //                             { property: 'seas:fluidSupplyTemperature' },
    //                             { property: 'seas:fluidReturnTemperature' }
    //                         ],
    //                         result: {
    //                             unit: 'Cel',
    //                             datatype: 'cdt:ucum',
    //                             property: 'seas:fluidTemperatureDifference',
    //                             calc: 'abs(?arg1-?arg2)'
    //                         },
    //                         prefixes: [
    //                             {prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}
    //                         ]
    //                     };

    //                 let sc = new OPMCalc(input);
    //                 const q = sc.postCalc();
    //                 console.log("Querying database to infer new derived values:\n"+q);
    //                 let dbConn = new StardogConn(db);
    //                 dbConn.getQuery({query: q, accept: 'application/n-triples'});
    //                 return rp(dbConn.options)
    //                         .then(d => {
    //                             if(!d){ this.errorHandler("All calculated values are up to date",200) };
    //                             //Isert the triples in the named graph
    //                             var q: string = `INSERT DATA {
    //                                              GRAPH <${graphURI}> { ${d} }}`;

    //                             let dbConn = new StardogConn(db);
    //                             dbConn.updateQuery({query:q});

    //                             console.log("Querying database: "+q);
    //                             return rp(dbConn.options)
    //                         });
    //             default:
    //                 return new Promise ((resolve, reject) => resolve("Unknown property"));
    //         }
    //     }else{
    //         return new Promise ((resolve, reject) => resolve("Please specify a property"));
    //     }
    // }
    
}