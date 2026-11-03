import {
  HttpHandlerOptions as __HttpHandlerOptions,
  MetricsRecorder as __MetricsRecorder,
} from "@smithy/types";
import {
  GetRoleCredentialsCommandInput,
  GetRoleCredentialsCommandOutput,
} from "./commands/GetRoleCredentialsCommand";
import { SSOClient } from "./SSOClient";
export interface SSORequestOptions extends __HttpHandlerOptions {
  metricsRecorder?: __MetricsRecorder<unknown>;
}
export interface SSO {
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    options?: SSORequestOptions,
  ): Promise<GetRoleCredentialsCommandOutput>;
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    cb: (err: any, data?: GetRoleCredentialsCommandOutput) => void,
  ): void;
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    options: SSORequestOptions,
    cb: (err: any, data?: GetRoleCredentialsCommandOutput) => void,
  ): void;
}
export declare class SSO extends SSOClient implements SSO {}
