import { NextFunction, Request, Response, Router } from "express";

//Routes
import { BaseRoute } from "./route";

//Models
import { CalculationModel } from "./../models/calculation";

/**
 * / route
 *
 * @class Calculation
 */
export class CalculationRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class CalculationRoute
   * @method create
   * @static
   */
  public static create(router: Router) {    
    //log
    console.log("[CalculationRoute::create] Creating Calculation route.");

    //Post calculation
    router.post("/:db/Calculation", (req: Request, res: Response, next: NextFunction) => {
      new CalculationRoute().createCalculation(req, res, next);
    });

    //Check if a FoI is outdated
    router.get("/:db/:foi/:guid/outdated", (req: Request, res: Response, next: NextFunction) => {
      new CalculationRoute().getOutdatedOnResource(req, res, next);
    });
  }

  /**
   * Constructor
   *
   * @class CalculationRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
  * The Calculation route.
  *
  * @class CalculationRoute
  * @method createCalculation
  * @param req {Request} The express Request object.
  * @param res {Response} The express Response object.
  * @next {NextFunction} Execute the next method.
  */
  public createCalculation(req: Request, res: Response, next: NextFunction) {
    console.time("createCalculation");
    let cm = new CalculationModel();
    cm.createCalculation(req)
      .then(data =>  {
        console.timeEnd("createCalculation");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }

  public getOutdatedOnResource(req: Request, res: Response, next: NextFunction) {
    console.time("getOutdatedOnResource");
    let cm = new CalculationModel();
    cm.getOutdatedOnResource(req)
      .then(data =>  {
        console.timeEnd("getOutdatedOnResource");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
}