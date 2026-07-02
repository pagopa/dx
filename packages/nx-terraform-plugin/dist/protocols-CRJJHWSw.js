import { n as __esmMin, r as __exportAll } from "./chunk-CiiB0FCw.js";
import { An as init_httpRequest, At as init_toBase64, Cn as init_isValidHostname, Dn as HttpResponse, Ft as init_fromBase64, Mt as fromUtf8, Nn as require_dist_cjs, Nt as init_fromUtf8, On as init_httpResponse, Ot as init_toUtf8, Pt as fromBase64, St as init_date_utils, _n as init_parseUrl, _t as init_quote_header, an as init_TypeRegistry, bn as parseQueryString, bt as init_lazy_json, cn as init_translateTraits, dt as init_split_every, ft as splitEvery, gn as init_transport, gt as init_schema_date_utils, ht as _parseRfc7231DateTime, in as TypeRegistry, jt as toBase64, kn as HttpRequest, kt as toUtf8, ln as translateTraits, lt as init_split_header, mt as _parseRfc3339DateTimeWithOffset, n as generateIdempotencyToken, nn as init_schema, o as init_sdk_stream_mixin, on as NormalizedSchema, ot as NumericValue, pt as _parseEpochTimestamp, r as init_serde, s as sdkStreamMixin, sn as init_NormalizedSchema, st as init_NumericValue, t as Uint8ArrayBlobAdapter, ut as splitHeader, vn as parseUrl, vt as quoteHeader, wn as isValidHostname, xt as dateToUtcString, yn as init_parseQueryString, yt as LazyJsonString } from "./serde-CEIw_Fs9.js";

