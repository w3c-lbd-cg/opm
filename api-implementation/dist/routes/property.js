"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const property_1 = require("./../models/property");
class PropertyRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[PropertyRoute::create] Creating Property route.");
        router.get("/:db/Property/:guid", (req, res, next) => {
            new PropertyRoute().getProperty(req, res, next);
        });
        router.get("/:db/Property/:guid/subscribers", (req, res, next) => {
            new PropertyRoute().listSubscribers(req, res, next);
        });
        router.put("/:db/Property/:guid", (req, res, next) => {
            new PropertyRoute().updateProperty(req, res, next);
        });
        router.delete("/:db/Property/:guid", (req, res, next) => {
            new PropertyRoute().deleteProperty(req, res, next);
        });
        router.get("/:db/Properties", (req, res, next) => {
            new PropertyRoute().listProperties(req, res, next);
        });
    }
    constructor() {
        super();
    }
    getProperty(req, res, next) {
        console.time("getProperty");
        let pm = new property_1.PropertyModel();
        pm.getProperty(req)
            .then(data => {
            console.timeEnd("getProperty");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    listSubscribers(req, res, next) {
        console.time("listSubscribers");
        let pm = new property_1.PropertyModel();
        pm.listSubscribers(req)
            .then(data => {
            console.timeEnd("listSubscribers");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    updateProperty(req, res, next) {
        console.time("updateProperty");
        let pm = new property_1.PropertyModel();
        pm.updateProperty(req)
            .then(data => {
            console.timeEnd("updateProperty");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    deleteProperty(req, res, next) {
        console.time("deleteProperty");
        let pm = new property_1.PropertyModel();
        pm.deleteProperty(req)
            .then(data => {
            console.timeEnd("deleteProperty");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    listProperties(req, res, next) {
        console.time("listProperties");
        let pm = new property_1.PropertyModel();
        pm.listProperties(req)
            .then(data => {
            console.timeEnd("listProperties");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
}
exports.PropertyRoute = PropertyRoute;
