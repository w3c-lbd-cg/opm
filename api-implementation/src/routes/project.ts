import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";

//Models
import { ProjectModel } from "./../models/project";

/**
 * / route
 *
 * @class Project
 */
export class ProjectRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class ProjectRoute
   * @method create
   * @static
   */
  public static create(router: Router) {
    //log
    console.log("[ProjectRoute::create] Creating Project route.");

    //List projects
    router.get("/projects", (req: Request, res: Response, next: NextFunction) => {
      new ProjectRoute().listProjects(req, res, next);
    });
    //Get project details
    router.get("/projects/:db", (req: Request, res: Response, next: NextFunction) => {
      new ProjectRoute().getProjectDetails(req, res, next);
    });
    //Delete a project
    router.delete("/projects/:db", (req: Request, res: Response, next: NextFunction) => {
      new ProjectRoute().deleteProject(req, res, next);
    });
    //Create project
    router.post("/project", (req: Request, res: Response, next: NextFunction) => {
      new ProjectRoute().createProject(req, res, next);
    });
  }

  /**
   * Constructor
   *
   * @class ProjectRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * The project route.
   *
   * @class ProjectRoute
   * @method listProjects
   * @method getProjectDetails
   * @method deleteProject
   * @method createProject
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public listProjects(req: Request, res: Response, next: NextFunction) {
    console.time("listProjects");
    let pm = new ProjectModel()
    pm.listProjects(req)
      .then(function (data) {
        console.timeEnd("listProjects");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public getProjectDetails(req: Request, res: Response, next: NextFunction) {
    console.time("getProjectDetails");
    let pm = new ProjectModel()
    pm.getProjectDetails(req)
      .then(function (data) {
        console.timeEnd("getProjectDetails");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public deleteProject(req: Request, res: Response, next: NextFunction) {
    console.time("deleteProject");
    let pm = new ProjectModel()
    pm.deleteProject(req)
      .then(function (data) {
        console.timeEnd("deleteProject");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public createProject(req: Request, res: Response, next: NextFunction) {
    console.time("createProject");
    let pm = new ProjectModel()
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