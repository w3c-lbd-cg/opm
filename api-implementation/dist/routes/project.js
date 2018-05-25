"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const project_1 = require("./../models/project");
class ProjectRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[ProjectRoute::create] Creating Project route.");
        router.get("/projects", (req, res, next) => {
            new ProjectRoute().listProjects(req, res, next);
        });
        router.get("/projects/:db", (req, res, next) => {
            new ProjectRoute().getProjectDetails(req, res, next);
        });
        router.delete("/projects/:db", (req, res, next) => {
            new ProjectRoute().deleteProject(req, res, next);
        });
        router.post("/project", (req, res, next) => {
            new ProjectRoute().createProject(req, res, next);
        });
    }
    constructor() {
        super();
    }
    listProjects(req, res, next) {
        console.time("listProjects");
        let pm = new project_1.ProjectModel();
        pm.listProjects(req)
            .then(function (data) {
            console.timeEnd("listProjects");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    getProjectDetails(req, res, next) {
        console.time("getProjectDetails");
        let pm = new project_1.ProjectModel();
        pm.getProjectDetails(req)
            .then(function (data) {
            console.timeEnd("getProjectDetails");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    deleteProject(req, res, next) {
        console.time("deleteProject");
        let pm = new project_1.ProjectModel();
        pm.deleteProject(req)
            .then(function (data) {
            console.timeEnd("deleteProject");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    createProject(req, res, next) {
        console.time("createProject");
        let pm = new project_1.ProjectModel();
        pm.createProject(req)
            .then(function (data) {
            console.timeEnd("createProject");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
}
exports.ProjectRoute = ProjectRoute;
