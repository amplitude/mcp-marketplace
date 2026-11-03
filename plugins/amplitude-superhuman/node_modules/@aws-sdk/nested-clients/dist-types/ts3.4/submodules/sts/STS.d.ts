import {
  HttpHandlerOptions as __HttpHandlerOptions,
  MetricsRecorder as __MetricsRecorder,
} from "@smithy/types";
import { AssumeRoleCommandInput, AssumeRoleCommandOutput } from "./commands/AssumeRoleCommand";
import {
  AssumeRoleWithWebIdentityCommandInput,
  AssumeRoleWithWebIdentityCommandOutput,
} from "./commands/AssumeRoleWithWebIdentityCommand";
import { STSClient } from "./STSClient";
export interface STSRequestOptions extends __HttpHandlerOptions {
  metricsRecorder?: __MetricsRecorder<unknown>;
}
export interface STS {
  assumeRole(
    args: AssumeRoleCommandInput,
    options?: STSRequestOptions,
  ): Promise<AssumeRoleCommandOutput>;
  assumeRole(
    args: AssumeRoleCommandInput,
    cb: (err: any, data?: AssumeRoleCommandOutput) => void,
  ): void;
  assumeRole(
    args: AssumeRoleCommandInput,
    options: STSRequestOptions,
    cb: (err: any, data?: AssumeRoleCommandOutput) => void,
  ): void;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    options?: STSRequestOptions,
  ): Promise<AssumeRoleWithWebIdentityCommandOutput>;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    cb: (err: any, data?: AssumeRoleWithWebIdentityCommandOutput) => void,
  ): void;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    options: STSRequestOptions,
    cb: (err: any, data?: AssumeRoleWithWebIdentityCommandOutput) => void,
  ): void;
}
export declare class STS extends STSClient implements STS {}
