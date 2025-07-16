import pino from 'pino';
export declare const logger: import("pino").Logger<never>;
export declare const createLogger: (module: string) => pino.Logger<never>;
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