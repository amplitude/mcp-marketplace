import {
  HttpHandlerOptions as __HttpHandlerOptions,
  MetricsRecorder as __MetricsRecorder,
} from "@smithy/types";
import { CreateTokenCommandInput, CreateTokenCommandOutput } from "./commands/CreateTokenCommand";
import { SSOOIDCClient } from "./SSOOIDCClient";
export interface SSOOIDCRequestOptions extends __HttpHandlerOptions {
  metricsRecorder?: __MetricsRecorder<unknown>;
}
export interface SSOOIDC {
  createToken(
    args: CreateTokenCommandInput,
    options?: SSOOIDCRequestOptions,
  ): Promise<CreateTokenCommandOutput>;
  createToken(
    args: CreateTokenCommandInput,
    cb: (err: any, data?: CreateTokenCommandOutput) => void,
  ): void;
  createToken(
    args: CreateTokenCommandInput,
    options: SSOOIDCRequestOptions,
    cb: (err: any, data?: CreateTokenCommandOutput) => void,
  ): void;
}
export declare class SSOOIDC extends SSOOIDCClient implements SSOOIDC {}
