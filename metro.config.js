const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];
config.resolver.extraNodeModules = {
	...(config.resolver.extraNodeModules || {}),
	axios: path.join(__dirname, "node_modules", "axios", "dist", "browser", "axios.cjs"),
};
config.resolver.fallback = {
	crypto: false,
	stream: false,
	http: false,
	https: false,
	os: false,
	path: false,
	fs: false,
};

module.exports = config;
