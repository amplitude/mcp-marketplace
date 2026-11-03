/**
 * A general SDK error that does not fall into a more specific category.
 *
 * @public
 */
export declare class SmithyError extends Error {
    name: string;
    readonly $source: string;
}
/**
 * A value had the wrong type or could not be interpreted as the expected type.
 *
 * @public
 */
export declare class SmithyTypeError extends TypeError {
    name: string;
    readonly $source: string;
}
/**
 * A value was the correct type but fell outside its allowed range or bounds.
 *
 * @public
 */
export declare class SmithyRangeError extends RangeError {
    name: string;
    readonly $source: string;
}
/**
 * @public
 */
export type ErrorConstructor<E extends Error = Error> = new (message?: string) => E;
/**
 * @public
 */
export interface ErrorContainer {
    readonly $source: string;
    readonly Error: ErrorConstructor<SmithyError>;
    readonly TypeError: ErrorConstructor<SmithyTypeError>;
    readonly RangeError: ErrorConstructor<SmithyRangeError>;
}
/**
 * @public
 */
export declare const errors: ErrorContainer;
