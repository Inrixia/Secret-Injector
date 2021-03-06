const core = require('@actions/core');
const { readdirSync, readFileSync, writeFileSync } = require('fs')
const { isText } = require('istextorbinary')

const safeParse = key => {
	try {
		const string = core.getInput(key);
		if (string === "undefined") return undefined;
		return JSON.parse(string);
	} catch (err) {
		const cleanError = err.message.substr(0, "Unexpected token ".length) + err.message.substr(err.message.indexOf("in JSON"))
		throw new Error(`${cleanError} while parsing ${key}`);
	}	
}

const curryInjector = (secrets, env) => string => {
	if (secrets !==	undefined) {
		for (const key in secrets) {
			string = string.replace(new RegExp("\\$\\{\\{\\s*secrets\\."+key+"\\s*\\}\\}", "gi"), secrets[key]);
		}
	}
	if (env !== undefined) {
		for (const key in env) {
			string = string.replace(new RegExp("\\$\\{\\{\\s*env\\."+key+"\\s*\\}\\}", "gi"), env[key]);
		}
	}
	return string;
}

const recursiveInject = ((dir, injector) => {
	for (const file of readdirSync(dir, { withFileTypes: true })) {
		const fileName = `${dir}${file.name}`
		if (file.isDirectory()) recursiveInject(`${fileName}/`, injector);
		else if (file.isFile() && isText(fileName)) writeFileSync(fileName, injector(readFileSync(fileName).toString()));
	}
})

try {
	secrets = safeParse("secrets");
	env = safeParse("env");

	recursiveInject('./', curryInjector(secrets, env));
} catch (error) {
  	core.setFailed(error.message);
}