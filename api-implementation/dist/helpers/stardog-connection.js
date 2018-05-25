"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
class StardogConn {
    constructor(dbParam) {
        this.dbParam = dbParam;
        this.db = dbParam;
        this.options = {
            uri: `${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port}/`,
            auth: {
                username: database_1.DbConfig.stardog.username,
                password: database_1.DbConfig.stardog.password
            }
        };
    }
    updateQuery(qs) {
        this.options.method = 'POST';
        this.options.uri += this.db + '/update';
        this.options.form = qs;
        this.options.headers = {
            'Accept': 'text/boolean'
        };
    }
    getQuery(qs) {
        var accept = qs.accept ? qs.accept : 'application/sparql-results+json';
        if (accept == 'application/json') {
            accept = 'application/sparql-results+json';
        }
        this.options.method = 'POST';
        this.options.uri += this.db + '/query';
        this.options.form = qs;
        this.options.headers = {
            'Accept': accept
        };
        this.options.json = true;
    }
    getDatabases() {
        this.options.method = 'GET';
        this.options.uri += 'admin/databases';
        this.options.json = true;
    }
    addDatabase(body) {
        this.options.method = 'POST';
        this.options.uri += 'admin/databases';
        this.options.headers = {
            'Accept': 'application/json',
            'Content-type': 'multipart/form-data'
        };
        this.options.form = body;
    }
    dropDatabase(db) {
        this.options.method = 'DELETE';
        this.options.uri += 'admin/databases/' + db;
    }
    getNamespaces(db) {
        this.options.method = 'PUT';
        this.options.uri += 'admin/databases/' + db + '/options';
        this.options.headers = {
            'Content-type': 'application/json'
        };
        this.options.body = '{"database.namespaces": ""}';
    }
    addNamespaces(arr) {
        this.options.method = 'POST';
        this.options.uri += 'admin/databases/' + this.db + '/options';
        this.options.headers = {
            'Content-type': 'application/json'
        };
        this.options.body = '{"database.namespaces": [' + arr + ']}';
    }
}
exports.StardogConn = StardogConn;
