const paethPredictor = (left: number, above: number, upLeft: number) => {
	const paeth = left + above - upLeft
	const pLeft = Math.abs(paeth - left)
	const pAbove = Math.abs(paeth - above)
	const pUpLeft = Math.abs(paeth - upLeft)

	if (pLeft <= pAbove && pLeft <= pUpLeft) {
		return left
	}
	if (pAbove <= pUpLeft) {
		return above
	}
	return upLeft
}

type FilterFunc = (
	data: Uint8Array,
	offset: number,
	datWidth: number,
	bytesPerPixel: number,
) => void
type FilterSumFunc = (
	data: Uint8Array,
	offset: number,
	datWidth: number,
	bytesPerPixel: number,
) => number

const filters: [FilterFunc, FilterSumFunc][] = [
	// none
	[
		() => {},
		(data, offset, datWidth) => {
			let sum = 0
			for (let i = datWidth - 1; i >= 1; --i) sum += data[offset + i]!
			return sum
		},
	],

	// sub
	[
		(data, offset, datWidth, bpp) => {
			data[offset] = 1
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const val = data[offset + i]! - left

				data[offset + i] = val
			}
		},
		(data, offset, datWidth, bpp) => {
			let sum = 0
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const val = data[offset + i]! - left

				sum += val
			}
			return sum
		},
	],

	// up
	[
		(data, offset, datWidth) => {
			data[offset] = 2
			for (let i = datWidth - 1; i >= 1; --i) {
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const val = data[offset + i]! - up

				data[offset + i] = val
			}
		},
		(data, offset, datWidth) => {
			let sum = 0
			for (let i = datWidth - 1; i >= 1; --i) {
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const val = data[offset + i]! - up

				sum += val
			}
			return sum
		},
	],

	// avg
	[
		(data, offset, datWidth, bpp) => {
			data[offset] = 3
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const val = data[offset + i]! - ((left + up) >> 1)

				data[offset + i] = val
			}
		},
		(data, offset, datWidth, bpp) => {
			let sum = 0
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const val = data[offset + i]! - ((left + up) >> 1)

				sum += val
			}
			return sum
		},
	],

	// paeth
	[
		(data, offset, datWidth, bpp) => {
			data[offset] = 4
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const upleft =
					offset >= datWidth && i >= bpp + 1
						? (data[offset + i - (bpp + datWidth)] ?? 0)
						: 0
				const val = data[offset + i]! - paethPredictor(left, up, upleft)

				data[offset + i] = val
			}
		},
		(data, offset, datWidth, bpp) => {
			let sum = 0
			for (let i = datWidth - 1; i >= 1; --i) {
				const left = i >= bpp + 1 ? (data[offset + i - bpp] ?? 0) : 0
				const up = offset >= datWidth ? (data[offset + i - datWidth] ?? 0) : 0
				const upleft =
					offset >= datWidth && i >= bpp + 1
						? (data[offset + i - (bpp + datWidth)] ?? 0)
						: 0
				const val = data[offset + i]! - paethPredictor(left, up, upleft)

				sum += val
			}
			return sum
		},
	],
]

export const fillFilter = (
	data: Uint8Array,
	datWidth: number,
	height: number,
	bytesPerPixel: number,
): void => {
	for (let y = height - 1; y >= 0; --y) {
		const offset = y * datWidth
		let minFilter: FilterFunc = () => {}
		let minSum = Infinity

		for (const filter of filters) {
			const sum = filter[1](data, offset, datWidth, bytesPerPixel)
			if (minSum > sum) {
				minFilter = filter[0]
				minSum = sum
			}
		}

		minFilter(data, offset, datWidth, bytesPerPixel)
	}
}
