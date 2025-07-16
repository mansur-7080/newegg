export declare const logger: any;
export declare const createLogger: (module: string) => any;
export declare const LogLevel: {
    readonly TRACE: "trace";
    readonly DEBUG: "debug";
    readonly INFO: "info";
    readonly WARN: "warn";
    readonly ERROR: "error";
    readonly FATAL: "fatal";
};
export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];
//# sourceMappingURL=logger.d.ts.map