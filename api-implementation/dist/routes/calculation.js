"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const calculation_1 = require("./../models/calculation");
class CalculationRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[CalculationRoute::create] Creating Calculation route.");
        router.post("/:db/Calculation", (req, res, next) => {
            new CalculationRoute().createCalculation(req, res, next);
        });
        router.post("/:db/Calculation/:guid", (req, res, next) => {
            new CalculationRoute().attachCalculation(req, res, next);
        });
        router.put("/:db/Calculation/:guid", (req, res, next) => {
            new CalculationRoute().reRunCalculation(req, res, next);
        });
        router.get("/:db/Calculations", (req, res, next) => {
            new CalculationRoute().listCalculations(req, res, next);
        });
        router.put("/:db/Calculations", (req, res, next) => {
            new CalculationRoute().putCalculations(req, res, next);
        });
        router.get("/:db/Calculation/:guid", (req, res, next) => {
            new CalculationRoute().getCalculation(req, res, next);
        });
    }
    constructor() {
        super();
    }
    listCalculations(req, res, next) {
        console.time("listCalculations");
        let cm = new calculation_1.CalculationModel();
        cm.listCalculations(req)
            .then(data => {
            console.timeEnd("listCalculations");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    putCalculations(req, res, next) {
        console.time("putCalculations");
        let cm = new calculation_1.CalculationModel();
        cm.putCalculations(req)
            .then(data => {
            console.timeEnd("putCalculations");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    getCalculation(req, res, next) {
        console.time("getCalculation");
        let cm = new calculation_1.CalculationModel();
        cm.getCalculation(req)
            .then(data => {
            console.timeEnd("getCalculation");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    createCalculation(req, res, next) {
        console.time("createCalculation");
        let cm = new calculation_1.CalculationModel();
        cm.createCalculation(req)
            .then(data => {
            console.timeEnd("createCalculation");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    attachCalculation(req, res, next) {
        console.time("attachCalculation");
        let cm = new calculation_1.CalculationModel();
        cm.attachCalculation(req)
            .then(data => {
            console.timeEnd("attachCalculation");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
    reRunCalculation(req, res, next) {
        console.time("reRunCalculation");
        let cm = new calculation_1.CalculationModel();
        cm.reRunCalculation(req)
            .then(data => {
            console.timeEnd("reRunCalculation");
            res.send(data);
        })
            .catch(err => {
            next(err);
        });
    }
}
exports.CalculationRoute = CalculationRoute;
