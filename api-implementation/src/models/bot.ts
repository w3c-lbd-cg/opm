import { Request } from "express";
import { OPMProp } from "opm-query-generator";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
import * as jsonld from 'jsonld';
import * as multer from 'multer';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as bb from 'bluebird';
import * as _N3 from 'n3';
import * as moment from "moment";
const uuid = require('uuid/v4');
const fsP: any = bb.promisifyAll(fs);
const N3: any = bb.promisifyAll(_N3);

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

var upload = multer({
    dest: 'uploads/',
    // fileFilter: fileFilter
}).single('model');

//File type filter
function fileFilter(req, file, cb){
    console.log(JSON.stringify(file));
    var patt = /\.[0-9a-z]+$/i;
    var extension = String(file.originalname.match(patt));
    var okExt: string[] = ['.ttl', '.n3', '.owl'];
    var okMT: string[] = ['application/octet-stream', 'skp'];
    //Only allow binary files
    if(okMT.indexOf(file.mimetype.toLowerCase()) != -1){
        return cb(new Error('Invalid file format'), false);
    }else if(okExt.indexOf(extension.toLowerCase()) != -1){
        return cb(new Error('Invalid file extension'), false);
    }
    cb(null, true);
};

export class BOTModel extends BaseModel {

    private restrictions: string[] = ['deleted', 'assumption', 'derived', 'confirmed', 'outdated'];
    private reliabilities: string[] = ['assumption', 'confirmed'];

