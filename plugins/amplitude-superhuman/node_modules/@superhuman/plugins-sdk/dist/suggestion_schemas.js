"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionEndpointResponseJsonSchema = exports.SuggestionEndpointRequestJsonSchema = void 0;
const suggestion_request_json_1 = __importDefault(require("./schemas/suggestion-request.json"));
const suggestion_response_json_1 = __importDefault(require("./schemas/suggestion-response.json"));
/**
 * JSON Schema for requests to HTTP suggestion providers.
 * @hidden Experimental early access; the shape may change.
 */
exports.SuggestionEndpointRequestJsonSchema = suggestion_request_json_1.default;
/**
 * JSON Schema for responses from HTTP suggestion providers. Validate offsets against the request text as well.
 * @hidden Experimental early access; the shape may change.
 */
exports.SuggestionEndpointResponseJsonSchema = suggestion_response_json_1.default;