//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/collect-stream-body.js
var collectBody;
var init_collect_stream_body = __esmMin((() => {
	init_serde();
	collectBody = async (streamBody = new Uint8Array(), context) => {
		if (streamBody instanceof Uint8Array) return Uint8ArrayBlobAdapter.mutate(streamBody);
		if (!streamBody) return Uint8ArrayBlobAdapter.mutate(new Uint8Array());
		const fromContext = context.streamCollector(streamBody);
		return Uint8ArrayBlobAdapter.mutate(await fromContext);
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/extended-encode-uri-component.js
function extendedEncodeURIComponent(str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
		return "%" + c.charCodeAt(0).toString(16).toUpperCase();
	});
}
var init_extended_encode_uri_component = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/SerdeContext.js
var SerdeContext;
var init_SerdeContext = __esmMin((() => {
	SerdeContext = class {
		serdeContext;
		setSerdeContext(serdeContext) {
			this.serdeContext = serdeContext;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/HttpProtocol.js
var HttpProtocol;
var init_HttpProtocol = __esmMin((() => {
	init_schema();
	init_transport();
	init_SerdeContext();
	HttpProtocol = class extends SerdeContext {
		options;
		compositeErrorRegistry;
		constructor(options) {
			super();
			this.options = options;
			this.compositeErrorRegistry = TypeRegistry.for(options.defaultNamespace);
			for (const etr of options.errorTypeRegistries ?? []) this.compositeErrorRegistry.copyFrom(etr);
		}
		getRequestType() {
			return HttpRequest;
		}
		getResponseType() {
			return HttpResponse;
		}
		setSerdeContext(serdeContext) {
			this.serdeContext = serdeContext;
			this.serializer.setSerdeContext(serdeContext);
			this.deserializer.setSerdeContext(serdeContext);
			if (this.getPayloadCodec()) this.getPayloadCodec().setSerdeContext(serdeContext);
		}
		updateServiceEndpoint(request, endpoint) {
			if ("url" in endpoint) {
				request.protocol = endpoint.url.protocol;
				request.hostname = endpoint.url.hostname;
				request.port = endpoint.url.port ? Number(endpoint.url.port) : void 0;
				request.path = endpoint.url.pathname;
				request.fragment = endpoint.url.hash || void 0;
				request.username = endpoint.url.username || void 0;
				request.password = endpoint.url.password || void 0;
				if (!request.query) request.query = {};
				for (const [k, v] of endpoint.url.searchParams.entries()) request.query[k] = v;
				if (endpoint.headers) for (const name in endpoint.headers) request.headers[name] = endpoint.headers[name].join(", ");
				return request;
			} else {
				request.protocol = endpoint.protocol;
				request.hostname = endpoint.hostname;
				request.port = endpoint.port ? Number(endpoint.port) : void 0;
				request.path = endpoint.path;
				request.query = { ...endpoint.query };
				if (endpoint.headers) for (const name in endpoint.headers) request.headers[name] = endpoint.headers[name];
				return request;
			}
		}
		setHostPrefix(request, operationSchema, input) {
			if (this.serdeContext?.disableHostPrefix) return;
			const inputNs = NormalizedSchema.of(operationSchema.input);
			const opTraits = translateTraits(operationSchema.traits ?? {});
			if (opTraits.endpoint) {
				let hostPrefix = opTraits.endpoint?.[0];
				if (typeof hostPrefix === "string") {
					for (const [name, member] of inputNs.structIterator()) {
						if (!member.getMergedTraits().hostLabel) continue;
						const replacement = input[name];
						if (typeof replacement !== "string") throw new Error(`@smithy/core/schema - ${name} in input must be a string as hostLabel.`);
						hostPrefix = hostPrefix.replace(`{${name}}`, replacement);
					}
					request.hostname = hostPrefix + request.hostname;
				}
			}
		}
		deserializeMetadata(output) {
			return {
				httpStatusCode: output.statusCode,
				requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
				extendedRequestId: output.headers["x-amz-id-2"],
				cfId: output.headers["x-amz-cf-id"]
			};
		}
		async serializeEventStream({ eventStream, requestSchema, initialRequest }) {
			return (await this.loadEventStreamCapability()).serializeEventStream({
				eventStream,
				requestSchema,
				initialRequest
			});
		}
		async deserializeEventStream({ response, responseSchema, initialResponseContainer }) {
			return (await this.loadEventStreamCapability()).deserializeEventStream({
				response,
				responseSchema,
				initialResponseContainer
			});
		}
		async loadEventStreamCapability() {
			const { EventStreamSerde } = await import("./default-dispatcher--ypkibiq.js").then((n) => (n.a(), n.i));
			return new EventStreamSerde({
				marshaller: this.getEventStreamMarshaller(),
				serializer: this.serializer,
				deserializer: this.deserializer,
				serdeContext: this.serdeContext,
				defaultContentType: this.getDefaultContentType()
			});
		}
		getDefaultContentType() {
			throw new Error(`@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`);
		}
		async deserializeHttpMessage(schema, context, response, arg4, arg5) {
			return [];
		}
		getEventStreamMarshaller() {
			const context = this.serdeContext;
			if (!context.eventStreamMarshaller) throw new Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
			return context.eventStreamMarshaller;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/HttpBindingProtocol.js
var HttpBindingProtocol;
var init_HttpBindingProtocol = __esmMin((() => {
	init_schema();
	init_serde();
	init_transport();
	init_HttpProtocol();
	init_collect_stream_body();
	init_extended_encode_uri_component();
	HttpBindingProtocol = class extends HttpProtocol {
		async serializeRequest(operationSchema, _input, context) {
			const input = _input && typeof _input === "object" ? _input : {};
			const serializer = this.serializer;
			const query = {};
			const headers = {};
			const endpoint = await context.endpoint();
			const ns = NormalizedSchema.of(operationSchema?.input);
			const payloadMemberNames = [];
			const payloadMemberSchemas = [];
			let hasNonHttpBindingMember = false;
			let payload;
			const request = new HttpRequest({
				protocol: "",
				hostname: "",
				port: void 0,
				path: "",
				fragment: void 0,
				query,
				headers,
				body: void 0
			});
			if (endpoint) {
				this.updateServiceEndpoint(request, endpoint);
				this.setHostPrefix(request, operationSchema, input);
				const opTraits = translateTraits(operationSchema.traits);
				if (opTraits.http) {
					request.method = opTraits.http[0];
					const [path, search] = opTraits.http[1].split("?");
					if (request.path == "/") request.path = path;
					else request.path += path;
					const traitSearchParams = new URLSearchParams(search ?? "");
					for (const [key, value] of traitSearchParams) query[key] = value;
				}
			}
			for (const [memberName, memberNs] of ns.structIterator()) {
				const memberTraits = memberNs.getMergedTraits() ?? {};
				const inputMemberValue = input[memberName];
				if (inputMemberValue == null && !memberNs.isIdempotencyToken()) {
					if (memberTraits.httpLabel) {
						if (request.path.includes(`{${memberName}+}`) || request.path.includes(`{${memberName}}`)) throw new Error(`No value provided for input HTTP label: ${memberName}.`);
					}
					continue;
				}
				if (memberTraits.httpPayload) if (memberNs.isStreaming()) if (memberNs.isStructSchema()) {
					if (input[memberName]) payload = await this.serializeEventStream({
						eventStream: input[memberName],
						requestSchema: ns
					});
				} else payload = inputMemberValue;
				else {
					serializer.write(memberNs, inputMemberValue);
					payload = serializer.flush();
				}
				else if (memberTraits.httpLabel) {
					serializer.write(memberNs, inputMemberValue);
					const replacement = serializer.flush();
					if (request.path.includes(`{${memberName}+}`)) request.path = request.path.replace(`{${memberName}+}`, replacement.split("/").map(extendedEncodeURIComponent).join("/"));
					else if (request.path.includes(`{${memberName}}`)) request.path = request.path.replace(`{${memberName}}`, extendedEncodeURIComponent(replacement));
				} else if (memberTraits.httpHeader) {
					serializer.write(memberNs, inputMemberValue);
					headers[memberTraits.httpHeader.toLowerCase()] = String(serializer.flush());
				} else if (typeof memberTraits.httpPrefixHeaders === "string") for (const key in inputMemberValue) {
					const val = inputMemberValue[key];
					const amalgam = memberTraits.httpPrefixHeaders + key;
					serializer.write([memberNs.getValueSchema(), { httpHeader: amalgam }], val);
					headers[amalgam.toLowerCase()] = serializer.flush();
				}
				else if (memberTraits.httpQuery || memberTraits.httpQueryParams) this.serializeQuery(memberNs, inputMemberValue, query);
				else {
					hasNonHttpBindingMember = true;
					payloadMemberNames.push(memberName);
					payloadMemberSchemas.push(memberNs);
				}
			}
			if (hasNonHttpBindingMember && input) {
				const [namespace, name] = (ns.getName(true) ?? "#Unknown").split("#");
				const requiredMembers = ns.getSchema()[6];
				const payloadSchema = [
					3,
					namespace,
					name,
					ns.getMergedTraits(),
					payloadMemberNames,
					payloadMemberSchemas,
					void 0
				];
				if (requiredMembers) payloadSchema[6] = requiredMembers;
				else payloadSchema.pop();
				serializer.write(payloadSchema, input);
				payload = serializer.flush();
			}
			request.headers = headers;
			request.query = query;
			request.body = payload;
			return request;
		}
		serializeQuery(ns, data, query) {
			const serializer = this.serializer;
			const traits = ns.getMergedTraits();
			if (traits.httpQueryParams) {
				for (const key in data) if (!(key in query)) {
					const val = data[key];
					const valueSchema = ns.getValueSchema();
					Object.assign(valueSchema.getMergedTraits(), {
						...traits,
						httpQuery: key,
						httpQueryParams: void 0
					});
					this.serializeQuery(valueSchema, val, query);
				}
				return;
			}
			if (ns.isListSchema()) {
				const sparse = !!ns.getMergedTraits().sparse;
				const buffer = [];
				for (const item of data) {
					serializer.write([ns.getValueSchema(), traits], item);
					const serializable = serializer.flush();
					if (sparse || serializable !== void 0) buffer.push(serializable);
				}
				query[traits.httpQuery] = buffer;
			} else {
				serializer.write([ns, traits], data);
				query[traits.httpQuery] = serializer.flush();
			}
		}
		async deserializeResponse(operationSchema, context, response) {
			const deserializer = this.deserializer;
			const ns = NormalizedSchema.of(operationSchema.output);
			const dataObject = {};
			if (response.statusCode >= 300) {
				const bytes = await collectBody(response.body, context);
				if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(15, bytes));
				await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
				throw new Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.");
			}
			for (const header in response.headers) {
				const value = response.headers[header];
				delete response.headers[header];
				response.headers[header.toLowerCase()] = value;
			}
			const nonHttpBindingMembers = await this.deserializeHttpMessage(ns, context, response, dataObject);
			if (nonHttpBindingMembers.length) {
				const bytes = await collectBody(response.body, context);
				if (bytes.byteLength > 0) {
					const dataFromBody = await deserializer.read(ns, bytes);
					for (const member of nonHttpBindingMembers) if (dataFromBody[member] != null) dataObject[member] = dataFromBody[member];
				}
			} else if (nonHttpBindingMembers.discardResponseBody) await collectBody(response.body, context);
			dataObject.$metadata = this.deserializeMetadata(response);
			return dataObject;
		}
		async deserializeHttpMessage(schema, context, response, arg4, arg5) {
			let dataObject;
			if (arg4 instanceof Set) dataObject = arg5;
			else dataObject = arg4;
			let discardResponseBody = true;
			const deserializer = this.deserializer;
			const ns = NormalizedSchema.of(schema);
			const nonHttpBindingMembers = [];
			for (const [memberName, memberSchema] of ns.structIterator()) {
				const memberTraits = memberSchema.getMemberTraits();
				if (memberTraits.httpPayload) {
					discardResponseBody = false;
					if (memberSchema.isStreaming()) if (memberSchema.isStructSchema()) dataObject[memberName] = await this.deserializeEventStream({
						response,
						responseSchema: ns
					});
					else dataObject[memberName] = sdkStreamMixin(response.body);
					else if (response.body) {
						const bytes = await collectBody(response.body, context);
						if (bytes.byteLength > 0) dataObject[memberName] = await deserializer.read(memberSchema, bytes);
					}
				} else if (memberTraits.httpHeader) {
					const key = String(memberTraits.httpHeader).toLowerCase();
					const value = response.headers[key];
					if (null != value) if (memberSchema.isListSchema()) {
						const headerListValueSchema = memberSchema.getValueSchema();
						headerListValueSchema.getMergedTraits().httpHeader = key;
						let sections;
						if (headerListValueSchema.isTimestampSchema() && headerListValueSchema.getSchema() === 4) sections = splitEvery(value, ",", 2);
						else sections = splitHeader(value);
						const list = [];
						for (const section of sections) list.push(await deserializer.read(headerListValueSchema, section.trim()));
						dataObject[memberName] = list;
					} else dataObject[memberName] = await deserializer.read(memberSchema, value);
				} else if (memberTraits.httpPrefixHeaders !== void 0) {
					dataObject[memberName] = {};
					for (const header in response.headers) if (header.startsWith(memberTraits.httpPrefixHeaders)) {
						const value = response.headers[header];
						const valueSchema = memberSchema.getValueSchema();
						valueSchema.getMergedTraits().httpHeader = header;
						dataObject[memberName][header.slice(memberTraits.httpPrefixHeaders.length)] = await deserializer.read(valueSchema, value);
					}
				} else if (memberTraits.httpResponseCode) dataObject[memberName] = response.statusCode;
				else nonHttpBindingMembers.push(memberName);
			}
			nonHttpBindingMembers.discardResponseBody = discardResponseBody;
			return nonHttpBindingMembers;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/RpcProtocol.js
var RpcProtocol;
var init_RpcProtocol = __esmMin((() => {
	init_schema();
	init_transport();
	init_HttpProtocol();
	init_collect_stream_body();
	RpcProtocol = class extends HttpProtocol {
		async serializeRequest(operationSchema, _input, context) {
			const serializer = this.serializer;
			const query = {};
			const headers = {};
			const endpoint = await context.endpoint();
			const ns = NormalizedSchema.of(operationSchema?.input);
			const schema = ns.getSchema();
			let payload;
			const input = _input && typeof _input === "object" ? _input : {};
			const request = new HttpRequest({
				protocol: "",
				hostname: "",
				port: void 0,
				path: "/",
				fragment: void 0,
				query,
				headers,
				body: void 0
			});
			if (endpoint) {
				this.updateServiceEndpoint(request, endpoint);
				this.setHostPrefix(request, operationSchema, input);
			}
			if (input) {
				const eventStreamMember = ns.getEventStreamMember();
				if (eventStreamMember) {
					if (input[eventStreamMember]) {
						const initialRequest = {};
						for (const [memberName, memberSchema] of ns.structIterator()) if (memberName !== eventStreamMember && input[memberName]) {
							serializer.write(memberSchema, input[memberName]);
							initialRequest[memberName] = serializer.flush();
						}
						payload = await this.serializeEventStream({
							eventStream: input[eventStreamMember],
							requestSchema: ns,
							initialRequest
						});
					}
				} else {
					serializer.write(schema, input);
					payload = serializer.flush();
				}
			}
			request.headers = Object.assign(request.headers, headers);
			request.query = query;
			request.body = payload;
			request.method = "POST";
			return request;
		}
		async deserializeResponse(operationSchema, context, response) {
			const deserializer = this.deserializer;
			const ns = NormalizedSchema.of(operationSchema.output);
			const dataObject = {};
			if (response.statusCode >= 300) {
				const bytes = await collectBody(response.body, context);
				if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(15, bytes));
				await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
				throw new Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
			}
			for (const header in response.headers) {
				const value = response.headers[header];
				delete response.headers[header];
				response.headers[header.toLowerCase()] = value;
			}
			const eventStreamMember = ns.getEventStreamMember();
			if (eventStreamMember) dataObject[eventStreamMember] = await this.deserializeEventStream({
				response,
				responseSchema: ns,
				initialResponseContainer: dataObject
			});
			else {
				const bytes = await collectBody(response.body, context);
				if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(ns, bytes));
			}
			dataObject.$metadata = this.deserializeMetadata(response);
			return dataObject;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/resolve-path.js
var resolvedPath;
var init_resolve_path = __esmMin((() => {
	init_extended_encode_uri_component();
	resolvedPath = (resolvedPath, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
		if (input != null && input[memberName] !== void 0) {
			const labelValue = labelValueProvider();
			if (labelValue == null || labelValue.length <= 0) throw new Error("Empty value provided for input HTTP label: " + memberName + ".");
			resolvedPath = resolvedPath.replace(uriLabel, isGreedyLabel ? labelValue.split("/").map((segment) => extendedEncodeURIComponent(segment)).join("/") : extendedEncodeURIComponent(labelValue));
		} else throw new Error("No value provided for input HTTP label: " + memberName + ".");
		return resolvedPath;
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/requestBuilder.js
function requestBuilder(input, context) {
	return new RequestBuilder(input, context);
}
var RequestBuilder;
var init_requestBuilder = __esmMin((() => {
	init_transport();
	init_resolve_path();
	RequestBuilder = class {
		input;
		context;
		query = {};
		method = "";
		headers = {};
		path = "";
		body = null;
		hostname = "";
		resolvePathStack = [];
		constructor(input, context) {
			this.input = input;
			this.context = context;
		}
		async build() {
			const { hostname, protocol = "https", port, path: basePath } = await this.context.endpoint();
			this.path = basePath;
			for (const resolvePath of this.resolvePathStack) resolvePath(this.path);
			return new HttpRequest({
				protocol,
				hostname: this.hostname || hostname,
				port,
				method: this.method,
				path: this.path,
				query: this.query,
				body: this.body,
				headers: this.headers
			});
		}
		hn(hostname) {
			this.hostname = hostname;
			return this;
		}
		bp(uriLabel) {
			this.resolvePathStack.push((basePath) => {
				this.path = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}` + uriLabel;
			});
			return this;
		}
		p(memberName, labelValueProvider, uriLabel, isGreedyLabel) {
			this.resolvePathStack.push((path) => {
				this.path = resolvedPath(path, this.input, memberName, labelValueProvider, uriLabel, isGreedyLabel);
			});
			return this;
		}
		h(headers) {
			this.headers = headers;
			return this;
		}
		q(query) {
			this.query = query;
			return this;
		}
		b(body) {
			this.body = body;
			return this;
		}
		m(method) {
			this.method = method;
			return this;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/serde/determineTimestampFormat.js
function determineTimestampFormat(ns, settings) {
	if (settings.timestampFormat.useTrait) {
		if (ns.isTimestampSchema() && (ns.getSchema() === 5 || ns.getSchema() === 6 || ns.getSchema() === 7)) return ns.getSchema();
	}
	const { httpLabel, httpPrefixHeaders, httpHeader, httpQuery } = ns.getMergedTraits();
	return (settings.httpBindings ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader) ? 6 : Boolean(httpQuery) || Boolean(httpLabel) ? 5 : void 0 : void 0) ?? settings.timestampFormat.default;
}
var init_determineTimestampFormat = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/serde/FromStringShapeDeserializer.js
var FromStringShapeDeserializer;
var init_FromStringShapeDeserializer = __esmMin((() => {
	init_schema();
	init_serde();
	init_SerdeContext();
	init_determineTimestampFormat();
	FromStringShapeDeserializer = class extends SerdeContext {
		settings;
		constructor(settings) {
			super();
			this.settings = settings;
		}
		read(_schema, data) {
			const ns = NormalizedSchema.of(_schema);
			if (ns.isListSchema()) return splitHeader(data).map((item) => this.read(ns.getValueSchema(), item));
			if (ns.isBlobSchema()) return (this.serdeContext?.base64Decoder ?? fromBase64)(data);
			if (ns.isTimestampSchema()) switch (determineTimestampFormat(ns, this.settings)) {
				case 5: return _parseRfc3339DateTimeWithOffset(data);
				case 6: return _parseRfc7231DateTime(data);
				case 7: return _parseEpochTimestamp(data);
				default:
					console.warn("Missing timestamp format, parsing value with Date constructor:", data);
					return new Date(data);
			}
			if (ns.isStringSchema()) {
				const mediaType = ns.getMergedTraits().mediaType;
				let intermediateValue = data;
				if (mediaType) {
					if (ns.getMergedTraits().httpHeader) intermediateValue = this.base64ToUtf8(intermediateValue);
					if (mediaType === "application/json" || mediaType.endsWith("+json")) intermediateValue = LazyJsonString.from(intermediateValue);
					return intermediateValue;
				}
			}
			if (ns.isNumericSchema()) return Number(data);
			if (ns.isBigIntegerSchema()) return BigInt(data);
			if (ns.isBigDecimalSchema()) return new NumericValue(data, "bigDecimal");
			if (ns.isBooleanSchema()) return String(data).toLowerCase() === "true";
			return data;
		}
		base64ToUtf8(base64String) {
			return (this.serdeContext?.utf8Encoder ?? toUtf8)((this.serdeContext?.base64Decoder ?? fromBase64)(base64String));
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeDeserializer.js
var HttpInterceptingShapeDeserializer;
var init_HttpInterceptingShapeDeserializer = __esmMin((() => {
	init_schema();
	init_serde();
	init_SerdeContext();
	init_FromStringShapeDeserializer();
	HttpInterceptingShapeDeserializer = class extends SerdeContext {
		codecDeserializer;
		stringDeserializer;
		constructor(codecDeserializer, codecSettings) {
			super();
			this.codecDeserializer = codecDeserializer;
			this.stringDeserializer = new FromStringShapeDeserializer(codecSettings);
		}
		setSerdeContext(serdeContext) {
			this.stringDeserializer.setSerdeContext(serdeContext);
			this.codecDeserializer.setSerdeContext(serdeContext);
			this.serdeContext = serdeContext;
		}
		read(schema, data) {
			const ns = NormalizedSchema.of(schema);
			const traits = ns.getMergedTraits();
			const toString = this.serdeContext?.utf8Encoder ?? toUtf8;
			if (traits.httpHeader || traits.httpResponseCode) return this.stringDeserializer.read(ns, toString(data));
			if (traits.httpPayload) {
				if (ns.isBlobSchema()) {
					const toBytes = this.serdeContext?.utf8Decoder ?? fromUtf8;
					if (typeof data === "string") return toBytes(data);
					return data;
				} else if (ns.isStringSchema()) {
					if ("byteLength" in data) return toString(data);
					return data;
				}
			}
			return this.codecDeserializer.read(ns, data);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/serde/ToStringShapeSerializer.js
var ToStringShapeSerializer;
var init_ToStringShapeSerializer = __esmMin((() => {
	init_schema();
	init_serde();
	init_SerdeContext();
	init_determineTimestampFormat();
	ToStringShapeSerializer = class extends SerdeContext {
		settings;
		stringBuffer = "";
		constructor(settings) {
			super();
			this.settings = settings;
		}
		write(schema, value) {
			const ns = NormalizedSchema.of(schema);
			switch (typeof value) {
				case "object":
					if (value === null) {
						this.stringBuffer = "null";
						return;
					}
					if (ns.isTimestampSchema()) {
						if (!(value instanceof Date)) throw new Error(`@smithy/core/protocols - received non-Date value ${value} when schema expected Date in ${ns.getName(true)}`);
						switch (determineTimestampFormat(ns, this.settings)) {
							case 5:
								this.stringBuffer = value.toISOString().replace(".000Z", "Z");
								break;
							case 6:
								this.stringBuffer = dateToUtcString(value);
								break;
							case 7:
								this.stringBuffer = String(value.getTime() / 1e3);
								break;
							default:
								console.warn("Missing timestamp format, using epoch seconds", value);
								this.stringBuffer = String(value.getTime() / 1e3);
						}
						return;
					}
					if (ns.isBlobSchema() && "byteLength" in value) {
						this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(value);
						return;
					}
					if (ns.isListSchema() && Array.isArray(value)) {
						let buffer = "";
						for (const item of value) {
							this.write([ns.getValueSchema(), ns.getMergedTraits()], item);
							const headerItem = this.flush();
							const serialized = ns.getValueSchema().isTimestampSchema() ? headerItem : quoteHeader(headerItem);
							if (buffer !== "") buffer += ", ";
							buffer += serialized;
						}
						this.stringBuffer = buffer;
						return;
					}
					this.stringBuffer = JSON.stringify(value, null, 2);
					break;
				case "string":
					const mediaType = ns.getMergedTraits().mediaType;
					let intermediateValue = value;
					if (mediaType) {
						if (mediaType === "application/json" || mediaType.endsWith("+json")) intermediateValue = LazyJsonString.from(intermediateValue);
						if (ns.getMergedTraits().httpHeader) {
							this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(intermediateValue.toString());
							return;
						}
					}
					this.stringBuffer = value;
					break;
				default: if (ns.isIdempotencyToken()) this.stringBuffer = generateIdempotencyToken();
				else this.stringBuffer = String(value);
			}
		}
		flush() {
			const buffer = this.stringBuffer;
			this.stringBuffer = "";
			return buffer;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeSerializer.js
var HttpInterceptingShapeSerializer;
var init_HttpInterceptingShapeSerializer = __esmMin((() => {
	init_schema();
	init_ToStringShapeSerializer();
	HttpInterceptingShapeSerializer = class {
		codecSerializer;
		stringSerializer;
		buffer;
		constructor(codecSerializer, codecSettings, stringSerializer = new ToStringShapeSerializer(codecSettings)) {
			this.codecSerializer = codecSerializer;
			this.stringSerializer = stringSerializer;
		}
		setSerdeContext(serdeContext) {
			this.codecSerializer.setSerdeContext(serdeContext);
			this.stringSerializer.setSerdeContext(serdeContext);
		}
		write(schema, value) {
			const ns = NormalizedSchema.of(schema);
			const traits = ns.getMergedTraits();
			if (traits.httpHeader || traits.httpLabel || traits.httpQuery) {
				this.stringSerializer.write(ns, value);
				this.buffer = this.stringSerializer.flush();
				return;
			}
			return this.codecSerializer.write(ns, value);
		}
		flush() {
			if (this.buffer !== void 0) {
				const buffer = this.buffer;
				this.buffer = void 0;
				return buffer;
			}
			return this.codecSerializer.flush();
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/protocol-http/Field.js
var import_dist_cjs, Field;
var init_Field = __esmMin((() => {
	import_dist_cjs = require_dist_cjs();
	Field = class {
		name;
		kind;
		values;
		constructor({ name, kind = import_dist_cjs.FieldPosition.HEADER, values = [] }) {
			this.name = name;
			this.kind = kind;
			this.values = values;
		}
		add(value) {
			this.values.push(value);
		}
		set(values) {
			this.values = values;
		}
		remove(value) {
			this.values = this.values.filter((v) => v !== value);
		}
		toString() {
			return this.values.map((v) => v.includes(",") || v.includes(" ") ? `"${v}"` : v).join(", ");
		}
		get() {
			return this.values;
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/protocol-http/Fields.js
var Fields;
var init_Fields = __esmMin((() => {
	Fields = class {
		entries = {};
		encoding;
		constructor({ fields = [], encoding = "utf-8" }) {
			fields.forEach(this.setField.bind(this));
			this.encoding = encoding;
		}
		setField(field) {
			this.entries[field.name.toLowerCase()] = field;
		}
		getField(name) {
			return this.entries[name.toLowerCase()];
		}
		removeField(name) {
			delete this.entries[name.toLowerCase()];
		}
		getByType(kind) {
			return Object.values(this.entries).filter((field) => field.kind === kind);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/protocol-http/extensions/httpExtensionConfiguration.js
var getHttpHandlerExtensionConfiguration, resolveHttpHandlerRuntimeConfig;
var init_httpExtensionConfiguration = __esmMin((() => {
	getHttpHandlerExtensionConfiguration = (runtimeConfig) => {
		return {
			setHttpHandler(handler) {
				runtimeConfig.httpHandler = handler;
			},
			httpHandler() {
				return runtimeConfig.httpHandler;
			},
			updateHttpClientConfig(key, value) {
				runtimeConfig.httpHandler?.updateHttpClientConfig(key, value);
			},
			httpHandlerConfigs() {
				return runtimeConfig.httpHandler.httpHandlerConfigs();
			}
		};
	};
	resolveHttpHandlerRuntimeConfig = (httpHandlerExtensionConfiguration) => {
		return { httpHandler: httpHandlerExtensionConfiguration.httpHandler() };
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/middleware-content-length/contentLengthMiddleware.js
function contentLengthMiddleware(bodyLengthChecker) {
	return (next) => async (args) => {
		const request = args.request;
		if (HttpRequest.isInstance(request)) {
			const { body, headers } = request;
			if (body && Object.keys(headers).map((str) => str.toLowerCase()).indexOf(CONTENT_LENGTH_HEADER) === -1) try {
				const length = bodyLengthChecker(body);
				request.headers = {
					...request.headers,
					[CONTENT_LENGTH_HEADER]: String(length)
				};
			} catch (error) {}
		}
		return next({
			...args,
			request
		});
	};
}
var CONTENT_LENGTH_HEADER, contentLengthMiddlewareOptions, getContentLengthPlugin;
var init_contentLengthMiddleware = __esmMin((() => {
	init_transport();
	CONTENT_LENGTH_HEADER = "content-length";
	contentLengthMiddlewareOptions = {
		step: "build",
		tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
		name: "contentLengthMiddleware",
		override: true
	};
	getContentLengthPlugin = (options) => ({ applyToStack: (clientStack) => {
		clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
	} });
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/util-uri-escape/escape-uri.js
var escapeUri, hexEncode;
var init_escape_uri = __esmMin((() => {
	escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
	hexEncode = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/util-uri-escape/escape-uri-path.js
var escapeUriPath;
var init_escape_uri_path = __esmMin((() => {
	init_escape_uri();
	escapeUriPath = (uri) => uri.split("/").map(escapeUri).join("/");
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/querystring-builder/buildQueryString.js
function buildQueryString(query) {
	const parts = [];
	for (let key of Object.keys(query).sort()) {
		const value = query[key];
		key = escapeUri(key);
		if (Array.isArray(value)) for (let i = 0, iLen = value.length; i < iLen; i++) parts.push(`${key}=${escapeUri(value[i])}`);
		else {
			let qsEntry = key;
			if (value || typeof value === "string") qsEntry += `=${escapeUri(value)}`;
			parts.push(qsEntry);
		}
	}
	return parts.join("&");
}
var init_buildQueryString = __esmMin((() => {
	init_escape_uri();
}));

//#endregion
//#region ../../node_modules/.pnpm/@smithy+core@3.24.5/node_modules/@smithy/core/dist-es/submodules/protocols/index.js
var protocols_exports = /* @__PURE__ */ __exportAll({
	Field: () => Field,
	Fields: () => Fields,
	FromStringShapeDeserializer: () => FromStringShapeDeserializer,
	HttpBindingProtocol: () => HttpBindingProtocol,
	HttpInterceptingShapeDeserializer: () => HttpInterceptingShapeDeserializer,
	HttpInterceptingShapeSerializer: () => HttpInterceptingShapeSerializer,
	HttpProtocol: () => HttpProtocol,
	HttpRequest: () => HttpRequest,
	HttpResponse: () => HttpResponse,
	RequestBuilder: () => RequestBuilder,
	RpcProtocol: () => RpcProtocol,
	SerdeContext: () => SerdeContext,
	ToStringShapeSerializer: () => ToStringShapeSerializer,
	buildQueryString: () => buildQueryString,
	collectBody: () => collectBody,
	contentLengthMiddleware: () => contentLengthMiddleware,
	contentLengthMiddlewareOptions: () => contentLengthMiddlewareOptions,
	determineTimestampFormat: () => determineTimestampFormat,
	escapeUri: () => escapeUri,
	escapeUriPath: () => escapeUriPath,
	extendedEncodeURIComponent: () => extendedEncodeURIComponent,
	getContentLengthPlugin: () => getContentLengthPlugin,
	getHttpHandlerExtensionConfiguration: () => getHttpHandlerExtensionConfiguration,
	isValidHostname: () => isValidHostname,
	parseQueryString: () => parseQueryString,
	parseUrl: () => parseUrl,
	requestBuilder: () => requestBuilder,
	resolveHttpHandlerRuntimeConfig: () => resolveHttpHandlerRuntimeConfig,
	resolvedPath: () => resolvedPath
});
var init_protocols = __esmMin((() => {
	init_collect_stream_body();
	init_extended_encode_uri_component();
	init_HttpBindingProtocol();
	init_HttpProtocol();
	init_RpcProtocol();
	init_requestBuilder();
	init_resolve_path();
	init_FromStringShapeDeserializer();
	init_HttpInterceptingShapeDeserializer();
	init_HttpInterceptingShapeSerializer();
	init_ToStringShapeSerializer();
	init_determineTimestampFormat();
	init_SerdeContext();
	init_Field();
	init_Fields();
	init_transport();
	init_httpExtensionConfiguration();
	init_contentLengthMiddleware();
	init_escape_uri();
	init_escape_uri_path();
	init_buildQueryString();
}));

//#endregion
export { init_HttpBindingProtocol as C, init_extended_encode_uri_component as D, extendedEncodeURIComponent as E, collectBody as O, HttpBindingProtocol as S, init_SerdeContext as T, init_determineTimestampFormat as _, getContentLengthPlugin as a, RpcProtocol as b, init_httpExtensionConfiguration as c, init_HttpInterceptingShapeSerializer as d, HttpInterceptingShapeDeserializer as f, determineTimestampFormat as g, init_FromStringShapeDeserializer as h, init_buildQueryString as i, init_collect_stream_body as k, resolveHttpHandlerRuntimeConfig as l, FromStringShapeDeserializer as m, protocols_exports as n, init_contentLengthMiddleware as o, init_HttpInterceptingShapeDeserializer as p, buildQueryString as r, getHttpHandlerExtensionConfiguration as s, init_protocols as t, HttpInterceptingShapeSerializer as u, init_requestBuilder as v, SerdeContext as w, init_RpcProtocol as x, requestBuilder as y };