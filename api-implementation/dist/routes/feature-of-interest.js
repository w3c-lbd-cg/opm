"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const feature_of_interest_1 = require("./../models/feature-of-interest");
class FoIRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[FoIRoute::create] Creating Feature of Interest route.");
        router.get("/:db/:foi", (req, res, next) => {
            new FoIRoute().getFoIs(req, res, next);
        });
        router.post("/:db/:foi", (req, res, next) => {
            new FoIRoute().postFoI(req, res, next);
        });
        router.delete("/:db/:foi/:guid", (req, res, next) => {
            new FoIRoute().deleteFoI(req, res, next);
        });
        router.put("/:db/:foi/:guid", (req, res, next) => {
            new FoIRoute().putFoI(req, res, next);
        });
        router.get("/:db/:foi/:guid", (req, res, next) => {
            new FoIRoute().getFoIProps(req, res, next);
        });
        router.post("/:db/:foi/:guid", (req, res, next) => {
            new FoIRoute().postFoIProp(req, res, next);
        });
    }
    constructor() {
        super();
    }
    getFoIs(req, res, next) {
        console.time("getFoIs");
        let fm = new feature_of_interest_1.FoIModel();
        fm.getFoIs(req)
            .then(data => {
            console.timeEnd("getFoIs");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    postFoI(req, res, next) {
        console.time("postFoI");
        let fm = new feature_of_interest_1.FoIModel();
        fm.postFoI(req)
            .then(data => {
            console.timeEnd("postFoI");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    deleteFoI(req, res, next) {
        console.time("deleteFoI");
        let fm = new feature_of_interest_1.FoIModel();
        fm.deleteFoI(req)
            .then(data => {
            console.timeEnd("deleteFoI");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    putFoI(req, res, next) {
        console.time("putFoI");
        let fm = new feature_of_interest_1.FoIModel();
        fm.putFoI(req)
            .then(data => {
            console.timeEnd("putFoI");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    getFoIProps(req, res, next) {
        console.time("getFoIProps");
        let fm = new feature_of_interest_1.FoIModel();
        fm.getFoIProps(req)
            .then(data => {
            console.timeEnd("getFoIProps");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    postFoIProp(req, res, next) {
        console.time("postFoIProp");
        let fm = new feature_of_interest_1.FoIModel();
        fm.postFoIProp(req)
            .then(data => {
            console.timeEnd("postFoIProp");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
}
exports.FoIRoute = FoIRoute;
