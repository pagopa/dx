import { n as __esmMin } from "./chunk-CiiB0FCw.js";
import { n as require_dist_cjs } from "./default-dispatcher--ypkibiq.js";
import { $ as init_emitWarningIfUnsupportedVersion, A as getHttpSigningPlugin, B as resolveHostHeaderConfig, D as init_DefaultIdentityProviderConfig, E as DefaultIdentityProviderConfig, F as init_getRecursionDetectionPlugin, G as NODE_RETRY_MODE_CONFIG_OPTIONS, H as init_retry, I as getLoggerPlugin, J as DEFAULT_RETRY_MODE, K as init_configurations, L as init_loggerMiddleware, M as getHttpAuthSchemeEndpointRuleSetPlugin, N as init_getHttpAuthSchemeEndpointRuleSetPlugin, P as getRecursionDetectionPlugin, Q as emitWarningIfUnsupportedVersion, R as getHostHeaderPlugin, T as init_noAuth, V as getRetryPlugin, W as NODE_MAX_ATTEMPT_CONFIG_OPTIONS, Y as init_config, _ as resolveUserAgentConfig, a as resolveAwsRegionExtensionConfiguration, c as awsEndpointFunctions, d as init_nodeAppIdConfigOptions, f as createDefaultUserAgentProvider, g as init_configurations$1, h as init_user_agent_middleware, i as init_extensions, j as init_getHttpSigningMiddleware, l as init_aws, m as getUserAgentPlugin, n as init_client, p as init_defaultUserAgent, q as resolveRetryConfig, r as getAwsRegionExtensionConfiguration, u as NODE_APP_ID_CONFIG_OPTIONS, w as NoAuthSigner, y as init_dist_es, z as init_hostHeaderMiddleware } from "./client-DZ5tk1C2.js";
import { $t as init_create_aggregated_client, At as init_toBase64, B as init_config$2, D as init_BinaryDecisionDiagram, E as BinaryDecisionDiagram, F as resolveRegionConfig, Ft as init_fromBase64, G as init_configLoader, Gt as emitWarningIfUnsupportedVersion$1, H as init_NodeUseFipsEndpointConfigOptions, Ht as getDefaultExtensionConfiguration, I as NODE_REGION_CONFIG_FILE_OPTIONS, Jt as loadConfigsForDefaultMode, K as loadConfig, Kt as init_emitWarningIfUnsupportedVersion$1, L as NODE_REGION_CONFIG_OPTIONS, Lt as init_client$1, M as init_resolveDefaultsModeConfig, Mn as init_getSmithyContext, Mt as fromUtf8, N as resolveDefaultsModeConfig, Nt as init_fromUtf8, Ot as init_toUtf8, P as init_resolveRegionConfig, Pt as fromBase64, Qt as createAggregatedClient, Rt as NoOpLogger, Sn as normalizeProvider, T as init_EndpointCache, U as NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, Ut as init_defaultExtensionConfiguration, V as NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, W as init_NodeUseDualstackEndpointConfigOptions, Wt as resolveDefaultRuntimeConfig, Yt as ServiceException, Zt as init_exceptions, _ as init_decideEndpoint, _n as init_parseUrl, an as init_TypeRegistry, b as customEndpointFunctions, c as Hash, d as getEndpointPlugin, dn as init_getSchemaSerdePlugin, en as Command, f as init_endpoints, g as decideEndpoint, hn as init_client$2, in as TypeRegistry, j as init_config$1, jn as getSmithyContext, jt as toBase64, kt as toUtf8, l as init_hash_node, mn as Client, nn as init_schema, nt as init_calculateBodyLength, p as resolveEndpointConfig, qt as init_defaults_mode, r as init_serde, tn as init_command, tt as calculateBodyLength, un as getSchemaSerdePlugin, vn as parseUrl, w as EndpointCache, x as init_customEndpointFunctions, xn as init_normalizeProvider, zt as init_NoOpLogger } from "./serde-CEIw_Fs9.js";
import { a as getContentLengthPlugin, c as init_httpExtensionConfiguration, l as resolveHttpHandlerRuntimeConfig, o as init_contentLengthMiddleware, s as getHttpHandlerExtensionConfiguration, t as init_protocols } from "./protocols-CRJJHWSw.js";
import { b as init_AwsRestJsonProtocol, c as NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, f as AwsSdkSigV4Signer, h as init_protocols$1, i as resolveAwsSdkSigV4Config, l as init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, n as init_httpAuthSchemes, p as init_AwsSdkSigV4Signer, r as init_resolveAwsSdkSigV4Config, y as AwsRestJsonProtocol } from "./httpAuthSchemes-bRQhAT0D.js";
import { t as version } from "./package-P98Kc_1W.js";

