import { n as __esmMin } from "./chunk-CiiB0FCw.js";
import { n as require_dist_cjs } from "./default-dispatcher--ypkibiq.js";
import { $ as init_emitWarningIfUnsupportedVersion, A as getHttpSigningPlugin, B as resolveHostHeaderConfig, D as init_DefaultIdentityProviderConfig, E as DefaultIdentityProviderConfig, F as init_getRecursionDetectionPlugin, G as NODE_RETRY_MODE_CONFIG_OPTIONS, H as init_retry, I as getLoggerPlugin, J as DEFAULT_RETRY_MODE, K as init_configurations, L as init_loggerMiddleware, M as getHttpAuthSchemeEndpointRuleSetPlugin, N as init_getHttpAuthSchemeEndpointRuleSetPlugin, P as getRecursionDetectionPlugin, Q as emitWarningIfUnsupportedVersion, R as getHostHeaderPlugin, T as init_noAuth, V as getRetryPlugin, W as NODE_MAX_ATTEMPT_CONFIG_OPTIONS, Y as init_config, _ as resolveUserAgentConfig, a as resolveAwsRegionExtensionConfiguration, c as awsEndpointFunctions, d as init_nodeAppIdConfigOptions, f as createDefaultUserAgentProvider, g as init_configurations$1, h as init_user_agent_middleware, i as init_extensions, j as init_getHttpSigningMiddleware, l as init_aws, m as getUserAgentPlugin, n as init_client, p as init_defaultUserAgent, q as resolveRetryConfig, r as getAwsRegionExtensionConfiguration, u as NODE_APP_ID_CONFIG_OPTIONS, w as NoAuthSigner, y as init_dist_es, z as init_hostHeaderMiddleware } from "./client-DZ5tk1C2.js";
import { $t as init_create_aggregated_client, At as init_toBase64, B as init_config$2, D as init_BinaryDecisionDiagram, E as BinaryDecisionDiagram, F as resolveRegionConfig, Ft as init_fromBase64, G as init_configLoader, Gt as emitWarningIfUnsupportedVersion$1, H as init_NodeUseFipsEndpointConfigOptions, Ht as getDefaultExtensionConfiguration, I as NODE_REGION_CONFIG_FILE_OPTIONS, Jt as loadConfigsForDefaultMode, K as loadConfig, Kt as init_emitWarningIfUnsupportedVersion$1, L as NODE_REGION_CONFIG_OPTIONS, Lt as init_client$1, M as init_resolveDefaultsModeConfig, Mn as init_getSmithyContext, Mt as fromUtf8, N as resolveDefaultsModeConfig, Nt as init_fromUtf8, Ot as init_toUtf8, P as init_resolveRegionConfig, Pt as fromBase64, Qt as createAggregatedClient, Rt as NoOpLogger, Sn as normalizeProvider, T as init_EndpointCache, U as NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, Ut as init_defaultExtensionConfiguration, V as NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, W as init_NodeUseDualstackEndpointConfigOptions, Wt as resolveDefaultRuntimeConfig, Yt as ServiceException, Zt as init_exceptions, _ as init_decideEndpoint, _n as init_parseUrl, an as init_TypeRegistry, b as customEndpointFunctions, c as Hash, d as getEndpointPlugin, dn as init_getSchemaSerdePlugin, en as Command, f as init_endpoints, g as decideEndpoint, hn as init_client$2, in as TypeRegistry, j as init_config$1, jn as getSmithyContext, jt as toBase64, kt as toUtf8, l as init_hash_node, mn as Client, nn as init_schema, nt as init_calculateBodyLength, p as resolveEndpointConfig, qt as init_defaults_mode, r as init_serde, tn as init_command, tt as calculateBodyLength, un as getSchemaSerdePlugin, vn as parseUrl, w as EndpointCache, x as init_customEndpointFunctions, xn as init_normalizeProvider, zt as init_NoOpLogger } from "./serde-CEIw_Fs9.js";
import { a as getContentLengthPlugin, c as init_httpExtensionConfiguration, l as resolveHttpHandlerRuntimeConfig, o as init_contentLengthMiddleware, s as getHttpHandlerExtensionConfiguration, t as init_protocols } from "./protocols-CRJJHWSw.js";
import { b as init_AwsRestJsonProtocol, c as NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, f as AwsSdkSigV4Signer, h as init_protocols$1, i as resolveAwsSdkSigV4Config, l as init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, n as init_httpAuthSchemes, p as init_AwsSdkSigV4Signer, r as init_resolveAwsSdkSigV4Config, y as AwsRestJsonProtocol } from "./httpAuthSchemes-bRQhAT0D.js";
import { t as version } from "./package-P98Kc_1W.js";

