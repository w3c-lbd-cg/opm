import { Request } from "express";
import * as rp from "request-promise";
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import { OPMProp } from "opm-query-generator";
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
const protocol = AppConfig.protocol;
const host = AppConfig.host;

//Interfaces
import { PutProp, PostPutFoIProp, GetProp } from "opm-query-generator";

export class PropertyModel extends BaseModel {

    private restrictions: string[] = ['deleted', 'assumption', 'derived', 'confirmed', 'outdated'];
    private reliabilities: string[] = ['assumption', 'confirmed'];

    deleteProperty(req: Request){
        const db: string = req.params.db;
        const propertyURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = `${protocol}://www.niras.dk/employees/mhra`; //TEMP!

        //Body
        const comment: string = req.body.string;       //Optional: Why is it deleted?

        //Define input
        var input = { propertyURI: propertyURI, comment: comment, userURI: dummyUser };

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
                    let sp = new OPMProp();
                    const q = sp.deleteProp(input);
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
        const propertyURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        const dummyUser: string = `${protocol}://www.niras.dk/employees/mhra`; //TEMP!
        
        //Body
        var value = req.body.value;
        const comment: string = req.body.comment;           //Optional: Why is it updated?
        var reliability: string = req.body.reliability;   //Optional: How reliable is the property?

        //Query parameters
        var setReliability: string = req.query.setReliability;
        if(setReliability) reliability = setReliability;
        var restore: boolean = req.query.restore == 'true' ? true : false; //If a deleted property should be restored

        if(restore == true && setReliability){
            this.errorHandler("Error: Cannot both set reliability of a property and restore it",400);
        }

        //Empty variables
        var graphURI: string = '';
        var ntriples: string = '';
        
        //Define input
        var input: any = { propertyURI: propertyURI, userURI: dummyUser, comment: comment };
        if(reliability){
            var options = this.reliabilities;
            if(options.indexOf(reliability) == -1){
                this.errorHandler("Error: Unknown reliability definition. Use either "+_s.toSentence(options, ', ', ' or '), 400)
            };
            input.reliability = reliability;
        }
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
                        let sp = new OPMProp();
                        const q = sp.restoreProp(input);
                        console.log("Querying database to restore property:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q, accept: 'application/n-triples'});
                        return rp(dbConn.options);
                    }else if(setReliability){
                        //Set property reliability
                        let sp = new OPMProp();
                        const q = sp.setReliability(input);
                        console.log("Querying database to set reliability of property:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q, accept: 'application/n-triples'});
                        return rp(dbConn.options);
                    }else{
                        //Regular property update
                        if(!value){ this.errorHandler("Error: No value specified",400); }

                        //Get propertyType
                        var q = `SELECT ?propTypeURI WHERE { GRAPH <${graphURI}> {?s ?propTypeURI <${propertyURI}>} }`;
                        console.log("Querying database to get property type:\n"+q);
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q, accept: 'application/n-triples'});
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
                                var input: PutProp = {
                                    propertyURI: propertyURI,
                                    prefixes: [{prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}],
                                    value: {
                                        value: value,
                                        datatype: "cdt:ucum"
                                    }
                                };
                                
                                //Generate query
                                var sp = new OPMProp();
                                var q = sp.putProp(input);

                                //Run query
                                console.log("Querying database to get new property state triples:\n"+q);
                                let dbConn = new StardogConn(db);
                                dbConn.getQuery({query: q, accept: 'application/n-triples'});

                                //Return result
                                return rp(dbConn.options);
                            })
                    }
                })
                .then(d => {
                    //No results means that the property is already defined
                    if(!d){
                        if(restore){
                            this.errorHandler("Error: Could not restore the property",500);
                        }else if(setReliability && setReliability == 'confirmed'){
                            this.errorHandler("Error: Could not confirm the property. Is the property deleted? Is it already confirmed? Is it a derived property? These are automatically confirmed when all arguments are confirmed.", 400);
                        }else if(setReliability && setReliability == 'assumption'){          
                            this.errorHandler("Error: Could not set the property as assumption. Is the property deleted? Is it confirmed? Is it already an assumption? Is it a derived property? These are automatically set as assumptions when all arguments are assumptions.", 400);
                        }else{
                            this.errorHandler("Error: Is the specified value the same as the previous value?",400)
                        }
                    }                        
                    
                    //Store created triples
                    ntriples = d;

                    //Write new property to datastore
                    var errorMsg = "Could not write property update to triplestore";
                    return this.writeTriples(d, graphURI, db, errorMsg);
                })
                .then(d => {
                    //Parse n-triples to JSON-LD
                    var promises = jsonld.promises;
                    return promises.fromRDF(ntriples, {format: 'application/nquads'});
                });
    }

    getProperty(req: Request){
        const db: string = req.params.db;
        const propertyURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;

        //Query parameters
        var getLatest: boolean = req.query.latest == 'true' ? true : false; //If querying for only the latest property evaluation

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Define input
        var input: GetProp = { propertyURI: propertyURI, latest: getLatest };
        if(accept == 'application/json'){input.queryType = 'select';}

        return this.checkIfResourceExists(db,propertyURI)
                .then(d => {
                    //Return property data
                    let sp = new OPMProp();
                    const q = sp.getProps(input);
                    console.log("Querying database to get property data:\n"+q);
                    let dbConn = new StardogConn(db);
                    dbConn.getQuery({query: q, accept: accept});
                    return rp(dbConn.options);
                })
                .then(d => {
                    if(accept != 'application/ld+json'){ return d; }
                    return this.compactJSONLD(d);
                });
    }

    listSubscribers(req: Request){
        const db: string = req.params.db;
        var propertyURI: string = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
        propertyURI = _s.strLeftBack(propertyURI, '/subscribers');

        //Query parameters
        var getFoIs: boolean = req.query.getFoIs == 'true' ? true : false; //Querying for resources requires reasoning
        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Define input
        var input: any = {propertyURI: propertyURI}
        if(accept == 'application/json'){input.queryType = 'select';}

        let sp = new OPMProp(input);
        var q = sp.listSubscribers();
        console.log("Querying database to get a list of subscribers to the property:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept, reasoning: getFoIs});
        return rp(dbConn.options);
    }

    listProperties(req: Request){
        const db: string = req.params.db;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        //Query parameters
        var restriction: string = req.query.restriction;
        var latest: boolean = req.query.latest == 'true' ? true : false;

        //Define arguments for getProps()
        var args: any = (accept == 'application/json') ? {queryType: 'select'} : {queryType: 'construct'};
        //Restrictions
        if(latest){ args.latest = latest };
        if(restriction){
            var options = this.restrictions;
            if(options.indexOf(restriction) == -1){this.errorHandler("Error: Unknown restriction. Use either "+_s.toSentence(options, ', ', ' or '), 400)};
            args.restriction = restriction;
        };
        
        if(restriction == 'outdated'){
            let sp = new OPMProp;
            var q = sp.listOutdated(args);
        }else{
            let sp = new OPMProp();
            var q = sp.getProps(args);
        }

        console.log("Querying database to list properties:\n"+q);
        if(restriction){
            console.log("Querying database to list "+restriction+" properties:\n"+q);
        }
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        return rp(dbConn.options)
                .then(d => {
                    if(accept != 'application/ld+json'){ return d; }
                    return this.compactJSONLD(d);
                })
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