//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
	return {
		schemeId: "aws.auth#sigv4",
		signingProperties: {
			name: "signin",
			region: authParameters.region
		},
		propertiesExtractor: (config, context) => ({ signingProperties: {
			config,
			context
		} })
	};
}
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
	return { schemeId: "smithy.api#noAuth" };
}
var defaultSigninHttpAuthSchemeParametersProvider, defaultSigninHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esmMin((() => {
	init_httpAuthSchemes();
	init_client$1();
	defaultSigninHttpAuthSchemeParametersProvider = async (config, context, input) => {
		return {
			operation: getSmithyContext(context).operation,
			region: await normalizeProvider(config.region)() || (() => {
				throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
			})()
		};
	};
	defaultSigninHttpAuthSchemeProvider = (authParameters) => {
		const options = [];
		switch (authParameters.operation) {
			case "CreateOAuth2Token":
				options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
				break;
			default: options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
		}
		return options;
	};
	resolveHttpAuthSchemeConfig = (config) => {
		const config_0 = resolveAwsSdkSigV4Config(config);
		return Object.assign(config_0, { authSchemePreference: normalizeProvider(config.authSchemePreference ?? []) });
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esmMin((() => {
	resolveClientEndpointParameters = (options) => {
		return Object.assign(options, {
			useDualstackEndpoint: options.useDualstackEndpoint ?? false,
			useFipsEndpoint: options.useFipsEndpoint ?? false,
			defaultSigningName: "signin"
		});
	};
	commonParams = {
		UseFIPS: {
			type: "builtInParams",
			name: "useFipsEndpoint"
		},
		Endpoint: {
			type: "builtInParams",
			name: "endpoint"
		},
		Region: {
			type: "builtInParams",
			name: "region"
		},
		UseDualStack: {
			type: "builtInParams",
			name: "useDualstackEndpoint"
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/bdd.js
var m, a, b, c, d, e, f, g, h, i, j, k, l, _data, root, nodes, bdd;
var init_bdd = __esmMin((() => {
	init_endpoints();
	m = "ref";
	a = -1, b = true, c = "isSet", d = "PartitionResult", e = "booleanEquals", f = "getAttr", g = "stringEquals", h = { [m]: "Endpoint" }, i = { [m]: d }, j = {
		fn: f,
		argv: [i, "name"]
	}, k = {}, l = [{ [m]: "Region" }];
	_data = {
		conditions: [
			[c, [h]],
			[c, l],
			[
				"aws.partition",
				l,
				d
			],
			[e, [{ [m]: "UseFIPS" }, b]],
			[e, [{ [m]: "UseDualStack" }, b]],
			[e, [{
				fn: f,
				argv: [i, "supportsDualStack"]
			}, b]],
			[e, [{
				fn: f,
				argv: [i, "supportsFIPS"]
			}, b]],
			[g, [j, "aws"]],
			[g, [j, "aws-cn"]],
			[g, [j, "aws-us-gov"]]
		],
		results: [
			[a],
			[a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
			[a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
			[h, k],
			["https://{Region}.signin.aws.amazon.com", k],
			["https://{Region}.signin.amazonaws.cn", k],
			["https://{Region}.signin.amazonaws-us-gov.com", k],
			["https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", k],
			[a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
			["https://signin-fips.{Region}.{PartitionResult#dnsSuffix}", k],
			[a, "FIPS is enabled but this partition does not support FIPS"],
			["https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}", k],
			[a, "DualStack is enabled but this partition does not support DualStack"],
			["https://signin.{Region}.{PartitionResult#dnsSuffix}", k],
			[a, "Invalid Configuration: Missing Region"]
		]
	};
	root = 2;
	nodes = new Int32Array([
		-1,
		1,
		-1,
		0,
		15,
		3,
		1,
		4,
		100000014,
		2,
		5,
		100000014,
		3,
		11,
		6,
		4,
		10,
		7,
		7,
		100000004,
		8,
		8,
		100000005,
		9,
		9,
		100000006,
		100000013,
		5,
		100000011,
		100000012,
		4,
		13,
		12,
		6,
		100000009,
		100000010,
		5,
		14,
		100000008,
		6,
		100000007,
		100000008,
		3,
		100000001,
		16,
		4,
		100000002,
		100000003
	]);
	bdd = BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/endpointResolver.js
var cache, defaultEndpointResolver;
var init_endpointResolver = __esmMin((() => {
	init_client();
	init_endpoints();
	init_bdd();
	cache = new EndpointCache({
		size: 50,
		params: [
			"Endpoint",
			"Region",
			"UseDualStack",
			"UseFIPS"
		]
	});
	defaultEndpointResolver = (endpointParams, context = {}) => {
		return cache.get(endpointParams, () => decideEndpoint(bdd, {
			endpointParams,
			logger: context.logger
		}));
	};
	customEndpointFunctions.aws = awsEndpointFunctions;
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/SigninServiceException.js
var SigninServiceException;
var init_SigninServiceException = __esmMin((() => {
	init_client$1();
	SigninServiceException = class SigninServiceException extends ServiceException {
		constructor(options) {
			super(options);
			Object.setPrototypeOf(this, SigninServiceException.prototype);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/errors.js
var AccessDeniedException, InternalServerException, TooManyRequestsError, ValidationException;
var init_errors = __esmMin((() => {
	init_SigninServiceException();
	AccessDeniedException = class AccessDeniedException extends SigninServiceException {
		name = "AccessDeniedException";
		$fault = "client";
		error;
		constructor(opts) {
			super({
				name: "AccessDeniedException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, AccessDeniedException.prototype);
			this.error = opts.error;
		}
	};
	InternalServerException = class InternalServerException extends SigninServiceException {
		name = "InternalServerException";
		$fault = "server";
		error;
		constructor(opts) {
			super({
				name: "InternalServerException",
				$fault: "server",
				...opts
			});
			Object.setPrototypeOf(this, InternalServerException.prototype);
			this.error = opts.error;
		}
	};
	TooManyRequestsError = class TooManyRequestsError extends SigninServiceException {
		name = "TooManyRequestsError";
		$fault = "client";
		error;
		constructor(opts) {
			super({
				name: "TooManyRequestsError",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, TooManyRequestsError.prototype);
			this.error = opts.error;
		}
	};
	ValidationException = class ValidationException extends SigninServiceException {
		name = "ValidationException";
		$fault = "client";
		error;
		constructor(opts) {
			super({
				name: "ValidationException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, ValidationException.prototype);
			this.error = opts.error;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/schemas/schemas_0.js
var _ADE, _AT, _COAT, _COATR, _COATRB, _COATRBr, _COATRr, _ISE, _RT, _TMRE, _VE, _aKI, _aT, _c, _cI, _cV, _co, _e, _eI, _gT, _h, _hE, _iT, _jN, _m, _rT, _rU, _s, _sAK, _sT, _se, _tI, _tO, _tT, n0, _s_registry, SigninServiceException$, n0_registry, AccessDeniedException$, InternalServerException$, TooManyRequestsError$, ValidationException$, errorTypeRegistries, RefreshToken, AccessToken$, CreateOAuth2TokenRequest$, CreateOAuth2TokenRequestBody$, CreateOAuth2TokenResponse$, CreateOAuth2TokenResponseBody$, CreateOAuth2Token$;
var init_schemas_0 = __esmMin((() => {
	init_schema();
	init_errors();
	init_SigninServiceException();
	_ADE = "AccessDeniedException";
	_AT = "AccessToken";
	_COAT = "CreateOAuth2Token";
	_COATR = "CreateOAuth2TokenRequest";
	_COATRB = "CreateOAuth2TokenRequestBody";
	_COATRBr = "CreateOAuth2TokenResponseBody";
	_COATRr = "CreateOAuth2TokenResponse";
	_ISE = "InternalServerException";
	_RT = "RefreshToken";
	_TMRE = "TooManyRequestsError";
	_VE = "ValidationException";
	_aKI = "accessKeyId";
	_aT = "accessToken";
	_c = "client";
	_cI = "clientId";
	_cV = "codeVerifier";
	_co = "code";
	_e = "error";
	_eI = "expiresIn";
	_gT = "grantType";
	_h = "http";
	_hE = "httpError";
	_iT = "idToken";
	_jN = "jsonName";
	_m = "message";
	_rT = "refreshToken";
	_rU = "redirectUri";
	_s = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
	_sAK = "secretAccessKey";
	_sT = "sessionToken";
	_se = "server";
	_tI = "tokenInput";
	_tO = "tokenOutput";
	_tT = "tokenType";
	n0 = "com.amazonaws.signin";
	_s_registry = TypeRegistry.for(_s);
	SigninServiceException$ = [
		-3,
		_s,
		"SigninServiceException",
		0,
		[],
		[]
	];
	_s_registry.registerError(SigninServiceException$, SigninServiceException);
	n0_registry = TypeRegistry.for(n0);
	AccessDeniedException$ = [
		-3,
		n0,
		_ADE,
		{ [_e]: _c },
		[_e, _m],
		[0, 0],
		2
	];
	n0_registry.registerError(AccessDeniedException$, AccessDeniedException);
	InternalServerException$ = [
		-3,
		n0,
		_ISE,
		{
			[_e]: _se,
			[_hE]: 500
		},
		[_e, _m],
		[0, 0],
		2
	];
	n0_registry.registerError(InternalServerException$, InternalServerException);
	TooManyRequestsError$ = [
		-3,
		n0,
		_TMRE,
		{
			[_e]: _c,
			[_hE]: 429
		},
		[_e, _m],
		[0, 0],
		2
	];
	n0_registry.registerError(TooManyRequestsError$, TooManyRequestsError);
	ValidationException$ = [
		-3,
		n0,
		_VE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _m],
		[0, 0],
		2
	];
	n0_registry.registerError(ValidationException$, ValidationException);
	errorTypeRegistries = [_s_registry, n0_registry];
	RefreshToken = [
		0,
		n0,
		_RT,
		8,
		0
	];
	AccessToken$ = [
		3,
		n0,
		_AT,
		8,
		[
			_aKI,
			_sAK,
			_sT
		],
		[
			[0, { [_jN]: _aKI }],
			[0, { [_jN]: _sAK }],
			[0, { [_jN]: _sT }]
		],
		3
	];
	CreateOAuth2TokenRequest$ = [
		3,
		n0,
		_COATR,
		0,
		[_tI],
		[[() => CreateOAuth2TokenRequestBody$, 16]],
		1
	];
	CreateOAuth2TokenRequestBody$ = [
		3,
		n0,
		_COATRB,
		0,
		[
			_cI,
			_gT,
			_co,
			_rU,
			_cV,
			_rT
		],
		[
			[0, { [_jN]: _cI }],
			[0, { [_jN]: _gT }],
			0,
			[0, { [_jN]: _rU }],
			[0, { [_jN]: _cV }],
			[() => RefreshToken, { [_jN]: _rT }]
		],
		2
	];
	CreateOAuth2TokenResponse$ = [
		3,
		n0,
		_COATRr,
		0,
		[_tO],
		[[() => CreateOAuth2TokenResponseBody$, 16]],
		1
	];
	CreateOAuth2TokenResponseBody$ = [
		3,
		n0,
		_COATRBr,
		0,
		[
			_aT,
			_tT,
			_eI,
			_rT,
			_iT
		],
		[
			[() => AccessToken$, { [_jN]: _aT }],
			[0, { [_jN]: _tT }],
			[1, { [_jN]: _eI }],
			[() => RefreshToken, { [_jN]: _rT }],
			[0, { [_jN]: _iT }]
		],
		4
	];
	CreateOAuth2Token$ = [
		9,
		n0,
		_COAT,
		{ [_h]: [
			"POST",
			"/v1/token",
			200
		] },
		() => CreateOAuth2TokenRequest$,
		() => CreateOAuth2TokenResponse$
	];
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.shared.js
var getRuntimeConfig$1;
var init_runtimeConfig_shared = __esmMin((() => {
	init_httpAuthSchemes();
	init_protocols$1();
	init_dist_es();
	init_client$1();
	init_protocols();
	init_serde();
	init_httpAuthSchemeProvider();
	init_endpointResolver();
	init_schemas_0();
	getRuntimeConfig$1 = (config) => {
		return {
			apiVersion: "2023-01-01",
			base64Decoder: config?.base64Decoder ?? fromBase64,
			base64Encoder: config?.base64Encoder ?? toBase64,
			disableHostPrefix: config?.disableHostPrefix ?? false,
			endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
			extensions: config?.extensions ?? [],
			httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSigninHttpAuthSchemeProvider,
			httpAuthSchemes: config?.httpAuthSchemes ?? [{
				schemeId: "aws.auth#sigv4",
				identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
				signer: new AwsSdkSigV4Signer()
			}, {
				schemeId: "smithy.api#noAuth",
				identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
				signer: new NoAuthSigner()
			}],
			logger: config?.logger ?? new NoOpLogger(),
			protocol: config?.protocol ?? AwsRestJsonProtocol,
			protocolSettings: config?.protocolSettings ?? {
				defaultNamespace: "com.amazonaws.signin",
				errorTypeRegistries,
				version: "2023-01-01",
				serviceTarget: "Signin"
			},
			serviceId: config?.serviceId ?? "Signin",
			urlParser: config?.urlParser ?? parseUrl,
			utf8Decoder: config?.utf8Decoder ?? fromUtf8,
			utf8Encoder: config?.utf8Encoder ?? toUtf8
		};
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.js
var import_dist_cjs, getRuntimeConfig;
var init_runtimeConfig = __esmMin((() => {
	init_client();
	init_httpAuthSchemes();
	init_client$1();
	init_config$1();
	init_retry();
	init_serde();
	import_dist_cjs = require_dist_cjs();
	init_runtimeConfig_shared();
	getRuntimeConfig = (config) => {
		emitWarningIfUnsupportedVersion$1(process.version);
		const defaultsMode = resolveDefaultsModeConfig(config);
		const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
		const clientSharedValues = getRuntimeConfig$1(config);
		emitWarningIfUnsupportedVersion(process.version);
		const loaderConfig = {
			profile: config?.profile,
			logger: clientSharedValues.logger
		};
		return {
			...clientSharedValues,
			...config,
			runtime: "node",
			defaultsMode,
			authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
			bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
			defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({
				serviceId: clientSharedValues.serviceId,
				clientVersion: version
			}),
			maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
			region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, {
				...NODE_REGION_CONFIG_FILE_OPTIONS,
				...loaderConfig
			}),
			requestHandler: import_dist_cjs.NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
			retryMode: config?.retryMode ?? loadConfig({
				...NODE_RETRY_MODE_CONFIG_OPTIONS,
				default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
			}, config),
			sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
			streamCollector: config?.streamCollector ?? import_dist_cjs.streamCollector,
			useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
			useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
			userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
		};
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esmMin((() => {
	getHttpAuthExtensionConfiguration = (runtimeConfig) => {
		const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
		let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
		let _credentials = runtimeConfig.credentials;
		return {
			setHttpAuthScheme(httpAuthScheme) {
				const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
				if (index === -1) _httpAuthSchemes.push(httpAuthScheme);
				else _httpAuthSchemes.splice(index, 1, httpAuthScheme);
			},
			httpAuthSchemes() {
				return _httpAuthSchemes;
			},
			setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
				_httpAuthSchemeProvider = httpAuthSchemeProvider;
			},
			httpAuthSchemeProvider() {
				return _httpAuthSchemeProvider;
			},
			setCredentials(credentials) {
				_credentials = credentials;
			},
			credentials() {
				return _credentials;
			}
		};
	};
	resolveHttpAuthRuntimeConfig = (config) => {
		return {
			httpAuthSchemes: config.httpAuthSchemes(),
			httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
			credentials: config.credentials()
		};
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeExtensions.js
var resolveRuntimeExtensions;
var init_runtimeExtensions = __esmMin((() => {
	init_client();
	init_client$1();
	init_protocols();
	init_httpAuthExtensionConfiguration();
	resolveRuntimeExtensions = (runtimeConfig, extensions) => {
		const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
		extensions.forEach((extension) => extension.configure(extensionConfiguration));
		return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/SigninClient.js
var SigninClient;
var init_SigninClient = __esmMin((() => {
	init_client();
	init_dist_es();
	init_client$1();
	init_config$1();
	init_endpoints();
	init_protocols();
	init_retry();
	init_schema();
	init_httpAuthSchemeProvider();
	init_EndpointParameters();
	init_runtimeConfig();
	init_runtimeExtensions();
	SigninClient = class extends Client {
		config;
		constructor(...[configuration]) {
			const _config_0 = getRuntimeConfig(configuration || {});
			super(_config_0);
			this.initConfig = _config_0;
			const _config_8 = resolveRuntimeExtensions(resolveHttpAuthSchemeConfig(resolveEndpointConfig(resolveHostHeaderConfig(resolveRegionConfig(resolveRetryConfig(resolveUserAgentConfig(resolveClientEndpointParameters(_config_0))))))), configuration?.extensions || []);
			this.config = _config_8;
			this.middlewareStack.use(getSchemaSerdePlugin(this.config));
			this.middlewareStack.use(getUserAgentPlugin(this.config));
			this.middlewareStack.use(getRetryPlugin(this.config));
			this.middlewareStack.use(getContentLengthPlugin(this.config));
			this.middlewareStack.use(getHostHeaderPlugin(this.config));
			this.middlewareStack.use(getLoggerPlugin(this.config));
			this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
			this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
				httpAuthSchemeParametersProvider: defaultSigninHttpAuthSchemeParametersProvider,
				identityProviderConfigProvider: async (config) => new DefaultIdentityProviderConfig({ "aws.auth#sigv4": config.credentials })
			}));
			this.middlewareStack.use(getHttpSigningPlugin(this.config));
		}
		destroy() {
			super.destroy();
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenCommand.js
var CreateOAuth2TokenCommand;
var init_CreateOAuth2TokenCommand = __esmMin((() => {
	init_client$1();
	init_endpoints();
	init_EndpointParameters();
	init_schemas_0();
	CreateOAuth2TokenCommand = class extends Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
		return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
	}).s("Signin", "CreateOAuth2Token", {}).n("SigninClient", "CreateOAuth2TokenCommand").sc(CreateOAuth2Token$).build() {};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/Signin.js
var commands, Signin;
var init_Signin = __esmMin((() => {
	init_client$1();
	init_CreateOAuth2TokenCommand();
	init_SigninClient();
	commands = { CreateOAuth2TokenCommand };
	Signin = class extends SigninClient {};
	createAggregatedClient(commands, Signin);
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/index.js
var init_commands = __esmMin((() => {
	init_CreateOAuth2TokenCommand();
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/enums.js
var init_enums = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/models_0.js
var init_models_0 = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/index.js
var init_signin = __esmMin((() => {
	init_SigninClient();
	init_Signin();
	init_commands();
	init_schemas_0();
	init_enums();
	init_errors();
	init_models_0();
	init_SigninServiceException();
}));

//#endregion
init_signin();
export { CreateOAuth2TokenCommand, SigninClient };