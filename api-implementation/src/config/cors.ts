export class CorsConfig {
    public static readonly headers = ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"];
    public static readonly methods = "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE";
    public static readonly credentials = true;
    public static readonly url = ["http://localhost:3001", "http://localhost:4200"];
    public static readonly preflightContinue = false;
}