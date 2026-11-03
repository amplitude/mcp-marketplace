import type { ArgumentsCamelCase } from 'yargs';
import type { ConnectorAccessArgs } from './connector_access';
import { PublicApiPackEntrypoint } from '../helpers/external-api/v1';
import type { PublicApiUpdatePackRequest } from '../helpers/external-api/v1';
import { z } from 'zod';
interface PackSettingsArgs {
    packIdOrUrl?: string;
    manifestFile?: string;
    apiEndpoint: string;
    apiToken?: string;
}
type OmittedField = 'overallRateLimit' | 'perConnectionRateLimit' | 'cover' | 'exampleImages' | 'sourceCodeVisibility' | 'description' | 'shortDescription';
declare const FlagNames: {
    readonly logo: "icon";
    readonly agentImages: "images";
    readonly agentShortDescription: "tagline";
    readonly agentDescription: "description";
    readonly packEntrypoints: "entrypoints";
};
type FlagName<K extends keyof PublicApiUpdatePackRequest> = K extends keyof typeof FlagNames ? (typeof FlagNames)[K] : K;
export declare const PackSettingsUpdateOptions: {
    allowedAgents: {
        array: true;
        number: true;
        describe: string;
    };
    allowAllAgents: {
        boolean: true;
        describe: string;
    };
};
type PackSettingsUpdateArgs = Partial<Record<FlagName<Exclude<keyof PublicApiUpdatePackRequest, OmittedField | 'allowedAgentIds'>>, string | string[]>> & ConnectorAccessArgs;
type UpdatePackSettingsArgs = PackSettingsArgs & PackSettingsUpdateArgs & {
    yes?: boolean;
};
type PackSettingsInput = z.infer<ReturnType<typeof packSettingsInputSchema>>;
declare function packSettingsInputSchema(): z.ZodObject<{
    allowedAgentIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodNumber>>>;
    name: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodString>;
    agentImages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    agentShortDescription: z.ZodOptional<z.ZodString>;
    agentDescription: z.ZodOptional<z.ZodString>;
    packEntrypoints: z.ZodOptional<z.ZodTuple<[z.ZodEnum<typeof PublicApiPackEntrypoint>], z.ZodEnum<typeof PublicApiPackEntrypoint>>>;
    supportEmail: z.ZodOptional<z.ZodString>;
    termsOfServiceUrl: z.ZodOptional<z.ZodString>;
    privacyPolicyUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function parsePackSettingsUpdate(args: PackSettingsUpdateArgs): PackSettingsInput;
export declare function handleGetPackSettings({ packIdOrUrl, manifestFile, apiEndpoint, apiToken, }: ArgumentsCamelCase<PackSettingsArgs>): Promise<never>;
export declare function handleUpdatePackSettings(args: ArgumentsCamelCase<UpdatePackSettingsArgs>): Promise<never>;
export {};
