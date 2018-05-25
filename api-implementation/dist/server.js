"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const express = require("express");
const logger = require("morgan");
const path = require("path");
const cors = require("cors");
const methodOverride = require("method-override");
const app_1 = require("./config/app");
const cors_1 = require("./config/cors");
const admin_1 = require("./routes/admin");
const project_1 = require("./routes/project");
const property_1 = require("./routes/property");
const feature_of_interest_1 = require("./routes/feature-of-interest");
const calculation_1 = require("./routes/calculation");
const bot_1 = require("./routes/bot");
class Server {
    static bootstrap() {
        return new Server();
    }
    constructor() {
        this.app = express();
        this.config();
        this.routes();
        this.api();
    }
    api() {
    }
    config() {
        this.app.use("/public", express.static(path.join(__dirname, "public")));
        this.app.set("views", path.join(__dirname, "views"));
        this.app.set("view engine", "pug");
        this.app.use(logger("dev"));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        var secret = app_1.AppConfig.secret;
        this.app.use(cookieParser(secret));
        this.app.use(methodOverride());
        this.app.use(function (err, req, res, next) {
            res.status(404).send('Not found');
        });
    }
    routes() {
        let router;
        router = express.Router();
        const options = {
            allowedHeaders: cors_1.CorsConfig.headers,
            credentials: cors_1.CorsConfig.credentials,
            methods: cors_1.CorsConfig.methods,
            origin: cors_1.CorsConfig.url,
            preflightContinue: cors_1.CorsConfig.preflightContinue
        };
        router.use(cors(options));
        admin_1.AdminRoute.create(router);
        project_1.ProjectRoute.create(router);
        property_1.PropertyRoute.create(router);
        bot_1.BOTRoute.create(router);
        calculation_1.CalculationRoute.create(router);
        feature_of_interest_1.FoIRoute.create(router);
        this.app.use(router);
        this.app.use(function (err, req, res, next) {
            if (!err.status) {
                err.status = 404;
            }
            if (!err.error) {
                err.error = 'Something broke!';
            }
            res.status(err.status).send(err.error);
        });
        router.options("*", cors(options));
    }
}
exports.Server = Server;
