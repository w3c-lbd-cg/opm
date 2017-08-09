import { NextFunction, Request, Response, Router } from "express";

//Routes
import { BaseRoute } from "./route";

//Models
import { PropertyModel } from "./../models/property";

/**
 * / route
 *
 * @class Property
 */
export class PropertyRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class PropertyRoute
   * @method create
   * @static
   */
  public static create(router: Router) {    
    //log
    console.log("[PropertyRoute::create] Creating Property route.");

    //add Get property route
    router.get("/:db/Property/:guid", (req: Request, res: Response, next: NextFunction) => {
      new PropertyRoute().getProperty(req, res, next);
    });

    //add List property subscribers route
    router.get("/:db/Property/:guid/subscribers", (req: Request, res: Response, next: NextFunction) => {
      new PropertyRoute().listSubscribers(req, res, next);
    });

    //add Update property route
    router.put("/:db/Property/:guid", (req: Request, res: Response, next: NextFunction) => {
      new PropertyRoute().updateProperty(req, res, next);
    });

    //add Delete property route
    router.delete("/:db/Property/:guid", (req: Request, res: Response, next: NextFunction) => {
      new PropertyRoute().deleteProperty(req, res, next);
    });

    //add List properties route
    router.get("/:db/Properties", (req: Request, res: Response, next: NextFunction) => {
      new PropertyRoute().listProperties(req, res, next);
    });

  }

  /**
   * Constructor
   *
   * @class PropertyRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
  * The property route.
  *
  * @class PropertyRoute
  * @method getProperty
  * @method listSubscribers
  * @method updateProperty
  * @method deleteProperty
  * @method listProperties
  * @param req {Request} The express Request object.
  * @param res {Response} The express Response object.
  * @next {NextFunction} Execute the next method.
  */
  public getProperty(req: Request, res: Response, next: NextFunction) {
    console.time("getProperty");
    let pm = new PropertyModel();
    pm.getProperty(req)
      .then(data =>  {
        console.timeEnd("getProperty");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public listSubscribers(req: Request, res: Response, next: NextFunction) {
    console.time("listSubscribers");
    let pm = new PropertyModel();
    pm.listSubscribers(req)
      .then(data =>  {
        console.timeEnd("listSubscribers");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public updateProperty(req: Request, res: Response, next: NextFunction) {
    console.time("updateProperty");
    let pm = new PropertyModel();
    pm.updateProperty(req)
      .then(data =>  {
        console.timeEnd("updateProperty");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public deleteProperty(req: Request, res: Response, next: NextFunction) {
    console.time("deleteProperty");
    let pm = new PropertyModel();
    pm.deleteProperty(req)
      .then(data =>  {
        console.timeEnd("deleteProperty");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public listProperties(req: Request, res: Response, next: NextFunction) {
    console.time("listProperties");
    let pm = new PropertyModel();
    pm.listProperties(req)
      .then(data =>  {
        console.timeEnd("listProperties");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
}