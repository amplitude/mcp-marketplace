import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/core/client";
import { CognitoIdentityServiceException as __BaseException } from "./CognitoIdentityServiceException";
export declare class ExternalServiceException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "ExternalServiceException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ExternalServiceException, __BaseException>);
}
export declare class InternalErrorException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InternalErrorException";
  readonly $fault: "server";
  constructor(opts: __ExceptionOptionType<InternalErrorException, __BaseException>);
}
export declare class InvalidIdentityPoolConfigurationException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidIdentityPoolConfigurationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidIdentityPoolConfigurationException, __BaseException>,
  );
}
export declare class InvalidParameterException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidParameterException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<InvalidParameterException, __BaseException>);
}
export declare class NotAuthorizedException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "NotAuthorizedException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NotAuthorizedException, __BaseException>);
}
export declare class ResourceConflictException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "ResourceConflictException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ResourceConflictException, __BaseException>);
}
export declare class ResourceNotFoundException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "ResourceNotFoundException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
export declare class TooManyRequestsException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "TooManyRequestsException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>);
}
export declare class LimitExceededException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<LimitExceededException, __BaseException>);
}
