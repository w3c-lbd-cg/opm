export class AppConfig {
    // protocol can be either HTTP or HTTPS
    public static readonly protocol = 'https';
    // default port for HTTPS is 443
    // default port for HTTP is 8080
    public static readonly port = process.env.PORT || 443;
    public static readonly host = "localhost";
    // for HTTPS only
    public static readonly secret = "75v9uv59u50ivtibFFGHHE0";
    public static readonly httpsPassphrase = "testtest";
}