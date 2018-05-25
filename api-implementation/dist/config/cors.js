"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CorsConfig {
}
CorsConfig.headers = ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"];
CorsConfig.methods = "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE";
CorsConfig.credentials = true;
CorsConfig.url = ["http://localhost:3001", "http://localhost:4200"];
CorsConfig.preflightContinue = false;
exports.CorsConfig = CorsConfig;
