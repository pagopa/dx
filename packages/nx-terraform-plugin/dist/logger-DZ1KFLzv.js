import { configure, getConsoleSink, getJsonLinesFormatter, getLogger } from "@logtape/logtape";

//#region src/logger.ts
/**
* Category helpers for the nx-terraform-plugin LogTape logger tree.
*/
const getPackageLogger = (category) => getLogger(["nx-terraform-plugin", ...category]);
const configureLogger = () => configure({
	loggers: [{
		category: ["nx-terraform-plugin"],
		lowestLevel: "info",
		sinks: ["console"]
	}, {
		category: ["logtape", "meta"],
		lowestLevel: "warning",
		sinks: ["console"]
	}],
	sinks: { console: getConsoleSink({ formatter: getJsonLinesFormatter() }) }
});

//#endregion
export { getPackageLogger as n, configureLogger as t };