"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppConfig {
}
AppConfig.protocol = 'http';
AppConfig.port = process.env.PORT || 8080;
AppConfig.host = "localhost";
AppConfig.secret = "75v9uv59u50ivtibFFGHHE0";
AppConfig.httpsPassphrase = "testtest";
exports.AppConfig = AppConfig;
