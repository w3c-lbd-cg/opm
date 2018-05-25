"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opm_query_generator_1 = require("opm-query-generator");
const rp = require("request-promise");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const multer = require("multer");
const _ = require("lodash");
const fs = require("fs");
const bb = require("bluebird");
const _N3 = require("n3");
const moment = require("moment");
const uuid = require('uuid/v4');
const fsP = bb.promisifyAll(fs);
const N3 = bb.promisifyAll(_N3);
const model_1 = require("./model");
const database_1 = require("./../config/database");
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
const host = app_1.AppConfig.host;
var upload = multer({
    dest: 'uploads/',
}).single('model');
function fileFilter(req, file, cb) {
    console.log(JSON.stringify(file));
    var patt = /\.[0-9a-z]+$/i;
    var extension = String(file.originalname.match(patt));
    var okExt = ['.ttl', '.n3', '.owl'];
    var okMT = ['application/octet-stream', 'skp'];
    if (okMT.indexOf(file.mimetype.toLowerCase()) != -1) {
        return cb(new Error('Invalid file format'), false);
    }
    else if (okExt.indexOf(extension.toLowerCase()) != -1) {
        return cb(new Error('Invalid file extension'), false);
    }
    cb(null, true);
}
;
class BOTModel extends model_1.BaseModel {
    constructor() {
        super(...arguments);
        this.restrictions = ['deleted', 'assumption', 'derived', 'confirmed', 'outdated'];
        this.reliabilities = ['assumption', 'confirmed'];
    }
    uploadToBOT(req, res, next) {
        const db = req.params.db;
        var objectName = '';
        var path = '';
        upload(req, res, (err) => {
            if (err) {
                console.log(err);
                return this.errorHandler("Error: File upload failed", 422);
            }
            path = 'uploads/' + req.file.filename;
            objectName = req.file.originalname.replace(' ', '_');
            console.log(objectName);
            return new Promise((resolve, reject) => resolve(path))
                .then(path => {
                const cmd = `stardog data add ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/${db} ${path} --format TURTLE --named-graph tag:/${objectName} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
                console.log(cmd);
                return this.executeCmd(cmd);
            })
                .then(d => {
                console.log(d);
                fs.unlink(path, (err) => {
                    if (err) {
                        console.log(err);
                        this.errorHandler(err, 500);
                    }
                });
                res.send(path);
            })
                .catch(err => {
                fs.unlink(path, (err) => {
                    if (err) {
                        console.log(err);
                        this.errorHandler(err, 500);
                    }
                });
                next(err);
            });
        });
    }
    uploadProperties(req, res, next) {
        const db = req.params.db;
        var objectName = '';
        var newTriples = {};
        upload(req, res, (err) => {
            if (err) {
                console.log(err);
                return this.errorHandler("Error: File upload failed", 422);
            }
            var path = 'uploads/' + req.file.filename;
            objectName = req.file.originalname.replace(' ', '_');
            var newProperties = this.parseTurtle(path);
            var existingProperties = this.getExisting(db);
            Promise.all([newProperties, existingProperties])
                .then(d => {
                newTriples = this.matchProps(d[0], d[1]);
                var graphURI = 'tag:/Revit_testprojekt.rvt.ttl';
                if (d[1].length > 0 && d[1][0].graph) {
                    graphURI = d[1][0].graph;
                }
                if (newTriples && newTriples.triples) {
                    var errorMsg = "Could not write property update to triplestore";
                    return this.writeTriples(newTriples.triples, graphURI, db, errorMsg);
                }
                else {
                    return;
                }
            })
                .then(d => {
                fs.unlink(path, err => {
                    if (err) {
                        console.log(err);
                        this.errorHandler(err, 500);
                    }
                    else {
                        console.log("Successfully detached file");
                    }
                });
                var message = this.createBatchUploadResultMessage(newTriples);
                console.log(message);
                res.send(JSON.stringify({ message: message }));
            })
                .catch(err => {
                fs.unlink(path, (err) => {
                    if (err) {
                        console.log(err);
                        this.errorHandler(err, 500);
                    }
                    else {
                        console.log("Successfully detached file");
                    }
                });
                next(err);
            });
        });
    }
    matchProps(newProps, existProps) {
        var newPropArr = [];
        var updatePropArr = [];
        var valMatchArr = [];
        _.map(newProps, valN => {
            var match = _.map(existProps, valE => {
                if (valN.subject == valE.subject && valN.predicate == valE.predicate) {
                    if (valN.object == valE.object) {
                        valMatchArr.push({ foiURI: valN.subject, property: valN.predicate, value: valN.object });
                    }
                    else {
                        updatePropArr.push({ propURI: valE.propertyURI, value: valN.object });
                    }
                    return true;
                }
                return;
            });
            if (match.indexOf(true) == -1) {
                newPropArr.push({ foiURI: valN.subject, property: valN.predicate, value: valN.object });
            }
        });
        var triples = '';
        if (newPropArr.length > 0) {
            triples += '#NEW PROPS\n' + this.createOPMProps(newPropArr);
        }
        if (updatePropArr.length > 0) {
            triples += '#UPDATED PROPS\n' + this.createOPMProps(updatePropArr);
        }
        return { triples: triples, created: newPropArr.length, updated: updatePropArr.length, skipped: valMatchArr.length, total: newProps.length };
    }
    parseTurtle(data) {
        var triples = [];
        var parser = _N3.Parser(), rdfStream = fs.createReadStream(data);
        return new Promise((resolve, reject) => {
            parser.parse(rdfStream, (err, triple, prefixes) => {
                if (err) {
                    reject(err);
                }
                if (triple) {
                    triples.push(triple);
                }
                if (prefixes) {
                    var arr = _.chain(triples)
                        .sortBy('subject')
                        .value();
                    resolve(arr);
                }
            });
        });
    }
    getExisting(db) {
        var input = { latest: true, queryType: 'select' };
        let sp = new opm_query_generator_1.OPMProp();
        const q = sp.getProps(input);
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: 'application/json' });
        return rp(dbConn.options)
            .then(data => {
            if (!data || !data.results.bindings) {
                return null;
            }
            var arr = _.chain(data.results.bindings)
                .map(obj => {
                var val = `"${obj.value.value}"^^${obj.value.datatype}`;
                return { subject: obj.foi.value, predicate: obj.property.value, object: val, graph: obj.graphURI.value, propertyURI: obj.propertyURI.value };
            })
                .sortBy('subject')
                .value();
            return arr;
        });
    }
    createOPMProps(data) {
        var now = moment().format();
        var triples = '';
        _.map(data, x => {
            var propertyURI = x.propURI ? x.propURI : this.generateURI(x.foiURI, 'Property');
            var value = this.cleanLiteral(x.value);
            var stateURI = this.generateURI(propertyURI, 'State');
            if (x.foiURI) {
                var foiURI = x.foiURI;
                var property = x.property;
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
    generateURI(someURI, type) {
        var guid = uuid();
        var s = someURI.split('/');
        return s[0] + '//' + s[2] + '/' + s[3] + '/' + type + '/' + guid;
    }
    cleanLiteral(val) {
        var i = val.indexOf('^^');
        if (i != -1) {
            val = val.substr(0, i + 2) + '<' + val.substr(i + 2) + '>';
        }
        return val;
    }
    createBatchUploadResultMessage(newTriples) {
        const created = newTriples.created;
        const updated = newTriples.updated;
        const total = newTriples.total;
        var string = `Recieved ${total} properties. `;
        if (created == 1) {
            string += `Generated ${created} new property. `;
        }
        if (created > 1) {
            string += `Generated ${created} new properties. `;
        }
        if (updated == 1) {
            string += `Updated ${updated} existing property with a new state. `;
        }
        if (updated > 1) {
            string += `Updated ${updated} existing properties with new states. `;
        }
        return string;
    }
}
exports.BOTModel = BOTModel;
