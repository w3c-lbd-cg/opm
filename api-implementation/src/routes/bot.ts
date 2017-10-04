import { NextFunction, Request, Response, Router } from "express";

//Routes
import { BaseRoute } from "./route";

//Models
import { BOTModel } from "./../models/bot";

/**
 * / route
 *
 * @class BOT
 */
export class BOTRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class BOTRoute
   * @method create
   * @static
   */
  public static create(router: Router) {    
    //log
    console.log("[BOTRoute::create] Creating BOT route.");

    //add Post file
    router.post("/:db/bot", (req: Request, res: Response, next: NextFunction) => {
      new BOTRoute().uploadToBOT(req, res, next);
    });
    //add Post properties file
    router.post("/:db/botProps", (req: Request, res: Response, next: NextFunction) => {
      new BOTRoute().testing(req, res, next);
    });

  }

  /**
   * Constructor
   *
   * @class BOTRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
  * The BOT route.
  *
  * @class BOTRoute
  * @method uploadToBOT
  * @method testing
  * @param req {Request} The express Request object.
  * @param res {Response} The express Response object.
  * @next {NextFunction} Execute the next method.
  */
  public uploadToBOT(req: Request, res: Response, next: NextFunction) {
    let bm = new BOTModel();
    bm.uploadToBOT(req, res, next);
  }
  public testing(req: Request, res: Response, next: NextFunction) {
    let bm = new BOTModel();
    bm.uploadProperties(req, res, next);
  }
}