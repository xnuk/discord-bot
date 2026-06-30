const crcTable = Array.from({ length: 256 }, (_, currentCrc) => {
	for (let j = 0; j < 8; j++) {
		if (0 < (currentCrc & 1)) {
			currentCrc = 0xedb88320 ^ (currentCrc >>> 1)
		} else {
			currentCrc = currentCrc >>> 1
		}
	}
	return currentCrc
})

export const crc32 = (buf: Uint8Array): number => {
	let crc = -1
	for (let i = 0; i < buf.length; i++) {
		crc = crcTable[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8)
	}
	return crc ^ -1
}
