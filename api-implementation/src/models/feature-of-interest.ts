import { Request } from "express";
import * as rp from "request-promise";
import * as _ from 'underscore';
import * as _s from 'underscore.string';
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

//Lists
var validProperties = require('./../../public/lists/valid-properties.json');

export class FoIModel extends BaseModel {
    //Get resource data
    getFeatureOfInterest(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const resourceURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        const foiType: string = req.params.foi;
        const foiURI: string = 'https://w3id.org/seas/'+foiType;
        const graphURI = new UriFunctions(req, "HVAC").graphUri(); //TEMP

        //Query parameters
        var property = req.query.property; //If querying for a specific property
        var getLatest: boolean = req.query.latest == 'true' ? true : false; //If querying for only the latest property evaluation
        
        return this.checkIfResourceExists(db,resourceURI)
                .then(d => {
                    //Get the right array of available properties
                    var validProperties = this.validateFoItype(foiURI);
                    return {property: property, validProperties: validProperties};
                })
                .then(d => {
                    //If querying for a specific property
                    if(d.property){
                        var property = this.validatePropertyType(d.property,d.validProperties);
                        //Get latest property evaluation
                        var input: IProp = { 
                            resourceURI: resourceURI, 
                            propertyURI: property, 
                            latest: getLatest
                        };
                        let sp = new OPMProp(input);
                        const q = sp.getResourceProp();
                        console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q});
                        return rp(dbConn.options)
                    //If general query
                    }else{
                        //Get all properties and their latest evaluations
                        var input: IProp = { resourceURI: resourceURI, language: "en" };
                        let sp = new OPMProp(input);
                        const q = sp.getResourceProps();
                        console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                        let dbConn = new StardogConn(db);
                        dbConn.getQuery({query: q});
                        return rp(dbConn.options)
                    }
                })
    }

    //UPDATE PROPERTY ON FEATURE OF INTEREST
    putFeatureOfInterest(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const resourceURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        const foiType: string = req.params.foi;
        const foiURI: string = 'https://w3id.org/seas/'+foiType;
        const graphURI = new UriFunctions(req, "HVAC").graphUri(); //TEMP

        //Body
        var value = req.body.value; //Clean
        if(!value){
            errors.error = "No value specified";
            errors.statusCode = 400;
            throw errors;
        }
        var valueObj = this.separateValueUnit(value);

        //Query parameters
        var property = req.query.property; //If querying for a specific property
        if(!property){
            errors.error = "No property specified";
            errors.statusCode = 400;
            throw errors;
        }

        return this.checkIfResourceExists(db,resourceURI)
                .then(d => {
                    //Get the right array of available properties
                    var validProperties = this.validateFoItype(foiURI);
                    return {property: property, validProperties: validProperties};
                })
                .then(d => {
                    var property = this.validatePropertyType(d.property,d.validProperties);
                    var propertyRestrictions = this.getPropertyRestrictions(d.property,d.validProperties);
                    if(propertyRestrictions && propertyRestrictions.objectProperty){
                        //An object property is treated differently
                        if(!_s.startsWith(value, 'http')){
                            errors.error = "Object of an object property must be a valid URI";
                            errors.statusCode = 400;
                            throw errors;
                        }
                        errors.error = "Object properties will be implemented later";
                        errors.statusCode = 500;
                        throw errors;
                        // return this.addObjectProperty(db,resourceURI,property,value)
                        // .then(data => {
                        //     return `Successfully made ${resourceURI} a sub flow system of ${value}`
                        // });
                    }
                    //Unit correct?
                    if(!valueObj.unit == property.unit){
                        errors.error = "Unit mismatch";
                        errors.statusCode = 400;
                        throw errors;
                    }
                    //Define input
                    var input: IProp = {
                            resourceURI: resourceURI,
                            prefixes: [{prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}],
                            value: {
                                value: valueObj.value,
                                datatype: "cdt:ucum",
                                property: property
                            }
                        };
                    if(valueObj.unit){
                        input.value.unit = valueObj.unit;
                    };
                    var sp = new OPMProp(input);
                    var q = sp.putResourceProp();
                    console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                    let dbConn = new StardogConn(db);
                    dbConn.constructQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            if(!d){
                                errors.error = "Error: Does the property exist on the resource? - if not, do a POST request instead. Is the value different from last evaluation?";
                                errors.statusCode = 200;
                                throw errors;
                            }
                            //Isert the triples in the named graph
                            var q: string = `INSERT DATA {
                                                GRAPH <${graphURI}> { ${d} }}`;

                            let dbConn = new StardogConn(db);
                            dbConn.updateQuery({query:q});
                    
                            console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                            return rp(dbConn.options);
                        })
                })
                .then(d => {
                    return "Successfully updated property";
                });
    }

    //POST FEATURE OF INTEREST - CURRENTLY ONLY SUPPORTS ASSIGNING PROPERTIES
    postFeatureOfInterest(req: Request){
        const db: string = req.params.db;
        const host: string = req.headers.host.split(':')[0];
        const resourceURI: string = `https://${host}${req.originalUrl.split('?')[0]}`;
        const foiType: string = req.params.foi;
        const foiURI: string = 'https://w3id.org/seas/'+foiType;
        const graphURI = new UriFunctions(req, "HVAC").graphUri(); //TEMP

        //Body
        var value = req.body.value; //Clean
        if(!value){
            errors.error = "No value specified";
            errors.statusCode = 400;
            throw errors;
        }
        var valueObj = this.separateValueUnit(value);

        //Query parameters
        var property = req.query.property; //If querying for a specific property
        if(!property){
            //WIP: Should post a new FOI
            errors.error = "No property specified";
            errors.statusCode = 400;
            throw errors;
        }
        
        return this.checkIfResourceExists(db,resourceURI)
                .then(d => {
                    //Get the right array of available properties
                    var validProperties = this.validateFoItype(foiURI);
                    return {property: property, validProperties: validProperties};
                })
                .then(d => {
                    // Is the recieved property valid? Must be in list
                    //NB! Something is not right here. I could assign W to temperature
                    var property = this.validatePropertyType(d.property,d.validProperties);
                    var propertyRestrictions = this.getPropertyRestrictions(d.property,d.validProperties);

                    //Restrictions for property?
                    if(propertyRestrictions && propertyRestrictions.objectProperty){
                        //An object property is treated differently
                        if(!_s.startsWith(value, 'http')){
                            errors.error = "Object of an object property must be a valid URI";
                            errors.statusCode = 400;
                            throw errors;
                        }
                        errors.error = "Object properties will be implemented later";
                        errors.statusCode = 500;
                        throw errors;
                        // return this.addObjectProperty(db,resourceURI,property,value)
                        // .then(data => {
                        //     return `Successfully made ${resourceURI} a sub flow system of ${value}`
                        // });
                    }

                    //Unit correct?
                    if(!valueObj.unit == property.unit){
                        errors.error = "Unit mismatch";
                        errors.statusCode = 400;
                        throw errors;
                    }
                    //Define input
                    var input: IProp = {
                            resourceURI: resourceURI,
                            prefixes: [{prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}],
                            value: {
                                value: valueObj.value,
                                datatype: "cdt:ucum",
                                property: property
                            }
                        };
                    if(valueObj.unit){
                        input.value.unit = valueObj.unit;
                    };
                    var sp = new OPMProp(input);
                    var q = sp.postResourceProp();
                    console.log("Querying database: "+q.replace(/ +(?= )/g,''));
                    let dbConn = new StardogConn(db);
                    dbConn.constructQuery({query: q});
                    return rp(dbConn.options)
                        .then(d => {
                            //No results means that the property is already defined
                            if(!d){
                                errors.error = "Error: Does the resource already have the specified property? - if so, do a PUT request instead";
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
                        })
                })
                .then(d => {
                    return "Successfully added property to resource";
                });
    }

    /**
     * HELPERS
     */
    validateFoItype(foiURI){
        //Check if the recieved FoI is valid
        var resourceTypes = _.pluck(validProperties, 'resourceType');
        var index = resourceTypes.indexOf(foiURI);
        if(index != -1){
            return validProperties[index].properties;
        }else{
            errors.error = "Not a valid FoI-type";
            errors.statusCode = 400;
            throw errors;
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
        if(propertyValid){
            return property;
        }else{
            errors.error = "Not a valid property-type";
            errors.statusCode = 400;
            throw errors;
        }
    }

    getPropertyRestrictions(property,validProperties){
        return _.chain(validProperties)
                .filter(obj => {
                    return obj.uri == property;
                })
                .first()
                .value();
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
}