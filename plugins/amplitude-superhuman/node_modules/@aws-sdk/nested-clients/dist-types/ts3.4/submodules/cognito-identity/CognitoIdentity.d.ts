import {
  HttpHandlerOptions as __HttpHandlerOptions,
  MetricsRecorder as __MetricsRecorder,
} from "@smithy/types";
import { CognitoIdentityClient } from "./CognitoIdentityClient";
import {
  GetCredentialsForIdentityCommandInput,
  GetCredentialsForIdentityCommandOutput,
} from "./commands/GetCredentialsForIdentityCommand";
import { GetIdCommandInput, GetIdCommandOutput } from "./commands/GetIdCommand";
export interface CognitoIdentityRequestOptions extends __HttpHandlerOptions {
  metricsRecorder?: __MetricsRecorder<unknown>;
}
export interface CognitoIdentity {
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    options?: CognitoIdentityRequestOptions,
  ): Promise<GetCredentialsForIdentityCommandOutput>;
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void,
  ): void;
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    options: CognitoIdentityRequestOptions,
    cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void,
  ): void;
  getId(
    args: GetIdCommandInput,
    options?: CognitoIdentityRequestOptions,
  ): Promise<GetIdCommandOutput>;
  getId(args: GetIdCommandInput, cb: (err: any, data?: GetIdCommandOutput) => void): void;
  getId(
    args: GetIdCommandInput,
    options: CognitoIdentityRequestOptions,
    cb: (err: any, data?: GetIdCommandOutput) => void,
  ): void;
}
export declare class CognitoIdentity extends CognitoIdentityClient implements CognitoIdentity {}
