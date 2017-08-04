import { Request } from "express";
import * as rp from "request-promise";
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
//import { OPMProp, OPMCalc, IProp, ICalc } from "opm-query-generator";
import { OPMProp, OPMCalc, IProp, ICalc } from "opm-query-generator";
import { StardogConn } from "./../helpers/stardog-connection";
import * as jsonld from 'jsonld';

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

        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!

        //Body
        const comment: string = req.body.string;       //Optional: Why is it deleted?

        //Define input
        var input: IProp = { propertyURI: propertyURI, comment: comment, userURI: dummyUser };

        //Empty variables
        var graphURI: string = '';
        var ntriples: string = '';
        
        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Get named graph
                    let gq = new GeneralQueries;
                    var q = gq.getResourceNamedGraph(propertyURI);
                    console.log("Querying database for named graph: "+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            if(!d || !d.results.bindings){ this.errorHandler("Error: Could not retrieve the graph of the property",500) }
                            //Return graphURI
                            graphURI = d.results.bindings[0].g.value;
                            return "Found graph";
                        })
                })
                .then(d => {
                    let sp = new OPMProp(input);
                    const q = sp.deleteProp();
                    console.log("Querying database for delete prop construct:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: 'application/n-triples'});
                    return rp(dbConn.options)
                        .then(d => {
                            if(!d){ this.errorHandler("Error: Could not generate deletion triples",500) }
                            ntriples = d;
                            return "Generated deletion triples";
                        })
                })
                .then(d => {
                    // Isert the triples in the named graph
                    var q: string = `INSERT DATA {
                                        GRAPH <${graphURI}> { ${ntriples} }}`;

                    let dbConn = new StardogConn(db);
                    dbConn.updateQuery({query:q});
            
                    console.log("Querying database to write deleted property state to graph:\n"+q);
                    return rp(dbConn.options)
                })
                .then(d => {
                    if(!d){ this.errorHandler("Error: Could not delete the property",500) }
                    ntriples = d;
                    return "Successfully deleted property "+propertyURI;
                })
    }

    updateProperty(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const propertyURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = 'https://www.niras.dk/employees/mhra'; //TEMP!
        
        //Body
        var value = req.body.value;
        var valueObj = this.separateValueUnit(value);
        const comment: string = req.body.comment;       //Optional: Why is it updated?

        //Query parameters
        var setReliability: string = req.query.setReliability;
        var restore: boolean = req.query.restore == 'true' ? true : false; //If a deleted property should be restored

        if(restore == true && setReliability){
            this.errorHandler("Error: Cannot both set reliability of a property and restore it",400);
        }

        //Empty variables
        var graphURI: string = '';
        var ntriples: string = '';
        
        //Define input
        var input: IProp = { propertyURI: propertyURI, userURI: dummyUser, comment: comment };

        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Get named graph
                    let gq = new GeneralQueries;
                    var q = gq.getResourceNamedGraph(propertyURI);
                    console.log("Querying database for named graph:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            if(!d || !d.results.bindings){ this.errorHandler("Error: Could not retrieve the graph of the property",500) }
                            //Return graphURI
                            graphURI = d.results.bindings[0].g.value;
                            return graphURI;
                        })
                })
                .then(d => {
                    if(restore){
                        //Restore property
                        let sp = new OPMProp(input);
                        const q = sp.restoreProp();
                        console.log("Querying database to restore property:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q, accept: 'application/n-triples'});
                        return rp(dbConn.options)
                                .then(d => {
                                    if(!d){ this.errorHandler("Error: Could not restore the property",500) }                                        
                                    //Store created triples
                                    ntriples = d;

                                    //Write new property to datastore
                                    var errorMsg = "Could not create property";
                                    return this.writeTriples(d, graphURI, db, errorMsg);
                                })
                                .then(d => {
                                    //Parse n-triples to JSON-LD
                                    var promises = jsonld.promises;
                                    return promises.fromRDF(ntriples, {format: 'application/nquads'});
                                });
                    }else if(setReliability){
                        switch(setReliability) {
                            case "confirmed":
                                var errorMsg = "Error: Could not confirm the property. Is the property deleted? Is it already confirmed? Is it a derived property? These are automatically confirmed when all arguments are confirmed."
                                break;
                            case "assumption":
                                var errorMsg = "Error: Could not set the property as assumption. Is the property deleted? Is it confirmed? Is it already an assumption? Is it a derived property? These are automatically set as assumptions when all arguments are assumptions."
                                break;
                            default:
                                this.errorHandler("Error: Not a valid reliability property",400);
                        }
                        return this.setPropertyReliability(db, input, setReliability, graphURI, errorMsg);
                    }else{
                        //Regular property update
                        if(!value){
                            this.errorHandler("Error: No value specified",400);
                        }

                        //Get propertyType
                        var q = `SELECT ?propTypeURI WHERE { GRAPH <${graphURI}> {?s ?propTypeURI <${propertyURI}>} }`;
                        console.log("Querying database to get property type:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q});
                        return rp(dbConn.options)
                            .then(res => {
                                if(res && res.results.bindings){
                                    //Get property type URI
                                    var propertyTypeURI = res.results.bindings[0].propTypeURI.value;
                                    console.log("propertyTypeURI: "+propertyTypeURI);
                                    //Validate value
                                    return this.validateValue(value,propertyTypeURI);
                                }
                                else{ this.errorHandler("Error: Could not find the specified property on the resource.",500) }
                            })
                            .then(d => {
                                //Define input
                                var input: IProp = {
                                    propertyURI: propertyURI,
                                    prefixes: [{prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}],
                                    value: {
                                        value: valueObj.value,
                                        datatype: "cdt:ucum"
                                    }
                                };
                                if(valueObj.unit){
                                    input.value.unit = valueObj.unit;
                                };
                                
                                //Generate query
                                var sp = new OPMProp(input);
                                var q = sp.putProp();

                                //Run query
                                console.log("Querying database to get new property state triples:\n"+q);
                                let dbConn = new StardogConn(db);
                                dbConn.getQuery({query: q, accept: 'application/n-triples'});

                                //Return result
                                return rp(dbConn.options)
                                    .then(d => {
                                        //No results means that the property is already defined
                                        if(!d){ this.errorHandler("Error: Is the specified value the same as the previous value?",400) }
                                        
                                        //Store created triples
                                        ntriples = d;

                                        //Write new property to datastore
                                        var errorMsg = "Could not create property";
                                        return this.writeTriples(d, graphURI, db, errorMsg);
                                    })
                                    .then(d => {
                                        //Parse n-triples to JSON-LD
                                        var promises = jsonld.promises;
                                        return promises.fromRDF(ntriples, {format: 'application/nquads'});
                                    });
                            })
                    }
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

        //Query parameters
        var getFoIs: boolean = req.query.getFoIs == 'true' ? true : false; //Querying for resources requires reasoning
        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Define input
        var input: IProp = {propertyURI: propertyURI}
        if(accept == 'application/json'){input.queryType = 'select';}

        let sp = new OPMProp(input);
        var q = sp.listSubscribers();
        console.log("Querying database to get a list of subscribers to the property:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept, reasoning: getFoIs});
        return rp(dbConn.options);
    }

    listProperties(req: Request, restriction?: string){
        const db: string = req.params.db;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Define arguments for getFoIProps()
        var args: IProp = {latest: true};
        args.queryType = (accept == 'application/json') ? 'select' : 'construct';
        //Restrictions
        if(restriction){ args.restriction = restriction };

        let sp = new OPMProp(args);
        const q = sp.getFoIProps();

        console.log("Querying database to list properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        return rp(dbConn.options);
    }

    listOutdated(req: Request){
        const db: string = req.params.db;

        //Query parameters
        var getFoIs: boolean = req.query.getFoIs == 'true' ? true : false; //Querying for resources requires reasoning
        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD
        
        var input: IProp = {};
        if(accept == 'application/json'){input.queryType = 'select';}

        let sp = new OPMCalc(input);
        const q = sp.listOutdated();
        console.log("Querying database to get list of outdated properties:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept, reasoning: getFoIs});
        return rp(dbConn.options);
    }

    /**
     * MISC
     * Not pointed to directly by a route, but used in methods above
     */

    setPropertyReliability(db, input, type, graphURI, errorMsg){
        //Empty variables
        var ntriples: string = '';

        //Generate query
        let sp = new OPMProp(input);
        switch(type) {
            case "confirmed":
                var q = sp.confirmProp();
                break;
            case "assumption":
                var q = sp.makeAssumption();
        }

        console.log("Querying database to set property reliability:\n"+q);

        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/n-triples'});
        return rp(dbConn.options)
                .then(res => {
                    if(!res){ this.errorHandler(errorMsg,400) }

                    //Store created triples
                    ntriples = res;

                    //Write new property to datastore
                    this.writeTriples(ntriples, graphURI, db, "Could not set property reliability");
                })
                .then(d => {
                    //Parse n-triples to JSON-LD
                    var promises = jsonld.promises;
                    return promises.fromRDF(ntriples, {format: 'application/nquads'});
                });
    }

}