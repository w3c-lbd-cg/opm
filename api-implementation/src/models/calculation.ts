import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import * as N3 from "n3";
import { OPMCalc, ICalc } from "opm-query-generator";

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';

export class CalculationModel extends BaseModel {

    //Get properties and their latest evaluations
    createCalculation(req: Request): any{
        //Create resource
        const db:string = req.params.db;
        const host: string = req.headers.host.split(':')[0];

        //Get property
        const property = req.query.property;
        if(property){
            switch(property) {
                case "fluidTemperatureDifference":
                    var graphURI = "https://localhost/seas/HVAC-I";
                    var input: ICalc = {
                            args: [
                                { property: 'seas:fluidSupplyTemperature' },
                                { property: 'seas:fluidReturnTemperature' }
                            ],
                            result: {
                                unit: 'Cel',
                                datatype: 'cdt:ucum',
                                property: 'seas:fluidTemperatureDifference',
                                calc: 'abs(?arg1-?arg2)'
                            },
                            prefixes: [
                                {prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}
                            ]
                        };

                    let sc = new OPMCalc(input);
                    const q = sc.postCalc();
                    console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                    let dbConn = new StardogConn(db);
                    dbConn.constructQuery({query: q});
                    return rp(dbConn.options)
                            .then(d => {
                                if(!d){
                                    errors.error = "All calculated values are up to date";
                                    errors.statusCode = 200;
                                    throw errors;
                                }
                                //Isert the triples in the named graph
                                var q: string = `INSERT DATA {
                                                 GRAPH <${graphURI}> { ${d} }}`;

                                let dbConn = new StardogConn(db);
                                dbConn.updateQuery({query:q});
                     
                                console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                                return rp(dbConn.options)
                            });
                default:
                    return new Promise ((resolve, reject) => resolve("Unknown property"));
            }
        }else{
            return new Promise ((resolve, reject) => resolve("Please specify a property"));
        }
    }
    
    getOutdatedOnResource(req: Request){
        const db:string = req.params.db;
        const foi:string = req.params.foi;
        const guid:string = req.params.guid;
        const host: string = req.headers.host.split(':')[0];
        var input: ICalc = { resourceURI: `https://${host}/${db}/${foi}/${guid}` };    
        let sc = new OPMCalc(input);
        const q = sc.listOutdated();
        console.log("Querying database: "+q.replace(/ +(?= )/g,''));
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options)
    }
    
}