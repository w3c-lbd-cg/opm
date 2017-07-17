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
    
    //add Get Feature of Interest route
    router.get("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().getFeatureOfInterest(req, res, next);
    });
    //add Put Feature of Interest route (update properties)
    router.put("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().putFeatureOfInterest(req, res, next);
    });
    //add Post Feature of Interest route (add properties)
    router.post("/:db/:foi/:guid", (req: Request, res: Response, next: NextFunction) => {
      new FoIRoute().postFeatureOfInterest(req, res, next);
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
   * @method getFeatureOfInterest
   * @method putFeatureOfInterest
   * @method postFeatureOfInterest
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public getFeatureOfInterest(req: Request, res: Response, next: NextFunction) {
    console.time("getFeatureOfInterest");
    let fm = new FoIModel();
    fm.getFeatureOfInterest(req)
      .then(data =>  {
        console.timeEnd("getFeatureOfInterest");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public putFeatureOfInterest(req: Request, res: Response, next: NextFunction) {
    console.time("putFeatureOfInterest");
    let fm = new FoIModel();
    fm.putFeatureOfInterest(req)
      .then(data =>  {
        console.timeEnd("putFeatureOfInterest");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public postFeatureOfInterest(req: Request, res: Response, next: NextFunction) {
    console.time("postFeatureOfInterest");
    let fm = new FoIModel();
    fm.postFeatureOfInterest(req)
      .then(data =>  {
        console.timeEnd("postFeatureOfInterest");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
}