    //Upload file
    public uploadToBOT(req: Request, res, next){
        const db = req.params.db;
        var objectName = '';
        var path = '';
        upload(req, res, (err) => {
            if(err) {
                console.log(err);
                return this.errorHandler("Error: File upload failed",422);
            }
            //Store metadata
            path = 'uploads/'+req.file.filename;
            objectName = req.file.originalname.replace(' ', '_'); //No underscores allowed;
            console.log(objectName);
            return new Promise((resolve, reject) => resolve(path))
                    .then(path => {
                        //Write to named graph
                        const cmd: string = `stardog data add ${DbConfig.stardog.host}:${DbConfig.stardog.port}/${db} ${path} --format TURTLE --named-graph tag:/${objectName} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
                        console.log(cmd);
                        return this.executeCmd(cmd);
                    })
                    .then(d => {
                        console.log(d);
                        //Delete file
                        fs.unlink(path, (err) => {
                            //Return error if any
                            if(err){
                                console.log(err);
                                this.errorHandler(err,500)
                            }
                        })
                        res.send(path);
                    })
                    .catch(err => {
                        //Delete file
                        fs.unlink(path, (err) => {
                            //Return error if any
                            if(err){
                                console.log(err);
                                this.errorHandler(err,500)
                            }
                        });
                        next(err);
                    });
        });
    }

    public uploadProperties(req: Request, res, next){
        const db = req.params.db;
        var objectName = '';
        var newTriples: any = {}     // object to hold the new triples and data about them

        upload(req, res, (err) => {
            if(err) {
                console.log(err);
                return this.errorHandler("Error: File upload failed",422);
            }
            //Store metadata
            var path = 'uploads/'+req.file.filename;
            objectName = req.file.originalname.replace(' ', '_'); //No underscores allowed;
            
            //Get new properties
            var newProperties = this.parseTurtle(path);     // Get a sorted array of FoIs and the (key, val) pairs for new properties
            var existingProperties = this.getExisting(db);  // Get a sorted array of FoIs and the (key, val) pairs for existing properties

            //When parallel processes have finished, continue
            Promise.all([newProperties, existingProperties])
                .then(d => {
                    newTriples = this.matchProps(d[0], d[1]);

                    var graphURI = 'tag:/Revit_testprojekt.rvt.ttl'; // GET THIS FROM CLIENT!
                    if(d[1].length > 0 && d[1][0].graph){
                        graphURI = d[1][0].graph; // NB! possibly voulnarable
                    }
                    //Write new triples to datastore
                    if(newTriples && newTriples.triples){
                        var errorMsg = "Could not write property update to triplestore";
                        return this.writeTriples(newTriples.triples, graphURI, db, errorMsg);
                    }else{
                        return
                    }
                })
                .then(d => {
                    //Delete file
                    fs.unlink(path, err => {
                        //Return error if any
                        if(err){
                            console.log(err);
                            this.errorHandler(err,500)
                        }else{
                            console.log("Successfully detached file");
                        }
                    })
                    var message = this.createBatchUploadResultMessage(newTriples);
                    console.log(message);
                    res.send(JSON.stringify({message: message}));
                })
                .catch(err => {
                    //Delete file
                    fs.unlink(path, (err) => {
                        //Return error if any
                        if(err){
                            console.log(err);
                            this.errorHandler(err,500)
                        }else{
                            console.log("Successfully detached file");
                        }
                    });
                    next(err);
                });
        });
    }

    private matchProps(newProps, existProps){
        var newPropArr = []     // property does not exist on the FoI
        var updatePropArr = []  // property exists but value has changed
        var valMatchArr = []    // property exists and value is the same

        _.map(newProps, valN => {
            // Check if the property exists
            var match = _.map(existProps, valE => {
                // If FoI already has the current property
                if(valN.subject == valE.subject && valN.predicate == valE.predicate){
                    // Check if the value has changed
                    if(valN.object == valE.object){
                        valMatchArr.push({foiURI: valN.subject, property: valN.predicate, value: valN.object});
                    }
                    // If it has changed, it should be updated
                    else{
                        updatePropArr.push({propURI: valE.propertyURI, value: valN.object});
                    }
                    return true;
                }
                return
            })
            // FoI doesn't have the property assigned yet
            if(match.indexOf(true) == -1){
                newPropArr.push({foiURI: valN.subject, property: valN.predicate, value: valN.object})
            }
        })
        // Construct and return triples
        var triples = '';
        if(newPropArr.length > 0){
            triples += '#NEW PROPS\n'+this.createOPMProps(newPropArr);
        }
        if(updatePropArr.length > 0){
            triples += '#UPDATED PROPS\n'+this.createOPMProps(updatePropArr);
        }
        return {triples: triples, created: newPropArr.length, updated: updatePropArr.length, skipped: valMatchArr.length, total: newProps.length};
    }

    private parseTurtle(data) {
        var triples: object[] = [];
        var parser = _N3.Parser(),
        rdfStream = fs.createReadStream(data);

        return new Promise((resolve, reject) => {
            parser.parse(rdfStream, (err, triple, prefixes) => {
                if(err){
                    reject(err);
                }
                if(triple){
                    // Add to newProperties
                    triples.push(triple);
                }
                // When prefixes are returned, there are no more triples
                if(prefixes){
                    // group by FoI and return
                    var arr = _.chain(triples)
                    .sortBy('subject')
                    .value();
                    resolve(arr);
                }
            });
        })
    }

    private getExisting(db){
        // Get all FoIs in the project, their properties and their latest states
        var input: GetProp = { latest: true, queryType: 'select' };
        let sp = new OPMProp();
        const q = sp.getProps(input);
        //console.log("Querying database to get property data:\n"+q);
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: 'application/json'});
        return rp(dbConn.options)
            .then(data => {
                if(!data || !data.results.bindings){
                    return null;
                }
                var arr = _.chain(data.results.bindings)
                    .map(obj => {
                        var val = `"${obj.value.value}"^^${obj.value.datatype}`;
                        return {subject: obj.foi.value, predicate: obj.property.value, object: val, graph: obj.graphURI.value, propertyURI: obj.propertyURI.value}
                    })
                    .sortBy('subject')
                    .value();
                return arr;
            })
    }

    private createOPMProps(data): string{
        var now = moment().format();
        var triples = '';
        _.map(data, x => {
            // Generate property URI if not given (which it is if the property exists already)
            var propertyURI = x.propURI ? x.propURI : this.generateURI(x.foiURI,'Property');
            var value = this.cleanLiteral(x.value);

            // Generate state URI
            var stateURI = this.generateURI(propertyURI,'State');
            
            // Only for new triples
            if(x.foiURI){
                // Get data for creation of a new property
                var foiURI = x.foiURI;
                var property = x.property;
                // Add triples
                triples += `<${foiURI}> <${property}> <${propertyURI}> .\n`;
            }
            triples += `<${propertyURI}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://w3id.org/opm#Property> .\n`;
            triples += `<${propertyURI}> <http://www.w3.org/2000/01/rdf-schema#label> "Revit Property"@en .\n`;
            triples += `<${propertyURI}> <https://w3id.org/opm#hasState> <${stateURI}> .\n`;
            triples += `<${stateURI}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://w3id.org/opm#State> .\n`;
            triples += `<${stateURI}> <http://www.w3.org/2000/01/rdf-schema#label> "Revit Generated State"@en .\n`;
            triples += `<${stateURI}> <https://w3id.org/opm#valueAtState> ${value} .\n`;
            triples += `<${stateURI}> <http://www.w3.org/ns/prov#generatedAtTime> "${now}"^^<http://www.w3.org/2001/XMLSchema#xsd:dateTime> .\n`;
        });
        return triples;
    }

    private generateURI(someURI: string, type: string){
        var guid = uuid();
        var s = someURI.split('/');
        return s[0]+'//'+s[2]+'/'+s[3]+'/'+type+'/'+guid;
    }

    // Fix datatype URIs (must be encapsulated in <>)
    private cleanLiteral(val){
        var i = val.indexOf('^^');
        if(i != -1){
            val = val.substr(0, i+2)+'<'+val.substr(i+2)+'>';
        }
        return val;
    }

    private createBatchUploadResultMessage(newTriples): string{
        const created = newTriples.created;
        const updated = newTriples.updated;
        const total = newTriples.total;
        var string = `Recieved ${total} properties. `;
        if(created == 1){
            string += `Generated ${created} new property. `;
        }
        if(created > 1){
            string += `Generated ${created} new properties. `;
        }
        if(updated == 1){
            string += `Updated ${updated} existing property with a new state. `;
        }
        if(updated > 1){
            string += `Updated ${updated} existing properties with new states. `;
        }
        return string;
    }

}