import { Readable } from "node:stream";
import { getAwsChunkedEncodingStream as getAwsChunkedEncodingStreamBrowser } from "./getAwsChunkedEncodingStream.browser";
import { isReadableStream } from "./stream-type-check";
export function getAwsChunkedEncodingStream(stream, options) {
    const readable = stream;
    const readableStream = stream;
    if (isReadableStream(readableStream)) {
        return getAwsChunkedEncodingStreamBrowser(readableStream, options);
    }
    const { base64Encoder, bodyLengthChecker, checksumAlgorithmFn, checksumLocationName, streamHasher } = options;
    const checksumRequired = base64Encoder !== undefined &&
        checksumAlgorithmFn !== undefined &&
        checksumLocationName !== undefined &&
        streamHasher !== undefined;
    const digest = checksumRequired ? streamHasher(checksumAlgorithmFn, readable) : undefined;
    Promise.resolve(digest).catch(() => {
    });
    const awsChunkedEncodingStream = new Readable({
        read() {
            readable.resume();
        },
    });
    readable.on("data", (data) => {
        const length = bodyLengthChecker(data) || 0;
        if (length === 0) {
            return;
        }
        awsChunkedEncodingStream.push(`${length.toString(16)}\r\n`);
        awsChunkedEncodingStream.push(data);
        if (!awsChunkedEncodingStream.push("\r\n")) {
            readable.pause();
        }
    });
    readable.on("error", (err) => {
        awsChunkedEncodingStream.destroy(err);
    });
    readable.pause();
    readable.on("end", async () => {
        try {
            awsChunkedEncodingStream.push(`0\r\n`);
            if (checksumRequired) {
                const checksum = base64Encoder(await digest);
                awsChunkedEncodingStream.push(`${checksumLocationName}:${checksum}\r\n`);
                awsChunkedEncodingStream.push(`\r\n`);
            }
            awsChunkedEncodingStream.push(null);
        }
        catch (err) {
            awsChunkedEncodingStream.destroy(err);
        }
    });
    return awsChunkedEncodingStream;
}
