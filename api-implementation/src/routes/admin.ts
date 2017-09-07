import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";

//Models
import { BaseModel } from "./../models/model";
import { AdminModel } from "./../models/admin";

/**
 * / route
 *
 * @class Admin
 */
export class AdminRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class AdminRoute
   * @method create
   * @static
   */
  public static create(router: Router) {
    //log
    console.log("[AdminRoute::create] Creating admin route.");
    
    //Wipe db
    router.delete("/:db/admin/wipe", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().wipeDB(req, res, next);
    });
    //add attach external ontology route
    router.post("/:db/admin/externalOntology", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().attachOntology(req, res, next);
    });
    //add attach (reload) external ontology route
    router.put("/:db/admin/externalOntology/:name", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().reloadOntology(req, res, next);
    });
    //delete external ontology route
    router.delete("/:db/admin/externalOntology/:name", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().detachOntology(req, res, next);
    });
    //get a list of external ontologies
    router.get("/:db/admin/externalOntologies", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().listOntologies(req, res, next);
    });
    //add namespace route
    router.post("/:db/admin/namespace", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().addNamespace(req, res, next);
    });
    //update namespace route
    router.put("/:db/admin/namespace", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().updateNamespace(req, res, next);
    });
    //add remove namespace route
    router.delete("/:db/admin/namespace/:prefix", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().removeNamespace(req, res, next);
    });
    //list namespaces route
    router.get("/:db/admin/namespaces", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().getNamespaces(req, res, next);
    });
    //List rules
    router.get("/:db/admin/rules", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().listRules(req, res, next);
    });
    //Add rule
    router.post("/:db/admin/rule", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().addRule(req, res, next);
    });
    //Delete rule
    router.delete("/:db/admin/rule", (req: Request, res: Response, next: NextFunction) => {
      new AdminRoute().deleteRule(req, res, next);
    });
  }

  /**
   * Constructor
   *
   * @class AdminRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * The admin route.
   *
   * @class AdminRoute
   * @method wipeDB
   * @method attachOntology
   * @method reloadOntology
   * @method detachOntology
   * @method listOntologies
   * @method addNamespace
   * @method updateNamespace
   * @method removeNamespace
   * @method getNamespaces
   * @method listRules
   * @method addRule
   * @method deleteRule
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public wipeDB(req: Request, res: Response, next: NextFunction) {
    console.time("wipeDB");
    let am = new AdminModel()
    am.wipeDB(req)
      .then(function (data) {
        console.timeEnd("wipeDB");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public attachOntology(req: Request, res: Response, next: NextFunction) {
    console.time("attachOntology");
    let am = new AdminModel()
    am.attachOntology(req)
      .then(function (data) {
        console.timeEnd("attachOntology");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public reloadOntology(req: Request, res: Response, next: NextFunction) {
    console.time("reloadOntology");
    let am = new AdminModel()
    am.reloadOntology(req)
      .then(function (data) {
        console.timeEnd("reloadOntology");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public detachOntology(req: Request, res: Response, next: NextFunction) {
    console.time("detachOntology");
    let am = new AdminModel()
    am.detachOntology(req)
      .then(function (data) {
        console.timeEnd("detachOntology");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public listOntologies(req: Request, res: Response, next: NextFunction) {
    console.time("listOntologies");
    let am = new AdminModel()
    am.listOntologies(req)
      .then(function (data) {
        console.timeEnd("listOntologies");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public addNamespace(req: Request, res: Response, next: NextFunction) {
    console.time("addNamespace");
    let am = new AdminModel()
    am.addNamespace(req)
      .then(function (data) {
        console.timeEnd("addNamespace");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public updateNamespace(req: Request, res: Response, next: NextFunction) {
    console.time("updateNamespace");
    let am = new AdminModel()
    am.updateNamespace(req)
      .then(function (data) {
        console.timeEnd("updateNamespace");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public removeNamespace(req: Request, res: Response, next: NextFunction) {
    console.time("removeNamespace");
    let am = new AdminModel()
    am.removeNamespace(req)
      .then(function (data) {
        console.timeEnd("removeNamespace");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public getNamespaces(req: Request, res: Response, next: NextFunction) {
    console.time("getNamespaces");
    let am = new AdminModel()
    am.getNamespaces(req)
      .then(function (data) {
        console.timeEnd("getNamespaces");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public listRules(req: Request, res: Response, next: NextFunction) {
    console.time("listRules");
    let am = new AdminModel()
    am.listRules(req)
      .then(function (data) {
        console.timeEnd("listRules");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public addRule(req: Request, res: Response, next: NextFunction) {
    console.time("addRule");
    let am = new AdminModel()
    am.addRule(req)
      .then(function (data) {
        console.timeEnd("addRule");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
  public deleteRule(req: Request, res: Response, next: NextFunction) {
    console.time("deleteRule");
    let am = new AdminModel()
    am.deleteRule(req)
      .then(function (data) {
        console.timeEnd("deleteRule");
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  }
}