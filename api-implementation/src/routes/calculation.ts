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

    //Assign calculation to all new FoIs
    router.post("/:db/Calculation/:guid", (req: Request, res: Response, next: NextFunction) => {
      new CalculationRoute().reAssignCalculation(req, res, next);
    });

    //Re-run calculation for all FoIs where input has changed
    router.put("/:db/Calculation/:guid", (req: Request, res: Response, next: NextFunction) => {
      new CalculationRoute().reRunCalculation(req, res, next);
    });

    //add List calculations route
    router.get("/:db/Calculations", (req: Request, res: Response, next: NextFunction) => {
      new CalculationRoute().listCalculations(req, res, next);
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
  * @method listCalculations
  * @method createCalculation
  * @method reAssignCalculation
  * @method reRunCalculation
  * @param req {Request} The express Request object.
  * @param res {Response} The express Response object.
  * @next {NextFunction} Execute the next method.
  */
  public listCalculations(req: Request, res: Response, next: NextFunction) {
    console.time("listCalculations");
    let cm = new CalculationModel();
    cm.listCalculations(req)
      .then(data =>  {
        console.timeEnd("listCalculations");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
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
  public reAssignCalculation(req: Request, res: Response, next: NextFunction) {
    console.time("reAssignCalculation");
    let cm = new CalculationModel();
    cm.reAssignCalculation(req)
      .then(data =>  {
        console.timeEnd("reAssignCalculation");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
  public reRunCalculation(req: Request, res: Response, next: NextFunction) {
    console.time("reRunCalculation");
    let cm = new CalculationModel();
    cm.reRunCalculation(req)
      .then(data =>  {
        console.timeEnd("reRunCalculation");
        res.send(data);
      })
      .catch(err => {
        next(err);
      });
  }
}