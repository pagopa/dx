
//#region src/cli-args.ts
const parseArgs = (argv) => {
	const args = {};
	for (const raw of argv) {
		const match = /^--([^=]+)=([\s\S]*)$/.exec(raw);
		if (match) args[match[1]] = match[2];
	}
	return args;
};

//#endregion
Object.defineProperty(exports, 'parseArgs', {
  enumerable: true,
  get: function () {
    return parseArgs;
  }
});