//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
	return {
		schemeId: "aws.auth#sigv4",
		signingProperties: {
			name: "sso-oauth",
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
var defaultSSOOIDCHttpAuthSchemeParametersProvider, defaultSSOOIDCHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esmMin((() => {
	init_httpAuthSchemes();
	init_client$1();
	defaultSSOOIDCHttpAuthSchemeParametersProvider = async (config, context, input) => {
		return {
			operation: getSmithyContext(context).operation,
			region: await normalizeProvider(config.region)() || (() => {
				throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
			})()
		};
	};
	defaultSSOOIDCHttpAuthSchemeProvider = (authParameters) => {
		const options = [];
		switch (authParameters.operation) {
			case "CreateToken":
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esmMin((() => {
	resolveClientEndpointParameters = (options) => {
		return Object.assign(options, {
			useDualstackEndpoint: options.useDualstackEndpoint ?? false,
			useFipsEndpoint: options.useFipsEndpoint ?? false,
			defaultSigningName: "sso-oauth"
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/bdd.js
var k, a, b, c, d, e, f, g, h, i, j, _data, root, nodes, bdd;
var init_bdd = __esmMin((() => {
	init_endpoints();
	k = "ref";
	a = -1, b = true, c = "isSet", d = "PartitionResult", e = "booleanEquals", f = "getAttr", g = { [k]: "Endpoint" }, h = { [k]: d }, i = {}, j = [{ [k]: "Region" }];
	_data = {
		conditions: [
			[c, [g]],
			[c, j],
			[
				"aws.partition",
				j,
				d
			],
			[e, [{ [k]: "UseFIPS" }, b]],
			[e, [{ [k]: "UseDualStack" }, b]],
			[e, [{
				fn: f,
				argv: [h, "supportsDualStack"]
			}, b]],
			[e, [{
				fn: f,
				argv: [h, "supportsFIPS"]
			}, b]],
			["stringEquals", [{
				fn: f,
				argv: [h, "name"]
			}, "aws-us-gov"]]
		],
		results: [
			[a],
			[a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
			[a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
			[g, i],
			["https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
			[a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
			["https://oidc.{Region}.amazonaws.com", i],
			["https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", i],
			[a, "FIPS is enabled but this partition does not support FIPS"],
			["https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
			[a, "DualStack is enabled but this partition does not support DualStack"],
			["https://oidc.{Region}.{PartitionResult#dnsSuffix}", i],
			[a, "Invalid Configuration: Missing Region"]
		]
	};
	root = 2;
	nodes = new Int32Array([
		-1,
		1,
		-1,
		0,
		13,
		3,
		1,
		4,
		100000012,
		2,
		5,
		100000012,
		3,
		8,
		6,
		4,
		7,
		100000011,
		5,
		100000009,
		100000010,
		4,
		11,
		9,
		6,
		10,
		100000008,
		7,
		100000006,
		100000007,
		5,
		12,
		100000005,
		6,
		100000004,
		100000005,
		3,
		100000001,
		14,
		4,
		100000002,
		100000003
	]);
	bdd = BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/endpointResolver.js
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/SSOOIDCServiceException.js
var SSOOIDCServiceException;
var init_SSOOIDCServiceException = __esmMin((() => {
	init_client$1();
	SSOOIDCServiceException = class SSOOIDCServiceException extends ServiceException {
		constructor(options) {
			super(options);
			Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/errors.js
var AccessDeniedException, AuthorizationPendingException, ExpiredTokenException, InternalServerException, InvalidClientException, InvalidGrantException, InvalidRequestException, InvalidScopeException, SlowDownException, UnauthorizedClientException, UnsupportedGrantTypeException;
var init_errors = __esmMin((() => {
	init_SSOOIDCServiceException();
	AccessDeniedException = class AccessDeniedException extends SSOOIDCServiceException {
		name = "AccessDeniedException";
		$fault = "client";
		error;
		reason;
		error_description;
		constructor(opts) {
			super({
				name: "AccessDeniedException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, AccessDeniedException.prototype);
			this.error = opts.error;
			this.reason = opts.reason;
			this.error_description = opts.error_description;
		}
	};
	AuthorizationPendingException = class AuthorizationPendingException extends SSOOIDCServiceException {
		name = "AuthorizationPendingException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "AuthorizationPendingException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	ExpiredTokenException = class ExpiredTokenException extends SSOOIDCServiceException {
		name = "ExpiredTokenException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "ExpiredTokenException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, ExpiredTokenException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	InternalServerException = class InternalServerException extends SSOOIDCServiceException {
		name = "InternalServerException";
		$fault = "server";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "InternalServerException",
				$fault: "server",
				...opts
			});
			Object.setPrototypeOf(this, InternalServerException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	InvalidClientException = class InvalidClientException extends SSOOIDCServiceException {
		name = "InvalidClientException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "InvalidClientException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, InvalidClientException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	InvalidGrantException = class InvalidGrantException extends SSOOIDCServiceException {
		name = "InvalidGrantException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "InvalidGrantException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, InvalidGrantException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	InvalidRequestException = class InvalidRequestException extends SSOOIDCServiceException {
		name = "InvalidRequestException";
		$fault = "client";
		error;
		reason;
		error_description;
		constructor(opts) {
			super({
				name: "InvalidRequestException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, InvalidRequestException.prototype);
			this.error = opts.error;
			this.reason = opts.reason;
			this.error_description = opts.error_description;
		}
	};
	InvalidScopeException = class InvalidScopeException extends SSOOIDCServiceException {
		name = "InvalidScopeException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "InvalidScopeException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, InvalidScopeException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	SlowDownException = class SlowDownException extends SSOOIDCServiceException {
		name = "SlowDownException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "SlowDownException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, SlowDownException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	UnauthorizedClientException = class UnauthorizedClientException extends SSOOIDCServiceException {
		name = "UnauthorizedClientException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "UnauthorizedClientException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
	UnsupportedGrantTypeException = class UnsupportedGrantTypeException extends SSOOIDCServiceException {
		name = "UnsupportedGrantTypeException";
		$fault = "client";
		error;
		error_description;
		constructor(opts) {
			super({
				name: "UnsupportedGrantTypeException",
				$fault: "client",
				...opts
			});
			Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
			this.error = opts.error;
			this.error_description = opts.error_description;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/schemas/schemas_0.js
var _ADE, _APE, _AT, _CS, _CT, _CTR, _CTRr, _CV, _ETE, _ICE, _IGE, _IRE, _ISE, _ISEn, _IT, _RT, _SDE, _UCE, _UGTE, _aT, _c, _cI, _cS, _cV, _co, _dC, _e, _eI, _ed, _gT, _h, _hE, _iT, _r, _rT, _rU, _s, _sc, _se, _tT, n0, _s_registry, SSOOIDCServiceException$, n0_registry, AccessDeniedException$, AuthorizationPendingException$, ExpiredTokenException$, InternalServerException$, InvalidClientException$, InvalidGrantException$, InvalidRequestException$, InvalidScopeException$, SlowDownException$, UnauthorizedClientException$, UnsupportedGrantTypeException$, errorTypeRegistries, AccessToken, ClientSecret, CodeVerifier, IdToken, RefreshToken, CreateTokenRequest$, CreateTokenResponse$, CreateToken$;
var init_schemas_0 = __esmMin((() => {
	init_schema();
	init_errors();
	init_SSOOIDCServiceException();
	_ADE = "AccessDeniedException";
	_APE = "AuthorizationPendingException";
	_AT = "AccessToken";
	_CS = "ClientSecret";
	_CT = "CreateToken";
	_CTR = "CreateTokenRequest";
	_CTRr = "CreateTokenResponse";
	_CV = "CodeVerifier";
	_ETE = "ExpiredTokenException";
	_ICE = "InvalidClientException";
	_IGE = "InvalidGrantException";
	_IRE = "InvalidRequestException";
	_ISE = "InternalServerException";
	_ISEn = "InvalidScopeException";
	_IT = "IdToken";
	_RT = "RefreshToken";
	_SDE = "SlowDownException";
	_UCE = "UnauthorizedClientException";
	_UGTE = "UnsupportedGrantTypeException";
	_aT = "accessToken";
	_c = "client";
	_cI = "clientId";
	_cS = "clientSecret";
	_cV = "codeVerifier";
	_co = "code";
	_dC = "deviceCode";
	_e = "error";
	_eI = "expiresIn";
	_ed = "error_description";
	_gT = "grantType";
	_h = "http";
	_hE = "httpError";
	_iT = "idToken";
	_r = "reason";
	_rT = "refreshToken";
	_rU = "redirectUri";
	_s = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
	_sc = "scope";
	_se = "server";
	_tT = "tokenType";
	n0 = "com.amazonaws.ssooidc";
	_s_registry = TypeRegistry.for(_s);
	SSOOIDCServiceException$ = [
		-3,
		_s,
		"SSOOIDCServiceException",
		0,
		[],
		[]
	];
	_s_registry.registerError(SSOOIDCServiceException$, SSOOIDCServiceException);
	n0_registry = TypeRegistry.for(n0);
	AccessDeniedException$ = [
		-3,
		n0,
		_ADE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[
			_e,
			_r,
			_ed
		],
		[
			0,
			0,
			0
		]
	];
	n0_registry.registerError(AccessDeniedException$, AccessDeniedException);
	AuthorizationPendingException$ = [
		-3,
		n0,
		_APE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(AuthorizationPendingException$, AuthorizationPendingException);
	ExpiredTokenException$ = [
		-3,
		n0,
		_ETE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(ExpiredTokenException$, ExpiredTokenException);
	InternalServerException$ = [
		-3,
		n0,
		_ISE,
		{
			[_e]: _se,
			[_hE]: 500
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(InternalServerException$, InternalServerException);
	InvalidClientException$ = [
		-3,
		n0,
		_ICE,
		{
			[_e]: _c,
			[_hE]: 401
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(InvalidClientException$, InvalidClientException);
	InvalidGrantException$ = [
		-3,
		n0,
		_IGE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(InvalidGrantException$, InvalidGrantException);
	InvalidRequestException$ = [
		-3,
		n0,
		_IRE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[
			_e,
			_r,
			_ed
		],
		[
			0,
			0,
			0
		]
	];
	n0_registry.registerError(InvalidRequestException$, InvalidRequestException);
	InvalidScopeException$ = [
		-3,
		n0,
		_ISEn,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(InvalidScopeException$, InvalidScopeException);
	SlowDownException$ = [
		-3,
		n0,
		_SDE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(SlowDownException$, SlowDownException);
	UnauthorizedClientException$ = [
		-3,
		n0,
		_UCE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(UnauthorizedClientException$, UnauthorizedClientException);
	UnsupportedGrantTypeException$ = [
		-3,
		n0,
		_UGTE,
		{
			[_e]: _c,
			[_hE]: 400
		},
		[_e, _ed],
		[0, 0]
	];
	n0_registry.registerError(UnsupportedGrantTypeException$, UnsupportedGrantTypeException);
	errorTypeRegistries = [_s_registry, n0_registry];
	AccessToken = [
		0,
		n0,
		_AT,
		8,
		0
	];
	ClientSecret = [
		0,
		n0,
		_CS,
		8,
		0
	];
	CodeVerifier = [
		0,
		n0,
		_CV,
		8,
		0
	];
	IdToken = [
		0,
		n0,
		_IT,
		8,
		0
	];
	RefreshToken = [
		0,
		n0,
		_RT,
		8,
		0
	];
	CreateTokenRequest$ = [
		3,
		n0,
		_CTR,
		0,
		[
			_cI,
			_cS,
			_gT,
			_dC,
			_co,
			_rT,
			_sc,
			_rU,
			_cV
		],
		[
			0,
			[() => ClientSecret, 0],
			0,
			0,
			0,
			[() => RefreshToken, 0],
			64,
			0,
			[() => CodeVerifier, 0]
		],
		3
	];
	CreateTokenResponse$ = [
		3,
		n0,
		_CTRr,
		0,
		[
			_aT,
			_tT,
			_eI,
			_rT,
			_iT
		],
		[
			[() => AccessToken, 0],
			0,
			1,
			[() => RefreshToken, 0],
			[() => IdToken, 0]
		]
	];
	CreateToken$ = [
		9,
		n0,
		_CT,
		{ [_h]: [
			"POST",
			"/token",
			200
		] },
		() => CreateTokenRequest$,
		() => CreateTokenResponse$
	];
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.shared.js
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
			apiVersion: "2019-06-10",
			base64Decoder: config?.base64Decoder ?? fromBase64,
			base64Encoder: config?.base64Encoder ?? toBase64,
			disableHostPrefix: config?.disableHostPrefix ?? false,
			endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
			extensions: config?.extensions ?? [],
			httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOOIDCHttpAuthSchemeProvider,
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
				defaultNamespace: "com.amazonaws.ssooidc",
				errorTypeRegistries,
				version: "2019-06-10",
				serviceTarget: "AWSSSOOIDCService"
			},
			serviceId: config?.serviceId ?? "SSO OIDC",
			urlParser: config?.urlParser ?? parseUrl,
			utf8Decoder: config?.utf8Decoder ?? fromUtf8,
			utf8Encoder: config?.utf8Encoder ?? toUtf8
		};
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.js
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.js
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeExtensions.js
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDCClient.js
var SSOOIDCClient;
var init_SSOOIDCClient = __esmMin((() => {
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
	SSOOIDCClient = class extends Client {
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
				httpAuthSchemeParametersProvider: defaultSSOOIDCHttpAuthSchemeParametersProvider,
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
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/CreateTokenCommand.js
var CreateTokenCommand;
var init_CreateTokenCommand = __esmMin((() => {
	init_client$1();
	init_endpoints();
	init_EndpointParameters();
	init_schemas_0();
	CreateTokenCommand = class extends Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
		return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
	}).s("AWSSSOOIDCService", "CreateToken", {}).n("SSOOIDCClient", "CreateTokenCommand").sc(CreateToken$).build() {};
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDC.js
var commands, SSOOIDC;
var init_SSOOIDC = __esmMin((() => {
	init_client$1();
	init_CreateTokenCommand();
	init_SSOOIDCClient();
	commands = { CreateTokenCommand };
	SSOOIDC = class extends SSOOIDCClient {};
	createAggregatedClient(commands, SSOOIDC);
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/index.js
var init_commands = __esmMin((() => {
	init_CreateTokenCommand();
}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/enums.js
var init_enums = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/models_0.js
var init_models_0 = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+nested-clients@3.997.13/node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/index.js
var init_sso_oidc = __esmMin((() => {
	init_SSOOIDCClient();
	init_SSOOIDC();
	init_commands();
	init_schemas_0();
	init_enums();
	init_errors();
	init_models_0();
	init_SSOOIDCServiceException();
}));

//#endregion
init_sso_oidc();
export { CreateTokenCommand, SSOOIDCClient };