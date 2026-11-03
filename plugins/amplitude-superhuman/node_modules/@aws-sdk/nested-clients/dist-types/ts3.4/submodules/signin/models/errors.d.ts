import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/core/client";
import { OAuth2ErrorCode } from "./enums";
import { SigninServiceException as __BaseException } from "./SigninServiceException";
export declare class AccessDeniedException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  error: OAuth2ErrorCode | undefined;
  constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
export declare class InternalServerException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InternalServerException";
  readonly $fault: "server";
  error: OAuth2ErrorCode | undefined;
  constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
export declare class TooManyRequestsError extends __BaseException {
  static readonly shapeId: string;
  readonly name: "TooManyRequestsError";
  readonly $fault: "client";
  error: OAuth2ErrorCode | undefined;
  constructor(opts: __ExceptionOptionType<TooManyRequestsError, __BaseException>);
}
export declare class ValidationException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "ValidationException";
  readonly $fault: "client";
  error: OAuth2ErrorCode | undefined;
  constructor(opts: __ExceptionOptionType<ValidationException, __BaseException>);
}
