"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise");
const stardog_connection_1 = require("./../helpers/stardog-connection");
const exec = require('child_process').exec;
var errors = require('request-promise/errors');
const _ = require("underscore");
const model_1 = require("./model");
const general_1 = require("./../queries/general");
const database_1 = require("./../config/database");
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
var defaultNamespaces = require('./../../public/lists/default-namespaces.json');
class ProjectModel extends model_1.BaseModel {
    listProjects(req) {
        console.log(req.headers.host);
        let dbConn = new stardog_connection_1.StardogConn();
        dbConn.getDatabases();
        return rp(dbConn.options);
    }
    createProject(req) {
        const number = req.body.projectNumber;
        const name = req.body.projectName;
        const description = req.body.projectDescription;
        const db = 'P' + number;
        const host = req.headers.host;
        const project_uri = `${protocol}://${host}/${db}`;
        if (!number) {
            errors.error = "Please specify a project number";
            errors.statusCode = 400;
            throw errors;
        }
        if (!name) {
            errors.error = "Please specify a project name";
            errors.statusCode = 400;
            throw errors;
        }
        const cmd = `stardog-admin --server ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port} db create -n ${db} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
        return this.executeCmd(cmd)
            .then(res => {
            var arr = _.map(defaultNamespaces, item => '"' + item.prefix + '=' + item.uri + '"');
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.addNamespaces(arr.toString());
            dbConn.options;
            return rp(dbConn.options);
        })
            .then(res => {
            let gq = new general_1.GeneralQueries;
            var q = gq.addProjectData(project_uri, name, description);
            console.log(q);
            let dbConn = new stardog_connection_1.StardogConn(db);
            dbConn.updateQuery({ query: q });
            return rp(dbConn.options);
        });
    }
    deleteProject(req) {
        const dbname = req.params.name;
        const cmd = `stardog-admin --server ${database_1.DbConfig.stardog.host}:${database_1.DbConfig.stardog.port} db drop ${dbname} -u ${database_1.DbConfig.stardog.username} -p ${database_1.DbConfig.stardog.password}`;
        console.log(cmd);
        return this.executeCmd(cmd);
    }
    getProjectDetails(req) {
        const db = req.params.db;
        var accept = req.headers.accept != '*/*' ? req.headers.accept : 'application/ld+json';
        let gq = new general_1.GeneralQueries;
        var q = gq.getProjectData();
        let dbConn = new stardog_connection_1.StardogConn(db);
        dbConn.getQuery({ query: q, accept: accept });
        return rp(dbConn.options)
            .then(res => {
            if (accept != 'application/ld+json')
                return res;
            return this.compactJSONLD(res);
        });
    }
}
exports.ProjectModel = ProjectModel;
