import { NextFunction, Request, Response, Router } from "express";

//Routes
import { BaseRoute } from "./route";

//Models
import { FoIModel } from "./../models/feature-of-interest";

/**
 * / route
 *
 * @class HeatConsumer
 */
export class FoIRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class FoIRoute
   * @method create
   * @static
   */
  public static create(router: Router) {    
    //log
    console.log("[FoIRoute::create] Creating Feature of Interest route.");

    //add Get Features of Interest route
    router.get("/:db/:foi", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().getFoIs(req, res, next);
    });
    //add Post Feature of Interest route
    router.post("/:db/:foi", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().postFoI(req, res, next);
    });
    //add Delete Feature of Interest route
    router.delete("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().deleteFoI(req, res, next);
    });
    //add Put Feature of Interest route
    router.put("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().putFoI(req, res, next);
    });
    //add Show Deleted Features of Interest of type route
    router.get("/:db/:foi/deleted", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().showDeleted(req, res, next);
    });
    //add Get Feature of Interest Properties route
    router.get("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().getFoIProps(req, res, next);
    });
    //add Post Feature of Interest Property route (add properties)
    router.post("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().postFoIProp(req, res, next);
    });
  }

  /**
   * Constructor
   *
   * @class FoIRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * The Feature of Interest route.
   *
   * @class FoIRoute
   * @method getFoIs
   * @method postFoI
   * @method deleteFoI
   * @method putFoI
   * @method showDeleted
   * @method getFoIProps
   * @method postFoIProp
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public getFoIs(req: Request, res: Response, next: NextFunction) {
    console.time("getFoIs");
    let fm = new FoIModel();
    fm.getFoIs(req)
      .then(data =>  {
        console.timeEnd("getFoIs");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public postFoI(req: Request, res: Response, next: NextFunction) {
    console.time("postFoI");
    let fm = new FoIModel();
    fm.postFoI(req)
      .then(data =>  {
        console.timeEnd("postFoI");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public deleteFoI(req: Request, res: Response, next: NextFunction) {
    console.time("deleteFoI");
    let fm = new FoIModel();
    fm.deleteFoI(req)
      .then(data =>  {
        console.timeEnd("deleteFoI");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public putFoI(req: Request, res: Response, next: NextFunction) {
    console.time("putFoI");
    let fm = new FoIModel();
    fm.putFoI(req)
      .then(data =>  {
        console.timeEnd("putFoI");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public showDeleted(req: Request, res: Response, next: NextFunction) {
    console.time("showDeleted");
    let fm = new FoIModel();
    fm.getFoIs(req, 'deleted')
      .then(data =>  {
        console.timeEnd("showDeleted");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public getFoIProps(req: Request, res: Response, next: NextFunction) {
    console.time("getFoIProps");
    let fm = new FoIModel();
    fm.getFoIProps(req)
      .then(data =>  {
        console.timeEnd("getFoIProps");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public postFoIProp(req: Request, res: Response, next: NextFunction) {
    console.time("postFoIProp");
    let fm = new FoIModel();
    fm.postFoIProp(req)
      .then(data =>  {
        console.timeEnd("postFoIProp");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
}