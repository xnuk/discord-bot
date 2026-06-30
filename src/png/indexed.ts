import { crc32 } from './crc32.ts'
import { deflateSync, type ZlibOptions } from 'node:zlib'

const MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const ascii = (str: string): Uint8Array =>
	new Uint8Array(str.split('').map(v => v.charCodeAt(0)))

const IHDR = ascii('IHDR')
const PLTE = ascii('PLTE')
const IDAT = ascii('IDAT')
const IEND = ascii('IEND')

// BE
const u32 = (value: number) =>
	new Uint8Array([
		value >>> 24,
		(value & 0xff0000) >>> 16,
		(value & 0xff00) >>> 8,
		value & 0xff,
	])

const concat = (...data: Uint8Array[]): Uint8Array => {
	const len = data.reduce((len, buf) => buf.byteLength + len, 0)
	const buf = new Uint8Array(len)
	let offset = 0
	for (const ch of data) {
		buf.set(ch, offset)
		offset += ch.byteLength
	}
	return buf
}

const chunk = (ty: Uint8Array, ...data: Uint8Array[]): Uint8Array => {
	const len = data.reduce((len, buf) => buf.byteLength + len, 0)
	const buf = new Uint8Array(len + 12)

	buf.set(u32(len), 0)
	buf.set(ty, 4)

	let offset = 8
	for (const ch of data) {
		buf.set(ch, offset)
		offset += ch.byteLength
	}

	const crc = crc32(buf.subarray(4, buf.length - 4))
	buf.set(u32(crc), buf.length - 4)

	return buf
}

const chunkIEND = chunk(IEND)

const deflateOptions: ZlibOptions = {
	chunkSize: 32 * 1024,
	level: 9,
}

export class Indexed {
	private readonly chunkIHDR: Uint8Array
	private readonly chunkPLTE: Uint8Array
	private readonly bitDepth: 1 | 2 | 4 | 8
	private readonly dat: Uint8Array
	private readonly datWidth: number

	readonly width: number
	readonly height: number

	private result: Uint8Array | null = null

	constructor({
		width,
		height,
		colors,
	}: {
		width: number
		height: number
		colors: readonly (readonly [number, number, number])[]
	}) {
		const colorSize = colors.length
		if (colorSize > 256) throw new Error('Too much colors')

		const bitDepth =
			colorSize <= 2 ? 1 : colorSize <= 4 ? 2 : colorSize <= 16 ? 4 : 8
		this.bitDepth = bitDepth

		this.chunkIHDR = chunk(
			IHDR,
			u32(width),
			u32(height),
			new Uint8Array([bitDepth, 3, 0, 0, 0]),
		)

		this.chunkPLTE = chunk(PLTE, new Uint8Array(colors.flat(1)))

		this.width = width
		this.height = height

		this.datWidth = Math.ceil(width / (8 / bitDepth)) + 1
		this.dat = new Uint8Array(this.datWidth * height)
	}

	drawPoint(x: number, y: number, color: number): void {
		if (x >= this.width || y >= this.height) return
		const bitDepth = this.bitDepth
		const revDepth = 8 / this.bitDepth
		const index = y * this.datWidth + 1 + ((x / revDepth) | 0)

		if (bitDepth === 8) {
			this.dat[index] = color
			return
		}

		const cell = this.dat[index]!

		const mask = (1 << bitDepth) - 1
		const high = 8 - ((x % revDepth) + 1) * bitDepth

		this.dat[index] =
			(cell & (0xff - (mask << high))) | ((color & mask) << high)
	}

	pack(): Uint8Array {
		if (this.result != null) return this.result

		// fillFilter(this.dat, this.datWidth, this.height, 1)

		const chunkIDAT = chunk(IDAT, deflateSync(this.dat, deflateOptions))
		const result = concat(
			MAGIC,
			this.chunkIHDR,
			this.chunkPLTE,
			chunkIDAT,
			chunkIEND,
		)
		this.result = result
		return result
	}
}
