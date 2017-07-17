import * as rp from "request-promise";
import { DbConfig } from '../config/database';

//Interfaces
import { IQueryString } from "./../interfaces/qs";

export class StardogConn implements rp.RequestPromiseOptions {
    
    options: rp.OptionsWithUri;
    db: string;
    
    constructor(public dbParam?: string){
        this.db = dbParam
        this.options = {
            uri: `${DbConfig.stardog.host}:${DbConfig.stardog.port}/`,
            auth: {
                username: DbConfig.stardog.username,
                password: DbConfig.stardog.password
            }
        }
    }

    updateQuery(qs: IQueryString){
        qs.query = qs.query.replace(/ +(?= )/g,''); //remove surplus spaces from query string
        qs.query = qs.query.replace(/\r?\n|\r/g, ''); //Remove line breaks from query string
        this.options.method = 'POST';
        this.options.uri += this.db+'/update';
        this.options.form = qs;
        this.options.headers = {
            'Accept': 'text/boolean'
        };
    }

    getQuery(qs: IQueryString){
        this.options.method = 'GET';
        this.options.uri += this.db+'/query';
        this.options.qs = qs;
        this.options.headers = {
            'Accept': 'application/sparql-results+json'
        };
        this.options.json = true; // Automatically parses the JSON string in the response
    }

    constructQuery(qs: IQueryString){
        this.options.method = 'GET';
        this.options.uri += this.db+'/query';
        this.options.qs = qs;
        this.options.headers = {
            'Accept': 'application/n-triples'
        };
        this.options.json = true; // Automatically parses the JSON string in the response
    }

    getDatabases(){
        this.options.method = 'GET';
        this.options.uri += 'admin/databases';
        this.options.json = true; // Automatically parses the JSON string in the response
    }
    
    addDatabase(body){
        this.options.method = 'POST';
        this.options.uri += 'admin/databases';
        this.options.headers = {
            'Accept': 'application/json',
            'Content-type': 'multipart/form-data'
        };
        this.options.form = body;
    }

    getNamespaces(){
        this.options.method = 'PUT';
        this.options.uri += 'admin/databases/'+this.db+'/options';
        this.options.headers = {
            'Content-type': 'application/json' 
        };
        this.options.body = '{"database.namespaces": ""}';
    }

    addNamespaces(arr){
        this.options.method = 'POST';
        this.options.uri += 'admin/databases/'+this.db+'/options';
        this.options.headers = {
            'Content-type': 'application/json' 
        };
        this.options.body = '{"database.namespaces": ['+arr+']}';
    }
}