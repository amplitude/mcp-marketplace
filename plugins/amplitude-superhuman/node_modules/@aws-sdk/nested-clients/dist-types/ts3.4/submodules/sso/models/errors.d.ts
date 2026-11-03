import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/core/client";
import { SSOServiceException as __BaseException } from "./SSOServiceException";
export declare class InvalidRequestException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
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
export declare class UnauthorizedException extends __BaseException {
  static readonly shapeId: string;
  readonly name: "UnauthorizedException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<UnauthorizedException, __BaseException>);
}
