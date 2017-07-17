import { NextFunction, Request, Response } from "express";

/**
 * Constructor
 *
 * @class BaseRoute
 */
export class BaseRoute {

  private scripts: string[];

  private jsonData: Object;


  /**
   * Constructor
   *
   * @class BaseRoute
   * @constructor
   */
  constructor() {
    //initialize variables
    this.scripts = [];
  }

  /**
   * Add a JS external file to the request.
   *
   * @class BaseRoute
   * @method addScript
   * @param src {string} The src to the external JS file.
   * @return {BaseRoute} Self for chaining
   */
  public addScript(src: string): BaseRoute {
    this.scripts.push(src);
    return this;
  }

  /**
   * Render a page.
   *
   * @class BaseRoute
   * @method render
   * @param req {Request} The request object.
   * @param res {Response} The response object.
   * @param data {String} The data to return.
   * @param options {Object} Additional options to append to the view's local scope.
   * @return void
   */
  public render(req: Request, res: Response, data?: Object) {
    //set headers
    res.setHeader('Content-Type', 'text/html')

    //add scripts
    res.locals.scripts = this.scripts;

    data ? this.jsonData = data : this.jsonData = "Success"

    //send json
    res.send(this.jsonData);
  }
}