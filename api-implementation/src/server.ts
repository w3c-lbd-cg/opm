import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import * as cors from "cors";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");

//Config
import { AppConfig } from './config/app';
import { DbConfig } from './config/database';
import { CorsConfig } from './config/cors';

//Routes
import { AdminRoute } from "./routes/admin";
import { PropertyRoute } from "./routes/property";
import { FoIRoute } from "./routes/feature-of-interest";
import { CalculationRoute } from "./routes/calculation";

/**
 * The server.
 *
 * @class Server
 */
export class Server {

  public app: express.Application;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
    //create expressjs application
    this.app = express();

    //configure application
    this.config();

    //add routes
    this.routes();

    //add api
    this.api();
  }

  /**
   * Create REST API routes
   *
   * @class Server
   * @method api
   */
  public api() {
    //empty for now
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  public config() {
    //add static paths
    //this.app.use(express.static(path.join(__dirname, "public")));
    this.app.use("/public", express.static(path.join(__dirname, "public")));

    //configure pug
    this.app.set("views", path.join(__dirname, "views"));
    this.app.set("view engine", "pug");

    //mount logger
    this.app.use(logger("dev"));

    //mount json form parser
    this.app.use(bodyParser.json());

    //mount query string parser
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));

    //mount cookie parker
    var secret = AppConfig.secret
    this.app.use(cookieParser(secret));

    //mount override?
    this.app.use(methodOverride());

    // catch 404 and forward to error handler
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
        res.status(404).send('Not found')
    });

    //error handling
    //this.app.use(errorHandler());
  }

  /**
   * Create and return Router.
   *
   * @class Server
   * @method config
   * @return void
   */
  private routes() {
    let router: express.Router;
    router = express.Router();

    //options for cors midddleware
    const options:cors.CorsOptions = {
      allowedHeaders: CorsConfig.headers,
      credentials: CorsConfig.credentials,
      methods: CorsConfig.methods,
      origin: CorsConfig.url,
      preflightContinue: CorsConfig.preflightContinue
    };

    //use cors middleware
    router.use(cors(options));
    
    //AdminRoute
    AdminRoute.create(router);

    //Property Route
    PropertyRoute.create(router);

    //Calculation Route
    CalculationRoute.create(router);

    //Feature of Interest Route
    FoIRoute.create(router);

    //use router middleware
    this.app.use(router);

    //Handle errors
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
        if(!err.status){
          err.status = 404;
        }
        if(!err.error){
          err.error = 'Something broke!';
        }
        //next(err);
        res.status(err.status).send(err.error);
    });

    //enable pre-flight
    router.options("*", cors(options));
  }

}