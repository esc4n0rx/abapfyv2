declare module 'pizzip' {
  interface PizZipFile {
    asText(): string
    asUint8Array(): Uint8Array
  }

  interface PizZipGenerateOptions {
    type: 'blob' | 'uint8array' | 'string' | 'base64' | 'arraybuffer'
    mimeType?: string
    compression?: 'STORE' | 'DEFLATE'
  }

  class PizZip {
    constructor(data?: ArrayBuffer | Uint8Array | string, options?: Record<string, unknown>)
    file(name: string): PizZipFile | null
    file(name: string, content: string | Uint8Array | ArrayBuffer): PizZip
    generate(options: { type: 'blob'; mimeType?: string; compression?: string }): Blob
    generate(options: PizZipGenerateOptions): unknown
  }

  export default PizZip
}
