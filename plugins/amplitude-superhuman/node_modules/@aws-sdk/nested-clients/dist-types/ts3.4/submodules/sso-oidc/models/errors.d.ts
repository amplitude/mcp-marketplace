import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/core/client";
import { AccessDeniedExceptionReason, InvalidRequestExceptionReason } from "./enums";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
export declare class AccessDeniedException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  error?: string | undefined;
  reason?: AccessDeniedExceptionReason | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
export declare class AuthorizationPendingException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "AuthorizationPendingException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<AuthorizationPendingException, __BaseException>);
}
export declare class ExpiredTokenException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "ExpiredTokenException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<ExpiredTokenException, __BaseException>);
}
export declare class InternalServerException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InternalServerException";
  readonly $fault: "server";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
export declare class InvalidClientException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidClientException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<InvalidClientException, __BaseException>);
}
export declare class InvalidGrantException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidGrantException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<InvalidGrantException, __BaseException>);
}
export declare class InvalidRequestException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  error?: string | undefined;
  reason?: InvalidRequestExceptionReason | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
export declare class InvalidScopeException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidScopeException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<InvalidScopeException, __BaseException>);
}
export declare class SlowDownException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "SlowDownException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<SlowDownException, __BaseException>);
}
export declare class UnauthorizedClientException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "UnauthorizedClientException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<UnauthorizedClientException, __BaseException>);
}
export declare class UnsupportedGrantTypeException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "UnsupportedGrantTypeException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<UnsupportedGrantTypeException, __BaseException>);
}
