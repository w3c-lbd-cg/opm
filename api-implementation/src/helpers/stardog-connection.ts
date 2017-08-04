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
        this.options.method = 'POST';
        this.options.uri += this.db+'/update';
        this.options.form = qs;
        this.options.headers = {
            'Accept': 'text/boolean'
        };
    }

    getQuery(qs: IQueryString){
        var accept = qs.accept ? qs.accept : 'application/sparql-results+json';
        if(accept == 'application/json'){
            accept = 'application/sparql-results+json';
        }
        this.options.method = 'POST';
        this.options.uri += this.db+'/query';
        this.options.form = qs;
        this.options.headers = {
            'Accept': accept
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

    dropDatabase(db){
        this.options.method = 'DELETE';
        this.options.uri += 'admin/databases/'+db;
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