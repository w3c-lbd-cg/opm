import { Request } from "express";
import * as rp from "request-promise";
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import { OPMProp, OPMCalc, IProp, ICalc } from "opm-query-generator";
import { StardogConn } from "./../helpers/stardog-connection";

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";
import { GeneralQueries } from "./../queries/general";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';

export class PropertyModel extends BaseModel {

    deleteProperty(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const propertyURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        var graphURI: string = '';

        //Define input
        var input: IProp = { propertyURI: propertyURI };
        
        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Get named graph
                    let gq = new GeneralQueries;
                    var q = gq.getResourceNamedGraph(propertyURI);
                    console.log("Querying database for named graph: "+q.replace(/ +(?= )/g,''));
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            if(d && d.results.bindings){
                                //Return graphURI
                                return {graphURI: d.results.bindings[0].g.value, triples: ''}
                            }
                            else{
                                errors.error = "Error: Could not retrieve the graph of the property";
                                errors.statusCode = 200;
                                throw errors;
                            }
                        })
                })
                .then(d => {
                    let sp = new OPMProp(input);
                    const q = sp.deleteProp();
                    console.log("Querying database for delete prop construct:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.constructQuery({query: q});
                    return rp(dbConn.options)
                        .then(x => {
                            if(!x){
                                errors.error = "Error: Could not delete the property";
                                errors.statusCode = 200;
                                throw errors;
                            }
                            else {
                                d.triples = x;
                                return d;
                            }
                        })
                })
                .then(d => {
                    // Isert the triples in the named graph
                    var q: string = `INSERT DATA {
                                        GRAPH <${d.graphURI}> { ${d.triples} }}`;

                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
            
                    console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                    return rp(dbConn.options);
                })
                .then(d => {
                    console.log("Deleted resource "+propertyURI);
                    return "Successfully deleted resource "+propertyURI
                })
    }

    updateProperty(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const propertyURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!

        //Query parameters
        var setValidity: string = req.query.setValidity;
        var restore: boolean = req.query.restore == 'true' ? true : false; //If a deleted property should be restored

        if(restore == true && setValidity){
            errors.error = "Error: Cannot both set validity of a property and restore it";
            errors.statusCode = 200;
            throw errors;
        }
        
        //Define input
        var input: IProp = { propertyURI: propertyURI, userURI: dummyUser };

        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Get named graph
                    let gq = new GeneralQueries;
                    var q = gq.getResourceNamedGraph(propertyURI);
                    console.log("Querying database for named graph: "+q.replace(/ +(?= )/g,''));
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            if(d && d.results.bindings){
                                //Return graphURI
                                return {graphURI: d.results.bindings[0].g.value, triples: ''}
                            }
                            else{
                                errors.error = "Error: Could not retrieve the graph of the property";
                                errors.statusCode = 200;
                                throw errors;
                            }
                        })
                })
                .then(d => {
                    if(restore){
                        //Restore property
                        let sp = new OPMProp(input);
                        const q = sp.restoreProp();
                        console.log("Querying database to restore property:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.constructQuery({query: q});
                        return rp(dbConn.options)
                                .then(x => {
                                    if(!x){
                                        errors.error = "Error: Could not delete the property";
                                        errors.statusCode = 200;
                                        throw errors;
                                    }
                                    else {
                                        d.triples = x;
                                        return d;
                                    }
                                })
                    }else if(setValidity && setValidity == 'confirmed'){
                        //Confirm property
                        let sp = new OPMProp(input);
                        const q = sp.confirmProp();
                        console.log("Querying database to confirm property:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.constructQuery({query: q});
                        return rp(dbConn.options)
                                .then(x => {
                                    if(!x){
                                        errors.error = "Error: Could not confirm the property. Is the property deleted? Is it already confirmed? Is it a derived property? These are automatically confirmed when all arguments are confirmed.";
                                        errors.statusCode = 200;
                                        throw errors;
                                    }
                                    else {
                                        d.triples = x;
                                        return d;
                                    }
                                })
                    }else if(setValidity && setValidity == 'assumption'){
                        //Make property an assumption
                        let sp = new OPMProp(input);
                        const q = sp.makeAssumption();
                        console.log("Querying database to make property assumption:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.constructQuery({query: q});
                        return rp(dbConn.options)
                                .then(x => {
                                    if(!x){
                                        errors.error = "Error: Could not set the property as assumption. Is the property deleted? Is it confirmed? Is it already an assumption? Is it a derived property? These are automatically set as assumptions when all arguments are assumptions.";
                                        errors.statusCode = 200;
                                        throw errors;
                                    }
                                    else {
                                        d.triples = x;
                                        return d;
                                    }
                                })
                    }else{
                        //Regular property update to be implemented
                    }
                    return;
                })
                .then(d => {
                    // Isert the triples in the named graph
                    var q: string = `INSERT DATA {
                                        GRAPH <${d.graphURI}> { ${d.triples} }}`;

                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
            
                    console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                    return rp(dbConn.options);
                })
                .then(d => {
                    var msg = '';
                    if(setValidity == 'assumption'){msg = 'set "Assumed" for'}
                    else if(restore){msg = 'restored'}
                    else if(setValidity == 'confirmed'){msg = 'confirmed'}
                    console.log(msg+" property "+propertyURI);
                    return "Successfully "+msg+" property "+propertyURI
                })
    }

    getProperty(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const propertyURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        //Query parameters
        var getLatest: boolean = req.query.latest == 'true' ? true : false; //If querying for only the latest property evaluation

        //Define input
        var input: IProp = { propertyURI: propertyURI, latest: getLatest };

        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Return property data
                    let sp = new OPMProp(input);
                    const q = sp.getProp();
                    console.log("Querying database to get property data:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q});
                    return rp(dbConn.options);
                })
    }

    listSubscribers(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        var propertyURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        propertyURI = _s.strLeftBack(propertyURI, '/subscribers');

        //Define input
        var input = {propertyURI: propertyURI}

        let sp = new OPMProp(input);
        const q = sp.listSubscribers();
        console.log("Querying database to get a list of subscribers to the property:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }

    listProperties(req: Request){
        const db: string = req.params.db;

        let sp = new OPMProp();
        const q = sp.getResourceProps();
        console.log("Querying database to get a full list of properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }

    listDeleted(req: Request){
        const db: string = req.params.db;

        let sp = new OPMProp();
        const q = sp.listDeleted();
        console.log("Querying database to get list of deleted properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }

    listOutdated(req: Request){
        const db: string = req.params.db;

        let sp = new OPMCalc();
        const q = sp.listOutdated();
        console.log("Querying database to get list of outdated properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }

    listAssumptions(req: Request){
        const db: string = req.params.db;

        let sp = new OPMProp();
        const q = sp.listAssumptions();
        console.log("Querying database to get assumptions list:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q});
        return rp(dbConn.options);
    }
    
}