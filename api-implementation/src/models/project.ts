import { Request } from "express";
import * as rp from "request-promise";
import { StardogConn } from "./../helpers/stardog-connection";
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
import * as _ from "underscore";
import * as _s from "underscore.string";
import * as N3 from "n3";

//Models
import { BaseModel } from "./model";

//Helper functions
import { UriFunctions } from "./../helpers/uri-functions";
import { GeneralQueries } from "./../queries/general";

//Config
import { DbConfig } from './../config/database';
import { AppConfig } from './../config/app';
const protocol = AppConfig.protocol;

//Lists
var defaultNamespaces: NS[] = require('./../../public/lists/default-namespaces.json');

//Interfaces
import { ICalc } from "./../interfaces/calculation";
export interface NS {
    prefix: string;
    uri: string;
}

export class ProjectModel extends BaseModel {

    /**
     * PROJECTS
     * @method listProjects()    List databases (projects)
     * @method createProject()      Add database (project)
     * @method deleteProject()   Remove database (project)
     * @method getProjectDetails()  Get project details
     */

    //List projects
    listProjects(req: Request){
        console.log(req.headers.host);
        let dbConn = new StardogConn();
        dbConn.getDatabases();
        return rp(dbConn.options);
    }
    //Add project
    createProject(req: Request){
        const number: string = req.body.projectNumber;
        const name: string = req.body.projectName;
        const description: string = req.body.projectDescription;
        const db: string = 'P'+number;
        const host: string = req.headers.host;
        const project_uri = `${protocol}://${host}/${db}`;

        if(!number){
            errors.error = "Please specify a project number";
            errors.statusCode = 400;
            throw errors;
        }
        if(!name){
            errors.error = "Please specify a project name";
            errors.statusCode = 400;
            throw errors;
        }
        const cmd: string = `stardog-admin --server ${DbConfig.stardog.host}:${DbConfig.stardog.port} db create -n ${db} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
        return this.executeCmd(cmd)
            .then( res => {
                // Add namespaces
                var arr = _.map(defaultNamespaces, item => '"'+item.prefix+'='+item.uri+'"');
                let dbConn = new StardogConn(db);
                dbConn.addNamespaces(arr.toString());
                dbConn.options;
                return rp(dbConn.options);
            })
            .then( res => {
                // Add project information in main graph
                let gq = new GeneralQueries;
                var q = gq.addProjectData(project_uri, name, description);
                console.log(q);
                let dbConn = new StardogConn(db);
                dbConn.updateQuery({query:q});
                return rp(dbConn.options);
            });

        // CURRENTLY NOT WORKING
        // let dbConn = new StardogConn();
        // dbConn.addDatabase({dbname: dbname, options: {}});
        // console.log(dbConn.options);
        // return rp(dbConn.options);
    }
    //Delete project
    deleteProject(req: Request){
        const dbname: string = req.params.name;
        const cmd: string = `stardog-admin --server ${DbConfig.stardog.host}:${DbConfig.stardog.port} db drop ${dbname} -u ${DbConfig.stardog.username} -p ${DbConfig.stardog.password}`;
        console.log(cmd);
        return this.executeCmd(cmd);
    }

    //Get project details
    getProjectDetails(req: Request){
        const db: string = req.params.db;

        //Headers
        var accept: string = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json'; //Default accept: JSON-LD

        let gq = new GeneralQueries;
        var q = gq.getProjectData();
        let dbConn = new StardogConn(db);
        dbConn.getQuery({query: q, accept: accept});
        return rp(dbConn.options)
            .then(res => {
                if(accept != 'application/ld+json') return res;
                return this.compactJSONLD(res);
            })
    }
}